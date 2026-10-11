/**
 * Concrete bash pre/post hooks for the wallet-data-collection harness.
 *
 * Built on two classes:
 * - {@link WalletDataCollectionAgent}: instantiated once per agent process. Holds the
 *   scoped paths, the repo snapshot baseline, and the allowed-edit set, and exposes the
 *   crawl/snapshot/backup/revert operations shared across commands.
 * - {@link WalletDataCollectionBash}: instantiated once per bash tool call. Carries the
 *   pre-command snapshot for a single command and implements its pre/post hooks.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { BashOperations } from '@earendil-works/pi-coding-agent'

import { type Variant, variantEnum } from '../../../schema/variants'
import { variantToWalletType, type WalletType, walletTypes } from '../../../schema/wallet-types'
import { assertNonEmptyArray } from '../../../types/utils/non-empty'
import { assertStringHasPrefix } from '../../../types/utils/text'
import {
	CodebaseEntryType,
	crawlCodebase,
	getRepositoryRoot,
	normalizePath,
	type PathPredicate,
} from '../../../utils/codebase'
import { AUDIT_LOG_RELATIVE_PATH } from '../read-only'
import {
	requestIdToString,
	WalletCaptureClassificationAuditLogFile,
	type WalletCaptureImpactedRequestId,
} from '../wallet-capture-classification-audit-log'
import { WalletCaptureFile, type WalletRequestClassification } from '../wallet-capture-file'
import { allRequestClassifications, loadAnnotationsForCapture } from '../wallet-capture-repo'
import {
	type BashOperationsOptions,
	type BashPostHook,
	type BashPostHookResult,
	type BashPreHook,
	type BashPreHookResult,
	createHookBashOperations,
} from './bash-hooks'
import {
	buildAgentEnv,
	isDomainClassificationCommand,
	isPlainAgentInvocation,
	redactCdPath,
	referencesRestrictedEnvVar,
	RESTRICTED_ENV_VARS,
} from './command-classification'
import {
	diffClassifications,
	mergeJustifyIntoOpenMutation,
	type OpenMutationState,
} from './wallet-capture-classification'

/** A repo-relative path, e.g. `/src` or `/package.json`. */
type RepoRelativePath = `/${string}`

/**
 * Prefix marking a command-check hook message in tool output. The display layer detects
 * this marker to render hook messages in a distinct (error) style.
 */
export const COMMAND_CHECK_HOOK_MARKER = '[command-check-hooks]'

/** The audit-log path as a repo-relative path (leading `/`). */
const AUDIT_LOG_REL: RepoRelativePath = `/${AUDIT_LOG_RELATIVE_PATH}`

/**
 * Build the error message appended to a reverted arbitrary command's output. It tells the
 * model that repository files may only be edited through a plain `pnpm wallet-data-collection:agent`
 * command, and names every file that triggered the revert.
 */
export function buildArbitraryCommandEditMessage(files: ReadonlyArray<RepoRelativePath>): string {
	const list = [...files]
		.sort((a, b) => a.localeCompare(b))
		.map(file => `  - ${file}`)
		.join('\n')

	return [
		`${COMMAND_CHECK_HOOK_MARKER} An arbitrary command may not modify repository files;`,
		'reverted all changes. Edit files only through a plain `pnpm wallet-data-collection:agent` command. Offending file(s):',
		list,
	].join('\n')
}

/**
 * Build the error message appended to a reverted command's output, naming every file
 * that triggered the revert.
 */
export function buildCommandCheckErrorMessage(files: ReadonlySet<RepoRelativePath>): string {
	const list = [...files]
		.sort((a, b) => a.localeCompare(b))
		.map(file => `  - ${file}`)
		.join('\n')

	return [
		`${COMMAND_CHECK_HOOK_MARKER} A modified file was outside the allowed edit set or failed validation;`,
		'reverted all changes to the scoped repo paths from backup-tree.bak. Offending file(s):',
		list,
	].join('\n')
}

/**
 * Build the message appended when a command causes request classifications to change and
 * an open mutation is opened. It instructs the agent to run `check` to find the impacted
 * request IDs, then justify or roll back.
 */
