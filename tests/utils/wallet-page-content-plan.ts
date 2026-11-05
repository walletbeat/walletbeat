import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { isRecord } from '@/types/utils/record'
import { getRepositoryRoot } from '@/utils/codebase'

import { sourceSnapshot } from '../browser/fixtures/source-snapshot.mjs'
import type { WalletContentPlan } from './wallet-page-content'

const strings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every(item => typeof item === 'string')
const nullableString = (value: unknown): value is string | null =>
	value === null || typeof value === 'string'

function isContentPlans(value: unknown): value is WalletContentPlan[] {
	return (
		Array.isArray(value) &&
		value.every(
			plan =>
				isRecord(plan) &&
				typeof plan.id === 'string' &&
				Array.isArray(plan.variants) &&
				plan.variants.every(nullableString) &&
				strings(plan.ownModels) &&
				Array.isArray(plan.cases) &&
				plan.cases.every(
					state =>
						isRecord(state) &&
						nullableString(state.variant) &&
						nullableString(state.model) &&
						Array.isArray(state.attributes) &&
						state.attributes.every(
							attribute =>
								isRecord(attribute) &&
								typeof attribute.id === 'string' &&
								typeof attribute.name === 'string' &&
								typeof attribute.rating === 'string' &&
								strings(attribute.citations),
						) &&
						Array.isArray(state.badges) &&
						state.badges.every(
							badge =>
								isRecord(badge) &&
								['href', 'text', 'image', 'alt'].every(key => typeof badge[key] === 'string'),
						),
				),
		)
	)
}

/** Use the repository's TS/JSON loader for canonical data, independently of Playwright's transpiler. */
export function loadWalletContentPlans(): WalletContentPlan[] {
	const root = getRepositoryRoot()
	const module = pathToFileURL(join(root, 'tests/utils/wallet-page-content.ts')).href
	const json = execFileSync(
		process.execPath,
		[
			'--import',
			'tsx',
			'--input-type=module',
			'--eval',
			`import { walletContentPlans } from ${JSON.stringify(module)}; console.log(JSON.stringify(walletContentPlans()))`,
		],
		{ cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
	)
	const parsed: unknown = JSON.parse(json)

	if (!isContentPlans(parsed) || !parsed.length) {
		throw new Error('Invalid canonical wallet content plans')
	}

	return parsed
}

/** Browser setup produces missing expectations and rejects changed working-tree inputs. */
export async function loadWalletDetailSnapshots(): Promise<Record<string, string>> {
	const root = getRepositoryRoot()
	const path =
		process.env.WALLET_PAGE_DETAIL_EXPECTATIONS ??
		join(root, '.astro', 'wallet-content-details.json')
	const source = await sourceSnapshot()
	const read = (): unknown => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null)
	let parsed = read()

	if (!isRecord(parsed) || JSON.stringify(parsed.source) !== JSON.stringify(source)) {
		execFileSync(
			process.execPath,
			[
				join(root, 'node_modules/vitest/vitest.mjs'),
				'--run',
				'src/views/WalletPage.tests/content-oracle.test.ts',
			],
			{ cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
		)
		parsed = read()
	}

	if (
		!isRecord(parsed) ||
		JSON.stringify(parsed.source) !== JSON.stringify(source) ||
		!isRecord(parsed.details) ||
		!Object.values(parsed.details).every(value => typeof value === 'string') ||
		JSON.stringify(await sourceSnapshot()) !== JSON.stringify(source)
	) {
		throw new Error('Canonical detail expectations do not match source inputs')
	}

	const details: Record<string, string> = {}

	for (const [key, value] of Object.entries(parsed.details)) {
		if (typeof value !== 'string') {
			throw new Error(`Invalid detail snapshot: ${key}`)
		}

		details[key] = value
	}

	return details
}
