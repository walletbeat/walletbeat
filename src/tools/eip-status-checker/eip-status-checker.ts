import { eips } from '@/data/eips'
import { getErrorMessage } from '@/types/errors'

import {
	checkEipStatuses,
	defaultOptions,
	formatReport,
	reportToJson,
} from './eip-status-checker-lib'

/**
 * Warning-only checker: compares each tracked EIP's Walletbeat status against
 * the `status:` field of its upstream spec and reports any drift.
 *
 * Exits 0 by default (warning-only, safe to run on a schedule). Pass `--strict`
 * to exit non-zero when drift is found. `--json` emits a machine-readable
 * report; `--quiet` suppresses the per-EIP "ok" lines.
 */
const args = process.argv.slice(2)
const options = {
	json: args.includes('--json'),
	quiet: args.includes('--quiet'),
	strict: args.includes('--strict'),
}

try {
	const report = await checkEipStatuses(Object.values(eips), defaultOptions)

	process.stdout.write(options.json ? `${reportToJson(report)}\n` : formatReport(report, options))

	process.exit(options.strict && report.drift.length > 0 ? 1 : 0)
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