export function buildOpenMutationMessage(
	impacted: ReadonlyArray<WalletCaptureImpactedRequestId>,
): string {
	return [
		`${COMMAND_CHECK_HOOK_MARKER} This command changed the classification of ${impacted.length} request(s) across the repository.`,
		'Run `pnpm wallet-data-collection:agent check` to list the impacted request IDs, then `justify` or `rollback` them before making further classification changes.',
		'You will need to do so even if you have justified prior classification changes to the same requests.',
	].join('\n')
}

/**
 * Build the message appended when a command tries to write a non-audit file while an open
 * mutation is outstanding (the write is rejected and reverted).
 */
export function buildOpenMutationNonAuditMessage(files: ReadonlyArray<RepoRelativePath>): string {
	const list = [...files]
		.sort((a, b) => a.localeCompare(b))
		.map(file => `  - ${file}`)
		.join('\n')

	return [
		`${COMMAND_CHECK_HOOK_MARKER} While an open mutation is outstanding, only ${AUDIT_LOG_RELATIVE_PATH} may be written;`,
		'reverted all other changes. Offending file(s):',
		list,
	].join('\n')
}

/**
 * Build the message appended when the audit log was not appended with exactly one valid
 * entry (the audit-log change is reverted).
 */
export function buildInvalidAuditAppendMessage(): string {
	return [
		`${COMMAND_CHECK_HOOK_MARKER} The audit log was not appended with exactly one valid entry;`,
		'reverted the audit log change. Run `pnpm wallet-data-collection:agent check` to see the outstanding impact.',
	].join('\n')
}

/** Compute the sha256 hex digest of a buffer or string. */
function sha256(data: Buffer | string): string {
	return createHash('sha256').update(data).digest('hex')
}

/** Compute the sha256 hex digest of a file's contents. */
function sha256File(filePath: string): string {
	return sha256(fs.readFileSync(filePath))
}

/** Recursively collect the absolute paths of every regular file under `dir`. */
function walkFiles(dir: string): string[] {
	if (!fs.existsSync(dir)) {
		return []
	}

	const files: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			files.push(...walkFiles(abs))
		} else if (entry.isFile()) {
			files.push(abs)
		}
	}

	return files
}

/** Remove empty directories under `dir` (bottom-up), leaving no stray folders behind. */
function pruneEmptyDirs(dir: string): void {
	if (!fs.existsSync(dir)) {
		return
	}

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			pruneEmptyDirs(abs)

			if (fs.readdirSync(abs).length === 0) {
				fs.rmdirSync(abs)
			}
		}
	}
}

/** True if a repo-relative path (leading `/`) names a wallet capture file. */
function isCaptureFile(rel: RepoRelativePath): boolean {
	return path.basename(rel).endsWith('.capture.json')
}

/** True when every impacted request belongs to the same wallet. */
function isSingleWalletImpact(impacted: WalletCaptureImpactedRequestId[]): boolean {
	return new Set(impacted.map(id => id.walletId)).size === 1
}

/** Snapshot of the repo: Mapping from repo-root-relative filenames to hashes. */
type RepoSnapshot = Record<RepoRelativePath, string>

/**
 * True if `rel` is a repo-global data path the agent may edit regardless of the wallet:
 * the entity-mapping directory, the global annotations file, or the entity registry.
 */
function isGlobalEditPath(rel: RepoRelativePath): boolean {
	return (
		rel.startsWith('/data/entities/') ||
		rel === '/data/collection/global.annotations.json' ||
		rel === '/data/entities.ts'
	)
}

/**
 * True if `rel` is one of the wallet's capture / annotations / datacollection files for
 * the given wallet context, i.e. a variant whose `variantToWalletType` matches a type in
 * `types`.
 */
