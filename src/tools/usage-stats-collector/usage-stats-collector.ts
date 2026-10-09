import * as fs from 'node:fs'
import * as path from 'node:path'

import { allWallets } from '@/data/wallets'
import { getUrl } from '@/schema/url'
import { getErrorMessage } from '@/types/errors'
import { getRepositoryRoot } from '@/utils/codebase'

import { firefoxAddonSlugs } from './firefox-addons'
import {
	apiFetchers,
	collectUsageStats,
	serializeUsageStats,
	USAGE_STATS_FILE,
	utcToday,
	type WalletUsageSources,
} from './usage-stats-collector-lib'

function usage(): never {
	process.stderr.write(`
Usage: pnpm collect:usage-stats [--dry-run]

Fetches wallet usage statistics and writes a dated snapshot to
${USAGE_STATS_FILE}:
  - GitHub stars, for each github.com/<owner>/<repo> URL in a wallet's
    \`urls.repositories\` metadata (GitHub REST API);
  - Firefox add-on users, for wallets listed in
    src/tools/usage-stats-collector/firefox-addons.ts (addons.mozilla.org API).

Set GITHUB_TOKEN to raise the GitHub API rate limit.

Options:
  --dry-run   Print the snapshot instead of writing it.
`)
	process.exit(1)
}

const args = process.argv.slice(2)

if (args.includes('--help') || args.some(arg => arg !== '--dry-run')) {
	usage()
}

const wallets: WalletUsageSources[] = Object.values(allWallets).map(wallet => ({
	id: wallet.metadata.id,
	repositories: (wallet.metadata.urls?.repositories ?? []).map(url => getUrl(url)),
	firefoxAddonSlug: firefoxAddonSlugs[wallet.metadata.id] ?? null,
}))

try {
	const githubToken = process.env.GITHUB_TOKEN

	const { snapshot, skipped } = await collectUsageStats(
		wallets,
		apiFetchers({
			githubToken: githubToken === undefined || githubToken === '' ? null : githubToken,
			timeoutMs: 15_000,
		}),
		utcToday(),
	)

	for (const { id, url } of skipped) {
		process.stderr.write(`[${id}] Skipped ${url}: not a github.com/<owner>/<repo> URL.\n`)
	}

	const serialized = serializeUsageStats(snapshot)

	if (args.includes('--dry-run')) {
		process.stdout.write(serialized)
	} else {
		fs.writeFileSync(path.join(getRepositoryRoot(), USAGE_STATS_FILE), serialized)
		process.stderr.write(
			`Wrote usage statistics for ${Object.keys(snapshot.wallets).length} wallets to ${USAGE_STATS_FILE}.\n`,
		)
	}
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
