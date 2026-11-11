import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, it } from 'vitest'

import {
	aggregateContract,
	capturesFromPlaywright,
	contractURL,
	parseProcedures,
	parseRequirements,
} from './browser/contract-evidence.mjs'

const contract = await readFile(contractURL, 'utf8')
const contractHash = createHash('sha256').update(contract).digest('hex')
const source = {
	revision: 'revision',
	diffHash: 'diff',
	untrackedHash: 'untracked',
	build: { revision: 'revision', diffHash: 'build-diff', untrackedHash: 'build-untracked' },
}
const capture = (engine: string, status = 'pass', complete = true) => ({
	source,
	contractHash,
	engine,
	origin: 'native test',
	results: [
		{
			id: '🏗️ RealHeadings',
			status,
			complete,
			evidence: 'Native node identity through all required states',
		},
	],
})

it('requires current complete evidence in every engine and retains all independent obligations', () => {
	const result = aggregateContract(contract, source, [capture('chromium'), capture('firefox')])

	expect(result.results).toHaveLength(209)
	expect(result.results.find(row => row.id === '🏗️ RealHeadings')).toMatchObject({
		status: 'unverified',
		missingEngines: ['webkit'],
	})
	expect(result.firstPassComplete).toBe(false)
	expect(result.complete).toBe(false)
	expect(result.results.find(row => row.id === '⚡ Android')).toMatchObject({
		phase: 'performance',
		status: 'unverified',
	})
	expect(result.results.find(row => row.id === '⚡ Smoothness')).toMatchObject({
		phase: 'performance',
		status: 'unverified',
	})
	const full = aggregateContract(
		contract,
		source,
		['chromium', 'firefox', 'webkit'].map(engine => capture(engine)),
	)

	expect(full.results.find(row => row.id === '🏗️ RealHeadings')?.status).toBe('pass')
	expect(full.firstPassComplete).toBe(false)
})

it('keeps the executable procedure ledger aligned with every contract obligation', async () => {
	const cases = await readFile(new URL('./browser/wallet-page-cases.md', import.meta.url), 'utf8')
	const requirements = parseRequirements(contract).map(row => row.id)
	const procedures = parseProcedures(cases).map(row => row.id)

	expect(procedures).toEqual(requirements)
})

it('does not promote partial assertions or hide a current counterexample behind passing observations', () => {
	const captures = ['chromium', 'firefox', 'webkit'].map(engine => capture(engine, 'pass', false))

	expect(
		aggregateContract(contract, source, captures).results.find(row => row.id === '🏗️ RealHeadings')
			?.status,
	).toBe('unverified')
	captures.push(capture('chromium', 'fail'))
	expect(
		aggregateContract(contract, source, captures).results.find(row => row.id === '🏗️ RealHeadings')
			?.status,
	).toBe('fail')
})

it('rejects evidence when either source custody or the contract changes', () => {
	for (const changed of [
		{ ...capture('chromium'), source: { ...source, diffHash: 'changed' } },
		{ ...capture('chromium'), contractHash: 'changed' },
	]) {
		const result = aggregateContract(contract, source, [changed])

		expect(result.rejected).toHaveLength(1)
		expect(result.results.every(row => row.status === 'unverified')).toBe(true)
	}
})

it('refuses evidence for invented or removed requirements', () => {
	const invented = {
		...capture('chromium'),
		results: [{ id: 'invented', status: 'pass', complete: true }],
	}

	expect(() => aggregateContract(contract, source, [invented])).toThrow('Unknown contract ID')
	const duplicate = contract.replace('Singleton', 'HeaderAncestry')

	expect(duplicate).not.toBe(contract)
	expect(() => aggregateContract(duplicate, source, [])).toThrow('209 unique requirements')
})

it('imports explicit native evidence only after its complete verified test passes', async () => {
	const evidence = capture('chromium')
	const attachment = (name: string, value: unknown) => ({
		name,
		body: Buffer.from(JSON.stringify(value)).toString('base64'),
	})
	const report = (status: string) => ({
		suites: [
			{
				specs: [
					{
						title: 'native owners',
						tests: [
							{
								status: status === 'passed' ? 'expected' : 'unexpected',
								results: [
									{
										status,
										attachments: [
											attachment('capture-source', source),
											attachment('contract-evidence', evidence),
										],
									},
								],
							},
						],
					},
				],
			},
		],
	})

	expect(await capturesFromPlaywright(report('passed'), 'report.json')).toHaveLength(1)
	expect(await capturesFromPlaywright(report('failed'), 'report.json')).toEqual([])
})

it('retains valid partial collector observations when the completeness gate is red', async () => {
	const data = {
		source,
		contractHash,
		engine: 'chromium',
		completeResponsiveCoverage: true,
		errors: [],
		results: [
			{ id: '🏗️ Singleton', status: 'pass' },
			{ id: '⚡ Android', status: 'unverified' },
		],
	}
	const report = {
		suites: [
			{
				specs: [
					{
						title: 'complete contract',
						tests: [
							{
								status: 'unexpected',
								results: [
									{
										status: 'failed',
										attachments: [
											{
												name: 'contract-results',
												body: Buffer.from(JSON.stringify(data)).toString('base64'),
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
	}
	const captures = await capturesFromPlaywright(report, 'report.json')

	expect(captures).toHaveLength(1)
	expect(captures[0].results.map(row => row.complete)).toEqual([true, false])
})

it('treats Android as a later constrained-mobile performance target without a hardware gate', () => {
	const android = {
		...capture('chromium'),
		results: [{ id: '⚡ Android', status: 'pass', complete: true }],
	}

	expect(
		aggregateContract(contract, source, [android]).results.find(row => row.id === '⚡ Android'),
	).toMatchObject({
		phase: 'performance',
		status: 'unverified',
		missingMobileProfile: true,
		missingEngines: [],
	})
	const constrained = {
		...android,
		results: [
			{ ...android.results[0], mobileProfile: { touch: true, cpuSlowdown: 4, emulated: true } },
		],
	}

	expect(
		aggregateContract(contract, source, [constrained]).results.find(row => row.id === '⚡ Android'),
	).toMatchObject({ status: 'pass', missingMobileProfile: false })
	expect(aggregateContract(contract, source, [constrained]).firstPassComplete).toBe(false)
})