function isWalletEditPath(
	rel: RepoRelativePath,
	walletId: string,
	variant: Variant | null,
	type: WalletType | null,
): boolean {
	const variants = variant == null ? variantEnum.items : [variant]
	const types = type == null ? walletTypes.items : [type]

	for (const v of variants) {
		for (const t of types) {
			if (variantToWalletType(v) !== t) {
				continue
			}

			const walletDir = `/data/${t.toLowerCase()}-wallets/collection/${walletId}`
			const suffix = `.${v.toLowerCase()}`

			if (
				rel === `${walletDir}/${walletId}${suffix}.capture.json` ||
				rel === `${walletDir}/${walletId}.annotations.json` ||
				rel === `${walletDir}/${walletId}${suffix}.datacollection.autogenerated.json` ||
				rel === `${walletDir}/${walletId}.datacollection.autogenerated.ts`
			) {
				return true
			}
		}
	}

	return false
}

/**
 * The agent-process-level state and operations for the command-check harness.
 *
 * Instantiated once per agent process. It resolves the scoped paths, snapshots them
 * into the git-ignored `backup-tree.bak/`, and exposes the operations (snapshot, backup
 * sync, revert, capture validation) that a {@link WalletDataCollectionBash} uses for
 * each command.
 */
export class WalletDataCollectionAgent {
	/** The repository root the agent snapshots. */
	readonly repoRoot: string
	private readonly agentDir: string
	private readonly backupTreeDir: string
	private readonly scope: Set<RepoRelativePath>

	/**
	 * The in-memory baseline the backup tree is known to reflect: repo-relative path
	 * (leading `/`) -> sha256. Updated at initialization and at each pre-hook so the
	 * pre-hook can decide what to copy without re-reading backup file contents.
	 */
	lastSnapshot: RepoSnapshot | null = null

	/**
	 * Whether an edit allowlist is active (a wallet context is provided).
	 */
	readonly hasAllowedRestriction: boolean

	/** Wallet context used to derive the allowed-edit rule (see {@link isAllowedEdit}). */
	private readonly walletId: string | undefined
	private readonly walletVariant: Variant | null
	private readonly walletType: WalletType | null

	/** Absolute path to the classification audit log. */
	readonly auditLogPath: string

	/**
	 * Non-null while an open mutation is outstanding. Holds the frozen pre-mutation
	 * classification cache and repo snapshot (used for rollback) plus the set of
	 * impacted request IDs already justified.
	 */
	openMutation: null | (OpenMutationState & { frozenSnapshot: RepoSnapshot })

	/**
	 * Classification fingerprints across all wallets, as of the most recent validated
	 * (pre-command) state. Updated after each non-arbitrary command that writes a file.
	 */
	classificationCache: Map<string, WalletRequestClassification>

	/** The in-memory audit log, kept in sync as entries are appended or reloaded. */
	auditLog: WalletCaptureClassificationAuditLogFile

	constructor() {
		this.repoRoot = getRepositoryRoot()
		this.agentDir = path.join(this.repoRoot, 'src/tools/wallet-data-collection/agent')
		this.backupTreeDir = path.join(this.agentDir, 'backup-tree.bak')
		this.auditLogPath = path.join(this.repoRoot, AUDIT_LOG_RELATIVE_PATH)
		this.scope = this.buildScope()

		const walletId = process.env.WALLETBEAT_WALLET_DATA_COLLECTION_ID
		const walletVariant = process.env.WALLETBEAT_WALLET_DATA_COLLECTION_VARIANT
		const walletType = process.env.WALLETBEAT_WALLET_DATA_COLLECTION_TYPE

		this.walletId = walletId
		this.walletVariant =
			walletVariant !== undefined && variantEnum.is(walletVariant) ? walletVariant : null
		this.walletType = walletType !== undefined && walletTypes.is(walletType) ? walletType : null
		this.hasAllowedRestriction = walletId !== undefined

		this.openMutation = null
		this.classificationCache = new Map()
		this.auditLog = WalletCaptureClassificationAuditLogFile.fromFile(this.auditLogPath)
	}

	/**
	 * True if the repo-relative path `rel` is within the agent's allowed-edit set.
	 */
	isAllowedEdit(rel: RepoRelativePath): boolean {
		if (!this.hasAllowedRestriction || this.walletId === undefined) {
			// Without a wallet context the agent is not scoped, so no restriction applies.
			return true
		}

		return (
			isGlobalEditPath(rel) ||
			isWalletEditPath(rel, this.walletId, this.walletVariant, this.walletType)
		)
	}

