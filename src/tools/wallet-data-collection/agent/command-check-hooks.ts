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

import { assertStringHasPrefix } from '../../../types/utils/text'
import {
	CodebaseEntryType,
	crawlCodebase,
	getRepositoryRoot,
	normalizePath,
	type PathPredicate,
} from '../../../utils/codebase'
import { WalletCaptureAnnotations } from '../wallet-capture-annotations'
import { WalletCaptureFile } from '../wallet-capture-file'
import {
	type BashOperationsOptions,
	type BashPostHook,
	type BashPostHookResult,
	type BashPreHook,
	type BashPreHookResult,
	createHookBashOperations,
} from './bash-hooks'

/** A repo-relative path, e.g. `/src` or `/package.json`. */
type RepoRelativePath = `/${string}`

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

/** Snapshot of the repo: Mapping from repo-root-relative filenames to hashes. */
type RepoSnapshot = Record<RepoRelativePath, string>

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
	private readonly globalAnnotationsPath: string
	private readonly scope: Set<RepoRelativePath>

	/**
	 * The in-memory baseline the backup tree is known to reflect: repo-relative path
	 * (leading `/`) -> sha256. Updated at initialization and at each pre-hook so the
	 * pre-hook can decide what to copy without re-reading backup file contents.
	 */
	lastSnapshot: RepoSnapshot | null = null

	/** The set of repo-relative paths the harness is allowed to edit. */
	readonly allowedEditFiles: Set<RepoRelativePath>

	/** Whether an edit allowlist is active (the env var is set, even if empty). */
	readonly hasAllowedRestriction: boolean

	constructor() {
		this.repoRoot = getRepositoryRoot()
		this.agentDir = path.join(this.repoRoot, 'src/tools/wallet-data-collection/agent')
		this.backupTreeDir = path.join(this.agentDir, 'backup-tree.bak')
		this.globalAnnotationsPath = path.join(
			this.repoRoot,
			'data',
			'collection',
			'global.annotations.json',
		)
		this.scope = this.buildScope()
		this.allowedEditFiles = this.parseAllowedEditFiles()
		this.hasAllowedRestriction =
			process.env.WALLETBEAT_WALLET_DATA_COLLECTION_ALLOWED_EDIT_FILES !== undefined
	}

	/**
	 * One-time harness initialization: crawl the scoped paths, checksum them, and mirror
	 * them into `backup-tree.bak/`. The initial sync compares against the backup's own
	 * hashes (read once here) so files already present from a prior session are not
	 * re-copied.
	 */
	async initialize(): Promise<void> {
		const snapshot = await this.snapshotRepo()

		// When an edit allowlist is configured, every allowed file must be present in the
		// initial snapshot, otherwise the harness would be told it may edit a file that
		// does not exist.
		for (const rel of this.allowedEditFiles) {
			if (snapshot[rel] === undefined) {
				throw new Error(
					`[command-check-hooks] Allowed edit file ${rel} is missing from the initial snapshot`,
				)
			}
		}

		this.syncBackup(snapshot, this.snapshotBackupHashes())
		this.lastSnapshot = snapshot
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
	revertRepo(currentScopedKeys: RepoRelativePath[]): void {
		const bakFiles = walkFiles(this.backupTreeDir)
		const bakFileSet = new Set<RepoRelativePath>(
			bakFiles.map(f => assertStringHasPrefix(`/${path.relative(this.backupTreeDir, f)}`, '/')),
		)

		// Copy back every backed-up file first (overwrites modified files, restores deleted
		// ones).
		for (const bakFile of bakFiles) {
			const rel = path.relative(this.backupTreeDir, bakFile)
			const dst = path.join(this.repoRoot, rel)

			fs.mkdirSync(path.dirname(dst), { recursive: true })
			fs.copyFileSync(bakFile, dst)
		}

		// Then remove any file the command added that has no backup.
		for (const key of currentScopedKeys) {
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
			const annotations = this.loadAnnotationsForCapture(absPath)

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

	/**
	 * Parse `WALLETBEAT_WALLET_DATA_COLLECTION_ALLOWED_EDIT_FILES` (a comma-separated set
	 * of repo-root-relative `/${string}` paths) into a Set of `/${string}` keys. Returns
	 * an empty set when the env var is unset or empty.
	 */
	private parseAllowedEditFiles(): Set<RepoRelativePath> {
		const raw = process.env.WALLETBEAT_WALLET_DATA_COLLECTION_ALLOWED_EDIT_FILES
		const set = new Set<RepoRelativePath>()

		if (raw === undefined) {
			return set
		}

		for (const rel of raw.split(',')) {
			const trimmed = rel.trim()

			if (trimmed === '') {
				continue
			}

			set.add(assertStringHasPrefix(normalizePath(trimmed), '/'))
		}

		return set
	}

	/**
	 * Resolve the {@link WalletCaptureAnnotations} for a capture file. `capturePath` is
	 * the absolute path to the capture file; its sibling `<walletId>.annotations.json`
	 * supplies wallet-specific annotations and the repo-global
	 * `data/collection/global.annotations.json` supplies the rest.
	 */
	private loadAnnotationsForCapture(capturePath: string): WalletCaptureAnnotations {
		const dir = path.dirname(capturePath)
		const walletId = path.basename(dir)
		const annotationsPath = path.join(dir, `${walletId}.annotations.json`)

		return WalletCaptureAnnotations.fromFile(annotationsPath, this.globalAnnotationsPath)
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
	 * sha256 of every scoped file as of the pre-hook, keyed by repo-relative path.
	 * Used by the post-hook to detect what the command changed.
	 */
	preHashes: RepoSnapshot

	constructor(agent: WalletDataCollectionAgent) {
		this.agent = agent
		this.originalCommand = ''
		this.preHashes = {}
	}

	/**
	 * Pre-run hook: re-crawl the scoped paths, update `backup-tree.bak/` to match (copying
	 * only files whose hash changed against the agent's baseline) and inject
	 * `WALLETBEAT_ENV=AGENT`.
	 */
	async runPreHook(
		command: string,
		options?: BashOperationsOptions,
	): Promise<BashPreHookResult<WalletDataCollectionBash>> {
		const preSnapshot = await this.agent.snapshotRepo()

		this.agent.syncBackup(preSnapshot, this.agent.lastSnapshot ?? {})
		this.agent.lastSnapshot = preSnapshot
		this.originalCommand = command
		this.preHashes = preSnapshot

		return {
			command,
			options: {
				...options,
				env: { ...options?.env, WALLETBEAT_ENV: 'AGENT' },
			},
			data: this,
		}
	}

	/**
	 * Post-run hook: detect capture files the command added, modified, or deleted, validate
	 * each still-present modified capture file via {@link WalletCaptureFile}, and revert the
	 * scoped paths from `backup-tree.bak` if any is invalid.
	 */
	async runPostHook({
		output,
		exitCode: _exitCode,
	}: {
		output: string
		exitCode: number | null
	}): Promise<BashPostHookResult | void> {
		const currentHashes = await this.agent.snapshotRepo()

		// Determine which files changed during the command (added, modified, or deleted).
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

		const allowed = this.agent.allowedEditFiles
		let invalid = false

		// With an edit allowlist configured, any change to a file outside it is a violation.
		if (this.agent.hasAllowedRestriction && changedFiles.some(key => !allowed.has(key))) {
			invalid = true
		}

		// A deleted capture file cannot be validated, so it always requires a revert.
		if (!invalid && changedFiles.some(key => isCaptureFile(key) && !(key in currentHashes))) {
			invalid = true
		}

		// Validate any modified capture file that is still present.
		if (!invalid) {
			for (const key of changedFiles) {
				if (!isCaptureFile(key) || !(key in currentHashes)) {
					continue
				}

				if (!(await this.agent.isCaptureFileLoadable(key))) {
					invalid = true
					break
				}
			}
		}

		if (invalid) {
			this.agent.revertRepo(Object.keys(currentHashes).map(key => assertStringHasPrefix(key, '/')))

			return {
				output:
					output +
					'\n[command-check-hooks] A modified file was outside the allowed edit set or failed validation; reverted all changes to the scoped repo paths from backup-tree.bak.',
			}
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
