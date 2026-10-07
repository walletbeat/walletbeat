import fs from 'node:fs'
import path from 'node:path'

/**
 * Environment variable the bash tool sets for arbitrary (non-single-invocation) commands.
 * When set, the wallet data collection tool accepts to run but refuses to save any changes
 * to any file: it operates in a read-only (dry-run) mode. See {@link isReadOnlyMode}.
 */
export const ARBITRARY_COMMAND_ENV = 'WALLETBEAT_WALLET_DATA_COLLECTION_ARBITRARY_COMMAND'

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
		`[wallet-data-collection] Refusing to save changes: read-only mode is active.\nThe command would have modified: ${filePath}.\nThe \`pnpm wallet-data-collection:agent\` command must be run on its own invocation with no shell variables.\nDo not attempt to work around this limitation; attempts to do so will be flagged immediately.\nInstead, simply run the \`pnpm wallet-data-collection:agent [args...]\` command you intended to run, one per tool call, no variables.`,
	)
}

/**
 * Write `content` to `filePath` atomically (via a temp file + rename).
 */
export async function writeFileAtomically(filePath: string, content: string): Promise<void> {
	if (isReadOnlyMode()) {
		throw readOnlyWriteError(filePath)
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

	if (!fs.existsSync(filePath)) {
		return
	}

	await fs.promises.rm(filePath)
}