	/**
	 * One-time harness initialization: crawl the scoped paths, checksum them, and mirror
	 * them into `backup-tree.bak/`. The initial sync compares against the backup's own
	 * hashes (read once here) so files already present from a prior session are not
	 * re-copied.
	 */
	async initialize(): Promise<void> {
		const snapshot = await this.snapshotRepo()

		this.syncBackup(snapshot, this.snapshotBackupHashes())
		this.lastSnapshot = snapshot

		// Load the audit log (the source of truth across process restarts) and compute the
		// initial classification cache across all wallets.
		this.auditLog = WalletCaptureClassificationAuditLogFile.fromFile(this.auditLogPath)
		this.classificationCache = await allRequestClassifications(this.repoRoot)

		// Recover an orphaned open-mutation left by a prior harness run: resume in
		// open-mutation mode, restoring the un-justified set from the log.
		const open = this.auditLog.getOpenMutation()

		if (open !== null) {
			const impactedStrings = open.impacted.map(requestIdToString)
			const unjustified = this.auditLog.getUnjustifiedImpacted()
			const unjustifiedStrings = new Set(unjustified.map(requestIdToString))
			const justified: Set<string> = new Set(
				impactedStrings.filter((id: string) => !unjustifiedStrings.has(id)),
			)

			this.openMutation = {
				command: open.command,
				impacted: open.impacted,
				justified,
				frozenClassificationCache: this.classificationCache,
				// The pre-mutation repo state is not recoverable after a restart; a rollback
				// reverts to the current (already-mutated) state, which is a safe no-op.
				frozenSnapshot: snapshot,
			}
		}
	}

