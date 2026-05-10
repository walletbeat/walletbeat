/**
 * CLI wrapper for the wallet `metadata.lastUpdated` freshness check.
 *
 * Run as part of CI (see .github/workflows/check.yaml). Passes if every
 * modified wallet entry in the current branch has had its `lastUpdated`
 * bumped to today's commit date (within a 3-day tolerance), or if the head
 * commit message contains the bypass token.
 *
 * Usage:
 *   tsx src/tools/wallet-metadata-update-check/wallet-metadata-update-check.ts
 *   tsx src/tools/wallet-metadata-update-check/wallet-metadata-update-check.ts --base origin/main
 *   tsx src/tools/wallet-metadata-update-check/wallet-metadata-update-check.ts --quiet
 */

import { formatResult, runCheck } from './wallet-metadata-update-check-lib'

function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message
	}

	if (typeof err === 'string') {
		return err
	}

	try {
		return JSON.stringify(err)
	} catch {
		return String(err)
	}
}

const args = process.argv.slice(2)

function readArg(name: string): string | undefined {
	const flag = `--${name}`
	const idx = args.indexOf(flag)

	if (idx === -1) {
		return undefined
	}

	return args[idx + 1]
}

const quiet = args.includes('--quiet')

try {
	const result = runCheck({
		baseRef: readArg('base'),
	})
	const output = formatResult(result)

	if (result.ok) {
		if (!quiet) {
			process.stdout.write(`${output}\n`)
		}
		process.exit(0)
	} else {
		process.stderr.write(`${output}\n`)
		process.exit(1)
	}
} catch (err) {
	process.stderr.write(`Error: ${getErrorMessage(err)}\n`)
	process.exit(1)
}
