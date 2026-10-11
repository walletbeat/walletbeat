import fs from 'node:fs'
import path from 'node:path'

import { getRepositoryRoot } from '@/utils/codebase'

/**
 * Environment variable the bash tool sets for arbitrary (non-single-invocation) commands.
 * When set, the wallet data collection tool accepts to run but refuses to save any changes
 * to any file: it operates in a read-only (dry-run) mode. See {@link isReadOnlyMode}.
 */
export const ARBITRARY_COMMAND_ENV = 'WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND'

/**
 * Environment variable the bash tool sets while an open mutation is outstanding. When set,
 * the wallet data collection tool accepts to write only to `data/collection/collection.audit.json`
 * and refuses every other file mutation. See {@link isOpenMutationMode}.
 */
export const OPEN_MUTATION_ENV = 'WALLETBEAT_WALLET_DATA_COLLECTION_OPEN_MUTATION'

/** The repo-root-relative path of the classification audit log. */
export const AUDIT_LOG_RELATIVE_PATH = 'data/collection/collection.audit.json'

/**
 * True when the wallet data collection tool is running in open-mutation mode (the
 * open-mutation env var is set). In this mode only the audit log may be written.
 */
export function isOpenMutationMode(): boolean {
	return process.env[OPEN_MUTATION_ENV] !== undefined
}

/**
 * True when the absolute path resolves to the audit log file.
 */
export function isAuditLogPath(absPath: string): boolean {
	const repoRoot = getRepositoryRoot()
	const resolved = path.resolve(repoRoot, absPath)
	const target = path.join(repoRoot, AUDIT_LOG_RELATIVE_PATH)

	return resolved === path.resolve(target)
}

/**
 * True when the wallet data collection tool is running in read-only mode (the
 * arbitrary-command env var is set). In this mode the tool parses and validates normally,
 * but every file mutation is refused with an error: subcommands that would change a file
 * on disk compute the new content, compare it against the existing file, and throw rather
 * than write.
 */
export function isReadOnlyMode(): boolean {
	return process.env[ARBITRARY_COMMAND_ENV] !== undefined
}

/**
 * Build the error thrown when a read-only run would have modified a file.
 */
function readOnlyWriteError(filePath: string): Error {
	return new Error(
		`[wallet-data-collection] Command too complex; no changes were saved.\nThis command would have modified: ${filePath}.\nThe \`pnpm wallet-data-collection:agent\` command must be run on its own invocation with no shell variables.\nDo not attempt to work around this limitation; attempts to do so will be flagged immediately.\nInstead, simply run the \`pnpm wallet-data-collection:agent [args...]\` command you intended to run, one per tool call, no variables.`,
	)
}

/**
 * Build the error thrown when a write is attempted while an open mutation is
 * outstanding (only the audit log may be written then).
 */
function openMutationWriteError(filePath: string): Error {
	return new Error(
		`[wallet-data-collection] An open mutation is outstanding; no changes were saved.\nThis command would have modified: ${filePath}.\nWhile an open mutation is outstanding, only \`data/collection/collection.audit.json\` may be written.\nRun \`pnpm wallet-data-collection:agent check\` to list the outstanding classification changes, then \`justify\` or \`rollback\` them before making further changes.`,
	)
}

/**
 * Write `content` to `filePath` atomically (via a temp file + rename).
 */
export async function writeFileAtomically(filePath: string, content: string): Promise<void> {
	if (isReadOnlyMode()) {
		throw readOnlyWriteError(filePath)
	}

	// While an open mutation is outstanding, only the audit log may be written.
	if (isOpenMutationMode() && !isAuditLogPath(filePath)) {
		throw openMutationWriteError(filePath)
	}

	const tmpPath = filePath + '.tmp'

	await fs.promises.mkdir(path.dirname(tmpPath), { recursive: true })
	await fs.promises.writeFile(tmpPath, content, 'utf8')
	await fs.promises.rename(tmpPath, filePath)
}

/**
 * Remove `filePath`.
 */
export async function removeFile(filePath: string): Promise<void> {
	if (isReadOnlyMode()) {
		throw readOnlyWriteError(filePath)
	}

	// While an open mutation is outstanding, only the audit log may be written.
	if (isOpenMutationMode() && !isAuditLogPath(filePath)) {
		throw openMutationWriteError(filePath)
	}

	if (!fs.existsSync(filePath)) {
		return
	}

	await fs.promises.rm(filePath)
}