	/**
	 * Snapshot the scoped repo paths into a map of repo-relative paths.
	 */
	async snapshotRepo(): Promise<RepoSnapshot> {
		const filePaths: string[] = []

		await crawlCodebase({
			root: this.repoRoot,
			ignore: [this.buildIgnore()],
			baseTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE) {
					filePaths.push(entry.path)
				}
			},
		})

		const hashes = new Map<RepoRelativePath, string>()

		for (const rel of filePaths) {
			hashes.set(assertStringHasPrefix(`/${rel}`, '/'), sha256File(path.join(this.repoRoot, rel)))
		}

		return Object.fromEntries(hashes)
	}

	/**
	 * Mirror the scoped files into `backup-tree.bak/` so they match `target`:
	 *
	 * - Copies each file whose hash differs from `previous` (or whose backup is missing),
	 *   so unchanged files are not rewritten. `previous` is the in-memory baseline the
	 *   backup is known to reflect, so this avoids re-reading backup file contents.
	 * - Deletes any backup file present in `previous` but absent from `target`.
	 */
	syncBackup(target: RepoSnapshot, previous: RepoSnapshot): void {
		for (const [key, hash] of Object.entries(target)) {
			const rel = key.slice(1)
			const dst = path.join(this.backupTreeDir, rel)

			if (previous[assertStringHasPrefix(key, '/')] === hash && fs.existsSync(dst)) {
				continue
			}

			fs.mkdirSync(path.dirname(dst), { recursive: true })
			fs.copyFileSync(path.join(this.repoRoot, rel), dst)
		}

		for (const [key] of Object.entries(previous)) {
			if (!(key in target)) {
				fs.rmSync(path.join(this.backupTreeDir, key.slice(1)))
			}
		}

		pruneEmptyDirs(this.backupTreeDir)
	}

	/**
	 * Undo a command's effects on the scoped paths: copy every file back from
	 * `backup-tree.bak` (restoring modified/deleted files) and delete any file the
	 * command added that was not present before the command ran.
	 *
	 * `currentScopedKeys` is the set of repo-relative paths (leading `/`) present after
	 * the command; any of them with no backup is treated as newly added and removed.
	 */
	revertRepo(
		currentScopedKeys: RepoRelativePath[],
		options: { excludePaths?: ReadonlySet<RepoRelativePath> } = {},
	): void {
		const excluded = options.excludePaths ?? new Set<RepoRelativePath>()
		const bakFiles = walkFiles(this.backupTreeDir)
		const bakFileSet = new Set<RepoRelativePath>(
			bakFiles.map(f => assertStringHasPrefix(`/${path.relative(this.backupTreeDir, f)}`, '/')),
		)

		// Copy back every backed-up file first (overwrites modified files, restores deleted
		// ones), skipping any path that must not be reverted (e.g. the audit log).
		for (const bakFile of bakFiles) {
			const rel = path.relative(this.backupTreeDir, bakFile)
			const key = assertStringHasPrefix(`/${rel}`, '/')

			if (excluded.has(key)) {
				continue
			}

			const dst = path.join(this.repoRoot, rel)

			fs.mkdirSync(path.dirname(dst), { recursive: true })
			fs.copyFileSync(bakFile, dst)
		}

		// Then remove any file the command added that has no backup.
		for (const key of currentScopedKeys) {
			if (excluded.has(key)) {
				continue
			}

			if (!bakFileSet.has(key)) {
				fs.rmSync(path.join(this.repoRoot, key.slice(1)))
			}
		}
	}

	/**
	 * Return true if a capture file loads cleanly through {@link WalletCaptureFile}, i.e.
	 * it is well-formed, structurally valid, and survives the re-encode integrity check.
	 */
	async isCaptureFileLoadable(capturePath: RepoRelativePath): Promise<boolean> {
		try {
			const absPath = path.join(this.repoRoot, capturePath.slice(1))
			const annotations = loadAnnotationsForCapture(absPath)

			await WalletCaptureFile.fromFile(null, absPath, annotations)

			return true
		} catch {
			return false
		}
	}

	/** The per-bash-call pre hook, which creates a {@link WalletDataCollectionBash}. */
	readonly preHook: BashPreHook<WalletDataCollectionBash> = (command, options) => {
		const bash = new WalletDataCollectionBash(this)

		return bash.runPreHook(command, options)
	}

	/** The per-bash-call post hook, delegating to the command's bash instance. */
	readonly postHook: BashPostHook<WalletDataCollectionBash> = ({ preData, output, exitCode }) => {
		return preData.runPostHook({ output, exitCode })
	}

	/**
	 * The set of repo-relative paths to snapshot and back up.
	 */
	private buildScope(): Set<RepoRelativePath> {
		const scope = new Set<RepoRelativePath>(['/src', '/data', '/.pi', '/.agents'])

		for (const entry of fs.readdirSync(this.repoRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) {
				scope.add(assertStringHasPrefix(`/${entry.name}`, '/'))
			}
		}

		return scope
	}

	/**
	 * Build a {@link PathPredicate} that excludes (a) the backup directory (so the crawl
	 * never descends into it) and (b) any top-level entry that is not part of the scope,
	 * so the crawler stops at the scoped roots instead of traversing the whole repo.
	 */
	private buildIgnore(): PathPredicate {
		const allowedTopLevels = new Set([...this.scope].map(rel => rel.slice(1)))
		const backupPrefix = normalizePath(path.relative(this.repoRoot, this.backupTreeDir))

		return (rootRelativePath: string): boolean => {
			// Never crawl the backup directory (it lives under `src`, which is in scope).
			if (rootRelativePath === backupPrefix || rootRelativePath.startsWith(`${backupPrefix}/`)) {
				return true
			}

			// Nested paths are only reached under an allowed top-level (disallowed top-level
			// directories are not descended into), so keep them.
			if (rootRelativePath.includes('/')) {
				return false
			}

			return !allowedTopLevels.has(rootRelativePath)
		}
	}

	/**
	 * Snapshot the hashes of every file currently under `backup-tree.bak/`, keyed by
	 * repo-relative path (leading `/`). Used once at harness initialization so the
	 * initial sync can skip files already present in the backup from a prior session.
	 */
	private snapshotBackupHashes(): RepoSnapshot {
		const hashes = new Map<RepoRelativePath, string>()

		for (const bakFile of walkFiles(this.backupTreeDir)) {
			hashes.set(
				assertStringHasPrefix(`/${path.relative(this.backupTreeDir, bakFile)}`, '/'),
				sha256File(bakFile),
			)
		}

		return Object.fromEntries(hashes)
	}
}

