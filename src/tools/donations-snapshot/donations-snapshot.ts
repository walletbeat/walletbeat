import fs from 'node:fs'
import path from 'node:path'

import { createConfig, http } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { cac } from 'cac'
import { Value } from 'ox'

import {
	confirmedBlockNumber,
	DonationAsset,
	donationAssets,
	type DonationsSnapshot,
	mergeTransfers,
	parseDonationsSnapshot,
	priceTransfers,
	resolveEnsNames,
	rpcChainId,
	scanDonations,
	serializeDonationsSnapshot,
	treasuryDeployBlock,
	usdPriceDecimals,
} from '@/lib/donations'
import { fetchPrices, type PriceDataRow } from '@/tools/treasury-markdown-updater/crypto-prices-lib'
import { parseTSV } from '@/tools/treasury-markdown-updater/treasury-markdown-updater-lib'
import { assertCalendarDate, type CalendarDate } from '@/types/date'
import { getErrorMessage } from '@/types/errors'
import { getRepositoryRoot } from '@/utils/codebase'

/** Path of the snapshot, relative to the repository root. */
const snapshotPath = 'governance/treasury/donations.json'

/** Daily asset prices recorded for the treasury report, relative to the repository root. */
const priceDataPath = 'governance/treasury/price-data.tsv'

/** Environment variable that names the RPC endpoint when `--rpc-url` is not given. */
const rpcUrlEnv = 'RPC_URL'

function log(message: string): void {
	process.stderr.write(`${message}\n`)
}

async function updateSnapshot(options: { rpcUrl: string; full: boolean }): Promise<void> {
	const config = createConfig({
		chains: [mainnet],
		transports: { [mainnet.id]: http(options.rpcUrl, { timeout: 120_000 }) },
	})

	if ((await rpcChainId(config)) !== mainnet.id) {
		throw new Error(`${options.rpcUrl} is not an Ethereum mainnet RPC endpoint`)
	}

	const fullPath = path.join(getRepositoryRoot(), snapshotPath)
	const previous =
		options.full || !fs.existsSync(fullPath)
			? null
			: parseDonationsSnapshot(JSON.parse(fs.readFileSync(fullPath, 'utf-8')))
	const fromBlock = previous === null ? treasuryDeployBlock : previous.toBlock + 1n
	const toBlock = await confirmedBlockNumber(config)

	log(`Scanning blocks ${fromBlock} to ${toBlock}...`)

	const scanned = await scanDonations(config, fromBlock, toBlock, toBlock - fromBlock + 1n, block =>
		log(`  scanned up to block ${block}`),
	)

	log('Pricing donations at the USD price of their day...')

	// Daily prices already on record are reused before asking CoinGecko, whose
	// free API only serves the last 365 days.
	const recordedPrices = parseTSV<PriceDataRow>(
		fs.readFileSync(path.join(getRepositoryRoot(), priceDataPath), 'utf-8'),
	)
		.filter(
			row =>
				donationAssets.is(row.Asset) &&
				row.Asset === DonationAsset.ETH &&
				row.Denomination === 'USD',
		)
		.map((row): [CalendarDate, bigint] => [
			assertCalendarDate(row.Date),
			Value.from(row.Value, usdPriceDecimals),
		])
	const dailyEthPrices = new Map<CalendarDate, bigint>([
		...recordedPrices,
		...(previous?.transfers ?? [])
			.filter(transfer => transfer.asset === DonationAsset.ETH)
			.map((transfer): [CalendarDate, bigint] => [transfer.date, transfer.usdPrice]),
	])
	const added = await priceTransfers(config, scanned, async date => {
		const known = dailyEthPrices.get(date)

		if (known !== undefined) {
			return known
		}

		const [row] = await fetchPrices([[date, DonationAsset.ETH]])
		const price = Value.from(row.Value, usdPriceDecimals)

		dailyEthPrices.set(date, price)

		return price
	})
	const transfers = mergeTransfers(previous?.transfers ?? [], added)

	log(`Found ${added.length} new donation transfers (${transfers.length} in total).`)
	log('Resolving ENS names...')

	const snapshot: DonationsSnapshot = {
		toBlock,
		transfers,
		ensNames: await resolveEnsNames(config, new Set(transfers.map(transfer => transfer.sender))),
	}

	fs.writeFileSync(fullPath, serializeDonationsSnapshot(snapshot))
	log(`Wrote ${snapshotPath}.`)
}

/**
 * CLI that records the donations to the Walletbeat treasury, as found in
 * on-chain logs, into a snapshot that the donation page reads.
 */
const cli = cac('donations-snapshot')

cli
	.command('', 'Update the donations snapshot with blocks added since the last update')
	.option(
		'--rpc-url <url>',
		`Ethereum mainnet RPC endpoint to query (or set ${rpcUrlEnv}). It must serve eth_getLogs over old blocks.`,
	)
	.option('--full', 'Scan again from the treasury deployment block instead of the last snapshot')
	.action(async (options: { rpcUrl?: string; full?: boolean }) => {
		try {
			const rpcUrl = options.rpcUrl ?? process.env[rpcUrlEnv]

			if (rpcUrl === undefined || rpcUrl === '') {
				throw new Error(`Give an Ethereum mainnet RPC endpoint with --rpc-url or ${rpcUrlEnv}`)
			}

			await updateSnapshot({
				rpcUrl,
				full: options.full ?? false,
			})
		} catch (error) {
			process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
			process.exit(1)
		}
	})

cli.help()

try {
	cli.parse()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
