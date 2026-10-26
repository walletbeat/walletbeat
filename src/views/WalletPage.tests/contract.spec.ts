import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

import { expect, test } from '../../../tests/browser/verified-test'

const run = promisify(execFile)
const contract = new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url)

// Specialized suites exercise conditional ladders, assets, names and assigned types.
// The complete responsive collector runs once per engine rather than repeating its
// global obligations on fixtures where those obligations cannot apply.
for (const fixture of ['software']) {
	test(`complete contract: ${fixture}`, async ({ baseURL, browserName }, info) => {
		const output = info.outputPath('contract')

		await run(
			process.execPath,
			[
				'--import',
				'tsx',
				'tests/browser/wallet-page.mjs',
				contract.pathname,
				output,
				new URL(`/__wallet-page/${fixture}/`, baseURL).href,
				browserName,
			],
			{ timeout: 600000, maxBuffer: 1024 * 1024 },
		)
		const result: unknown = JSON.parse(await readFile(`${output}/results.json`, 'utf8'))

		await info.attach('contract-results', {
			path: `${output}/results.json`,
			contentType: 'application/json',
		})

		if (
			typeof result !== 'object' ||
			result === null ||
			!('errors' in result) ||
			!('completeResponsiveCoverage' in result) ||
			!('results' in result) ||
			!Array.isArray(result.results)
		) {
			throw new Error('Invalid contract collector result')
		}

		const rows: unknown[] = result.results

		if (
			!rows.every(
				(row): row is { status: string } =>
					typeof row === 'object' &&
					row !== null &&
					'status' in row &&
					typeof row.status === 'string',
			)
		) {
			throw new Error('Invalid contract result rows')
		}

		expect(result.errors, 'capture and input failures').toEqual([])
		expect(
			result.completeResponsiveCoverage,
			'Focused development captures cannot certify the complete responsive contract',
		).toBe(true)
		expect(
			rows.filter(row => row.status === 'fail'),
			'Collection must expose actual counterexamples; the mandatory aggregate gate owns completeness across specialized suites.',
		).toEqual([])
	})
}