/**
 * The per-command state and hooks for a single bash tool call.
 */
export class WalletDataCollectionBash {
	private readonly agent: WalletDataCollectionAgent

	/** The original command the model requested. */
	originalCommand: string

	/**
	 * True when the command is not a single `pnpm wallet-data-collection:agent` invocation.
	 */
	isArbitraryCommand: boolean

	/**
	 * sha256 of every scoped file as of the pre-hook, keyed by repo-relative path.
	 * Used by the post-hook to detect what the command changed.
	 */
	preHashes: RepoSnapshot

	constructor(agent: WalletDataCollectionAgent) {
		this.agent = agent
		this.originalCommand = ''
		this.isArbitraryCommand = false
		this.preHashes = {}
	}

	/**
	 * Pre-run hook: re-crawl the scoped paths, update `backup-tree.bak/` to match (copying
	 * only files whose hash changed against the agent's baseline), inject `WALLETBEAT_ENV=AGENT`,
	 * and enforce the single-invocation restriction:
	 *
	 * - A command referencing the arbitrary-command sentinel is a gaming attempt that
	 *   terminates the session.
	 * - A command that is not a single `pnpm wallet-data-collection:agent` invocation gets
	 *   `WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND=true` injected, so any nested
	 *   `pnpm wallet-data-collection:agent` refuses to run.
	 */
	async runPreHook(
		command: string,
		options?: BashOperationsOptions,
	): Promise<BashPreHookResult<WalletDataCollectionBash>> {
		// The agent must never reference the sentinel or the env vars the harness controls.
		if (referencesRestrictedEnvVar(command)) {
			process.stderr.write(
				`Refusing to run: the command references a harness-controlled environment variable (${RESTRICTED_ENV_VARS.join(', ')}), which the agent is not allowed to inspect or set. The agent attempted to game the command restriction. Terminating the session.\n`,
			)
			process.exit(1)
		}

		const preSnapshot = await this.agent.snapshotRepo()

		// While an open mutation is outstanding, freeze the backup tree so it retains the
		// pre-open-mutation state (needed for a later rollback). The audit log is never
		// reverted, so it is deliberately excluded from this freeze.
		if (this.agent.openMutation === null) {
			this.agent.syncBackup(preSnapshot, this.agent.lastSnapshot ?? {})
		}

		this.agent.lastSnapshot = preSnapshot
		this.originalCommand = command
		this.preHashes = preSnapshot
		this.isArbitraryCommand = !isPlainAgentInvocation(command)

		const env = buildAgentEnv(options?.env ?? {}, {
			isArbitrary: this.isArbitraryCommand,
			openMutationActive: this.agent.openMutation !== null,
		})

		return {
			command,
			options: {
				...options,
				env,
			},
			data: this,
		}
	}

	/**
	 * Post-run hook: detect the files the command added, modified, or deleted, then:
	 *
	 * - An arbitrary command may not edit any snapshot file, so every change is reverted
	 *   with a directive to edit via a plain `pnpm wallet-data-collection:agent` command.
	 * - While an open mutation is outstanding, only `collection.audit.json` may be written;
	 *   a `justify`/`rollback` append is validated and dispatched, and any other write is
	 *   reverted.
	 * - Otherwise, validate capture files and, if the command changed any request's
	 *   classification across the whole repository, open a mutation (append an
	 *   `open-mutation` entry) that the agent must then justify or roll back.
	 */
	async runPostHook({
		output,
		exitCode: _exitCode,
	}: {
		output: string
		exitCode: number | null
	}): Promise<BashPostHookResult | void> {
		const currentHashes = await this.agent.snapshotRepo()
		const changedFiles = this.computeChangedFiles(currentHashes)
		const auditChanged = changedFiles.some(file => file === AUDIT_LOG_REL)

		// An arbitrary command may not edit any file in the snapshot: revert every change.
		if (this.isArbitraryCommand) {
			if (changedFiles.length > 0) {
				this.agent.revertRepo(
					Object.keys(currentHashes).map(key => assertStringHasPrefix(key, '/')),
				)

				return {
					output: `${output}\n${buildArbitraryCommandEditMessage(changedFiles)}`,
				}
			}

			return
		}

		// While an open mutation is outstanding, only the audit log may be written.
		if (this.agent.openMutation !== null) {
			return this.handleOpenMutationPostHook({ output, changedFiles, auditChanged, currentHashes })
		}

		if (changedFiles.length === 0) {
			return
		}

		// Collect the files that triggered the revert, so the hook message can name them.
		const offendingFiles = await this.computeOffendingFiles(changedFiles, currentHashes)

		if (offendingFiles.size > 0) {
			this.agent.revertRepo(Object.keys(currentHashes).map(key => assertStringHasPrefix(key, '/')))

			return {
				output: output + `\n${buildCommandCheckErrorMessage(offendingFiles)}`,
			}
		}

		// Compute the classification diff across all wallets. A command that only wrote the
		// audit log (with no open mutation) is not a classification change, so skip it.
		const after = await allRequestClassifications(this.agent.repoRoot)
		const frozen = this.agent.classificationCache
		const impacted = diffClassifications(frozen, after)

		this.agent.classificationCache = after

		if (impacted.length === 0) {
			return
		}

		// A domain classification (`mark-domain` / `mark-domain-update`) that affects only a
		// single wallet does not need justification; only a cross-wallet domain change opens
		// a mutation. Other classification changes always open a mutation.
		if (isDomainClassificationCommand(this.originalCommand) && isSingleWalletImpact(impacted)) {
			return
		}

		// Append an `open-mutation` entry and enter open-mutation mode. The recorded
		// command has any `cd <repo-root>` path redacted to `/walletbeat`.
		const auditLog = WalletCaptureClassificationAuditLogFile.fromFile(this.agent.auditLogPath)
		const command = redactCdPath(this.originalCommand)

		auditLog.appendEntry({
			type: 'open-mutation',
			command,
			impacted: assertNonEmptyArray(impacted),
			unixMillis: Date.now(),
		})
		await auditLog.save()

		this.agent.auditLog = auditLog
		this.agent.openMutation = {
			command,
			impacted,
			justified: new Set(),
			frozenClassificationCache: frozen,
			frozenSnapshot: currentHashes,
		}

		return {
			output: `${output}\n${buildOpenMutationMessage(impacted)}`,
		}
	}

	/**
	 * Compute the repo-relative paths (leading `/`) that changed between the pre-hook
	 * snapshot and `currentHashes`.
	 */
	private computeChangedFiles(currentHashes: RepoSnapshot): RepoRelativePath[] {
		const changedFiles: Array<RepoRelativePath> = []

		for (const [key, hash] of Object.entries(currentHashes)) {
			if (this.preHashes[assertStringHasPrefix(key, '/')] !== hash) {
				changedFiles.push(assertStringHasPrefix(key, '/'))
			}
		}

		for (const key of Object.keys(this.preHashes)) {
			if (!(key in currentHashes)) {
				changedFiles.push(assertStringHasPrefix(key, '/'))
			}
		}

		return changedFiles
	}

	/**
	 * Collect the files that violate the allowed-edit restriction or fail capture
	 * validation, so the hook message can name them.
	 */
	private async computeOffendingFiles(
		changedFiles: RepoRelativePath[],
		currentHashes: RepoSnapshot,
	): Promise<Set<RepoRelativePath>> {
		const offendingFiles = new Set<RepoRelativePath>()

		// With an edit allowlist configured, any change to a file outside it is a violation.
		if (this.agent.hasAllowedRestriction) {
			for (const key of changedFiles) {
				if (!this.agent.isAllowedEdit(key)) {
					offendingFiles.add(key)
				}
			}
		}

		// A deleted capture file cannot be validated, so it always requires a revert.
		if (offendingFiles.size === 0) {
			for (const key of changedFiles) {
				if (isCaptureFile(key) && !(key in currentHashes)) {
					offendingFiles.add(key)
				}
			}
		}

		// Validate any modified capture file that is still present.
		if (offendingFiles.size === 0) {
			for (const key of changedFiles) {
				if (!isCaptureFile(key) || !(key in currentHashes)) {
					continue
				}

				if (!(await this.agent.isCaptureFileLoadable(key))) {
					offendingFiles.add(key)
				}
			}
		}

		return offendingFiles
	}

	/**
	 * Post-hook handling while an open mutation is outstanding: reject any write other
	 * than `collection.audit.json`, and validate + dispatch a `justify`/`rollback` append.
	 */
	private async handleOpenMutationPostHook({
		output,
		changedFiles,
		auditChanged,
		currentHashes,
	}: {
		output: string
		changedFiles: RepoRelativePath[]
		auditChanged: boolean
		currentHashes: RepoSnapshot
	}): Promise<BashPostHookResult | void> {
		const openMutation = this.agent.openMutation

		if (openMutation === null) {
			return
		}

		const nonAuditChanged = changedFiles.filter(file => file !== AUDIT_LOG_REL)

		// Any write other than the audit log is rejected and reverted.
		if (nonAuditChanged.length > 0) {
			this.agent.revertRepo(Object.keys(currentHashes).map(key => assertStringHasPrefix(key, '/')))

			return {
				output: `${output}\n${buildOpenMutationNonAuditMessage(nonAuditChanged)}`,
			}
		}

		if (!auditChanged) {
			return
		}

		// The audit log was written; validate that exactly one valid entry was appended.
		const previousCount = this.agent.auditLog.entryCount
		const previousTip = this.agent.auditLog.lastTip
		const auditLog = WalletCaptureClassificationAuditLogFile.fromFile(this.agent.auditLogPath)
		const appended = auditLog.validateAppend(previousCount, previousTip)

		if (appended === null) {
			// Invalid append: restore the audit log from the harness's in-memory copy.
			await this.agent.auditLog.save()

			return {
				output: `${output}\n${buildInvalidAuditAppendMessage()}`,
			}
		}

		this.agent.auditLog = auditLog

		if (appended.type === 'justify') {
			const { nextState, autoClose } = mergeJustifyIntoOpenMutation(openMutation, appended)

			if (autoClose) {
				// Auto-append `close-mutation` (harness-only) and close the open mutation.
				const closeLog = WalletCaptureClassificationAuditLogFile.fromFile(this.agent.auditLogPath)

				closeLog.appendEntry({ type: 'close-mutation', unixMillis: Date.now() })
				await closeLog.save()

				this.agent.auditLog = closeLog
				this.agent.openMutation = null

				// The mutation is complete; re-sync the backup to the current state.
				this.agent.syncBackup(currentHashes, this.agent.lastSnapshot ?? {})
				this.agent.lastSnapshot = currentHashes

				return
			}

			this.agent.openMutation = {
				...nextState,
				frozenSnapshot: openMutation.frozenSnapshot,
			}

			return
		}

		if (appended.type === 'rollback') {
			// Revert the repo to the pre-open-mutation state, excluding the audit log (the
			// log is never reverted).
			this.agent.revertRepo(
				Object.keys(currentHashes).map(key => assertStringHasPrefix(key, '/')),
				{ excludePaths: new Set<RepoRelativePath>([AUDIT_LOG_REL]) },
			)
			this.agent.classificationCache = openMutation.frozenClassificationCache
			this.agent.openMutation = null

			return
		}

		// An `open-mutation` or `close-mutation` from bash is never valid; the harness
		// owns those. Revert the audit log to the in-memory state.
		await this.agent.auditLog.save()

		return {
			output: `${output}\n${buildInvalidAuditAppendMessage()}`,
		}
	}
}

// One agent per agent process, initialized on module load (harness initialization).
const agent = new WalletDataCollectionAgent()

await agent.initialize()

/** Wrap a base {@link BashOperations} with the concrete command-check hooks. */
export function createCommandCheckBashOperations(base: BashOperations): BashOperations {
	return createHookBashOperations(base, agent.preHook, agent.postHook)
}
