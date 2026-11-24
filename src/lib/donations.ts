import { type Config, getEnsName, getPublicClient } from '@wagmi/core'
import { mainnet } from '@wagmi/core/chains'
import { Value } from 'ox'

import { assertCalendarDate, type CalendarDate } from '@/types/date'
import { assertErc55Address, type Erc55Address } from '@/types/utils/ethereum-address'
import { assertTransactionId } from '@/types/utils/ethereum-types'
import { isRecord } from '@/types/utils/record'
import { Enum } from '@/utils/enum'

/** The Walletbeat treasury: a Safe multisig on Ethereum mainnet. */
export const treasuryAddress = assertErc55Address('0x52666AD68156B03EAce67678cDCF1d74bC56201D')

/** Block in which the treasury Safe was deployed. No donation can predate it. */
export const treasuryDeployBlock = 23_422_570n

/** Walletbeat's project page on Giveth. */
export const givethProjectUrl = 'https://www.giveth.io/project/walletbeat'

/** Number of decimals in USD prices and values. */
export const usdPriceDecimals = 8

/**
 * Blocks to stay behind the chain head when taking a snapshot, so that the
 * snapshot does not include blocks that may still be reorganized.
 */
export const snapshotConfirmations = 64n

/** Donors whose total is below this USD amount are not listed (filters dust and address poisoning). */
export const minimumListedDonationUsd = 1

/** Assets that the donation page accepts. */
export enum DonationAsset {
	ETH = 'ETH',
	USDC = 'USDC',
	USDT = 'USDT',
	DAI = 'DAI',
}

export const donationAssets = new Enum<DonationAsset>({
	[DonationAsset.ETH]: true,
	[DonationAsset.USDC]: true,
	[DonationAsset.USDT]: true,
	[DonationAsset.DAI]: true,
})

interface DonationAssetInfo {
	decimals: number
	/** ERC-20 contract on Ethereum mainnet, or `null` for native ETH. */
	token: Erc55Address | null
}

export const donationAssetInfo: Record<DonationAsset, DonationAssetInfo> = {
	[DonationAsset.ETH]: { decimals: 18, token: null },
	[DonationAsset.USDC]: {
		decimals: 6,
		token: assertErc55Address('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
	},
	[DonationAsset.USDT]: {
		decimals: 6,
		token: assertErc55Address('0xdAC17F958D2ee523a2206206994597C13D831ec7'),
	},
	[DonationAsset.DAI]: {
		decimals: 18,
		token: assertErc55Address('0x6B175474E89094C44Da98b954EedeAC495271d0F'),
	},
}

const donationTokens = donationAssets.items.flatMap(asset => {
	const { token } = donationAssetInfo[asset]

	return token === null ? [] : [{ asset, token }]
})

/**
 * Minimal ERC-20 ABI. `transfer` declares no outputs because USDT does not
 * return a value, and the result is never read.
 */
export const erc20Abi = [
	{
		type: 'function',
		name: 'transfer',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'to', type: 'address' },
			{ name: 'amount', type: 'uint256' },
		],
		outputs: [],
	},
	{
		type: 'event',
		name: 'Transfer',
		inputs: [
			{ name: 'from', type: 'address', indexed: true },
			{ name: 'to', type: 'address', indexed: true },
			{ name: 'value', type: 'uint256', indexed: false },
		],
	},
] as const

const erc20TransferEvent = erc20Abi[1]

/** Events that the treasury Safe emits. */
const safeEvents = [
	{
		type: 'event',
		name: 'SafeReceived',
		inputs: [
			{ name: 'sender', type: 'address', indexed: true },
			{ name: 'value', type: 'uint256', indexed: false },
		],
	},
	{
		type: 'event',
		name: 'ExecutionSuccess',
		inputs: [
			{ name: 'txHash', type: 'bytes32', indexed: true },
			{ name: 'payment', type: 'uint256', indexed: false },
		],
	},
	{
		type: 'event',
		name: 'ExecutionFailure',
		inputs: [
			{ name: 'txHash', type: 'bytes32', indexed: true },
			{ name: 'payment', type: 'uint256', indexed: false },
		],
	},
] as const

/** One inbound transfer to the treasury that counts as a donation. */
export interface ScannedTransfer {
	blockNumber: bigint
	txHash: `0x${string}`
	logIndex: number
	sender: Erc55Address
	asset: DonationAsset
	/** Amount in the asset's base units. */
	amount: bigint
}

/** A donation together with when it happened and what it was worth then. */
export interface DonationTransfer extends ScannedTransfer {
	/** UTC calendar date of the donation's block. */
	date: CalendarDate
	/** USD price of one unit of `asset` at the time of the donation, with `usdPriceDecimals` decimals. */
	usdPrice: bigint
}

/** Donations found on-chain up to and including `toBlock`. */
export interface DonationsSnapshot {
	toBlock: bigint
	transfers: DonationTransfer[]
	/** Primary ENS name of each sender at `toBlock`, or `null` if it has none. */
	ensNames: Record<Erc55Address, string | null>
}

function isDecimalString(value: unknown): value is string {
	return typeof value === 'string' && /^[0-9]+$/.test(value)
}

function parseTransfer(value: unknown): DonationTransfer {
	if (
		!isRecord(value) ||
		!isDecimalString(value.blockNumber) ||
		typeof value.txHash !== 'string' ||
		typeof value.logIndex !== 'number' ||
		typeof value.sender !== 'string' ||
		!isDecimalString(value.amount) ||
		typeof value.date !== 'string' ||
		!isDecimalString(value.usdPrice)
	) {
		throw new Error(`Invalid donation transfer: ${JSON.stringify(value)}`)
	}

	return {
		blockNumber: BigInt(value.blockNumber),
		txHash: assertTransactionId(value.txHash),
		logIndex: value.logIndex,
		sender: assertErc55Address(value.sender),
		asset: donationAssets.assert(value.asset),
		amount: BigInt(value.amount),
		date: assertCalendarDate(value.date),
		usdPrice: BigInt(value.usdPrice),
	}
}

/** Parse a snapshot from its JSON form, validating every field. */
export function parseDonationsSnapshot(json: unknown): DonationsSnapshot {
	if (
		!isRecord(json) ||
		json.treasury !== treasuryAddress ||
		!isDecimalString(json.toBlock) ||
		!Array.isArray(json.transfers) ||
		!isRecord(json.ensNames)
	) {
		throw new Error('Invalid donations snapshot')
	}

	const ensNames: Record<Erc55Address, string | null> = {}

	for (const [address, name] of Object.entries(json.ensNames)) {
		if (name !== null && typeof name !== 'string') {
			throw new Error(`Invalid ENS name for ${address} in donations snapshot`)
		}

		ensNames[assertErc55Address(address)] = name
	}

	return {
		toBlock: BigInt(json.toBlock),
		transfers: json.transfers.map(parseTransfer),
		ensNames,
	}
}

/** Serialize a snapshot to the JSON form that `parseDonationsSnapshot` reads. */
export function serializeDonationsSnapshot(snapshot: DonationsSnapshot): string {
	const json = {
		treasury: treasuryAddress,
		toBlock: snapshot.toBlock.toString(),
		transfers: snapshot.transfers.map(transfer => ({
			blockNumber: transfer.blockNumber.toString(),
			txHash: transfer.txHash,
			logIndex: transfer.logIndex,
			sender: transfer.sender,
			asset: transfer.asset,
			amount: transfer.amount.toString(),
			date: transfer.date,
			usdPrice: transfer.usdPrice.toString(),
		})),
		ensNames: Object.fromEntries(
			Object.entries(snapshot.ensNames).sort(([a], [b]) => a.localeCompare(b)),
		),
	}

	return `${JSON.stringify(json, null, '\t')}\n`
}

function mainnetClient(config: Config) {
	const client = getPublicClient(config, { chainId: mainnet.id })

	if (client === undefined) {
		throw new Error('The wagmi config does not include Ethereum mainnet')
	}

	return client
}

/** Ask the RPC endpoint behind `config` which chain it serves. */
export async function rpcChainId(config: Config): Promise<number> {
	return await mainnetClient(config).getChainId()
}

/** Latest block that is deep enough to include in a snapshot. */
export async function confirmedBlockNumber(config: Config): Promise<bigint> {
	return (await mainnetClient(config).getBlockNumber()) - snapshotConfirmations
}

/** UTC calendar date of each block. */
export async function blockDates(
	config: Config,
	blockNumbers: Iterable<bigint>,
): Promise<Map<bigint, CalendarDate>> {
	const client = mainnetClient(config)
	const dates = new Map<bigint, CalendarDate>()

	for (const blockNumber of new Set(blockNumbers)) {
		const { timestamp } = await client.getBlock({ blockNumber })

		dates.set(
			blockNumber,
			assertCalendarDate(new Date(Number(timestamp) * 1000).toISOString().slice(0, 10)),
		)
	}

	return dates
}

/** USD price of one unit of a stablecoin, with `usdPriceDecimals` decimals. */
const stablecoinUsdPrice = 10n ** BigInt(usdPriceDecimals)

/**
 * Date and price each scanned transfer. Stablecoins count as 1 USD; ETH uses
 * `ethUsdPrice` for the transfer's date.
 */
export async function priceTransfers(
	config: Config,
	scanned: ScannedTransfer[],
	ethUsdPrice: (date: CalendarDate) => Promise<bigint>,
): Promise<DonationTransfer[]> {
	const dates = await blockDates(
		config,
		scanned.map(transfer => transfer.blockNumber),
	)
	const priced: DonationTransfer[] = []

	for (const transfer of scanned) {
		const date = dates.get(transfer.blockNumber)

		if (date === undefined) {
			throw new Error(`Missing date for block ${transfer.blockNumber}`)
		}

		priced.push({
			...transfer,
			date,
			usdPrice: transfer.asset === DonationAsset.ETH ? await ethUsdPrice(date) : stablecoinUsdPrice,
		})
	}

	return priced
}

/** Resolve the primary ENS name of each address. */
export async function resolveEnsNames(
	config: Config,
	addresses: Iterable<Erc55Address>,
): Promise<Record<Erc55Address, string | null>> {
	const names: Record<Erc55Address, string | null> = {}

	for (const address of addresses) {
		names[address] = await getEnsName(config, { chainId: mainnet.id, address })
	}

	return names
}

/**
 * Find the donations in one block range.
 *
 * A transfer counts as a donation only when the treasury took no action in
 * the same transaction. This leaves out swap output, refunds, and other
 * transactions that the Safe executed or that moved tokens out of it.
 */
async function scanRange(
	config: Config,
	fromBlock: bigint,
	toBlock: bigint,
): Promise<ScannedTransfer[]> {
	const client = mainnetClient(config)
	const [safeLogs, inboundLogs, outboundLogs] = await Promise.all([
		client.getLogs({
			address: treasuryAddress,
			events: safeEvents,
			fromBlock,
			toBlock,
		}),
		client.getLogs({
			address: donationTokens.map(({ token }) => token),
			event: erc20TransferEvent,
			args: { to: treasuryAddress },
			fromBlock,
			toBlock,
			strict: true,
		}),
		client.getLogs({
			event: erc20TransferEvent,
			args: { from: treasuryAddress },
			fromBlock,
			toBlock,
			strict: true,
		}),
	])

	// Any treasury log other than a decoded SafeReceived marks the transaction as
	// one the treasury took part in, so a log that fails to decode is never
	// mistaken for a donation.
	const treasuryActedTxs = new Set<string>(
		[...safeLogs.filter(log => log.eventName !== 'SafeReceived'), ...outboundLogs].map(
			log => log.transactionHash,
		),
	)
	const transfers: ScannedTransfer[] = []

	for (const log of safeLogs) {
		if (log.eventName !== 'SafeReceived' || treasuryActedTxs.has(log.transactionHash)) {
			continue
		}

		const { sender, value } = log.args

		if (sender === undefined || value === undefined) {
			throw new Error(`Could not decode SafeReceived log in ${log.transactionHash}`)
		}

		transfers.push({
			blockNumber: log.blockNumber,
			txHash: log.transactionHash,
			logIndex: log.logIndex,
			sender: assertErc55Address(sender),
			asset: DonationAsset.ETH,
			amount: value,
		})
	}

	for (const log of inboundLogs) {
		if (treasuryActedTxs.has(log.transactionHash)) {
			continue
		}

		const token = donationTokens.find(
			({ token }) => token.toLowerCase() === log.address.toLowerCase(),
		)

		if (token === undefined) {
			throw new Error(`Unexpected token in donation logs: ${log.address}`)
		}

		transfers.push({
			blockNumber: log.blockNumber,
			txHash: log.transactionHash,
			logIndex: log.logIndex,
			sender: assertErc55Address(log.args.from),
			asset: token.asset,
			amount: log.args.value,
		})
	}

	return transfers
}

/**
 * Find all donations in `[fromBlock, toBlock]`.
 *
 * RPC endpoints limit how many blocks one `eth_getLogs` call may span, and
 * the limit differs between providers. The range is split into chunks of
 * `initialChunkSize` blocks, and a chunk that fails is retried in halves.
 */
export async function scanDonations(
	config: Config,
	fromBlock: bigint,
	toBlock: bigint,
	initialChunkSize: bigint,
	onProgress: (scannedToBlock: bigint) => void = () => {},
): Promise<ScannedTransfer[]> {
	const transfers: ScannedTransfer[] = []
	let chunkSize = initialChunkSize
	let start = fromBlock

	while (start <= toBlock) {
		const end = start + chunkSize - 1n < toBlock ? start + chunkSize - 1n : toBlock

		try {
			transfers.push(...(await scanRange(config, start, end)))
		} catch (error) {
			if (chunkSize === 1n) {
				throw error
			}

			chunkSize = chunkSize / 2n
			continue
		}

		onProgress(end)
		start = end + 1n
	}

	return sortTransfers(transfers)
}

function sortTransfers<T extends ScannedTransfer>(transfers: T[]): T[] {
	return transfers.toSorted((a, b) =>
		a.blockNumber === b.blockNumber
			? a.logIndex - b.logIndex
			: a.blockNumber < b.blockNumber
				? -1
				: 1,
	)
}

/** Add newly scanned transfers to a snapshot, ignoring any already present. */
export function mergeTransfers(
	existing: DonationTransfer[],
	added: DonationTransfer[],
): DonationTransfer[] {
	const key = (transfer: ScannedTransfer) => `${transfer.txHash}:${transfer.logIndex}`
	const seen = new Set(existing.map(key))

	return sortTransfers([...existing, ...added.filter(transfer => !seen.has(key(transfer)))])
}

/** Total donated by one address. */
export interface DonorTotal {
	sender: Erc55Address
	amounts: Record<DonationAsset, bigint>
	/** Total value in USD at the time of each donation, with `usdPriceDecimals` decimals. */
	usdValue: bigint
	donationCount: number
}

/** USD value of a donation at the time it was made, with `usdPriceDecimals` decimals. */
function usdValue(transfer: DonationTransfer): bigint {
	return (
		(transfer.amount * transfer.usdPrice) /
		10n ** BigInt(donationAssetInfo[transfer.asset].decimals)
	)
}

/**
 * Rank donors by total USD value, leaving out `excludedSenders` (Walletbeat's
 * own and known addresses) and totals below `minimumListedDonationUsd`.
 */
export function rankDonors(
	transfers: DonationTransfer[],
	excludedSenders: ReadonlySet<Erc55Address>,
): DonorTotal[] {
	const totals = new Map<Erc55Address, DonorTotal>()

	for (const transfer of transfers) {
		if (excludedSenders.has(transfer.sender)) {
			continue
		}

		const total = totals.get(transfer.sender) ?? {
			sender: transfer.sender,
			amounts: donationAssets.fullRecord<bigint>({}, 0n),
			usdValue: 0n,
			donationCount: 0,
		}

		total.amounts[transfer.asset] += transfer.amount
		total.usdValue += usdValue(transfer)
		total.donationCount += 1
		totals.set(transfer.sender, total)
	}

	const minimum = BigInt(minimumListedDonationUsd) * 10n ** BigInt(usdPriceDecimals)

	return [...totals.values()]
		.filter(total => total.usdValue >= minimum)
		.sort((a, b) => (a.usdValue === b.usdValue ? 0 : a.usdValue > b.usdValue ? -1 : 1))
}

/** Number of fraction digits shown in formatted asset amounts. */
const shownFractionDigits = 4

/** Format an amount in base units as a human-readable decimal with at most `shownFractionDigits`. */
export function formatAssetAmount(asset: DonationAsset, amount: bigint): string {
	const [whole, fraction = ''] = Value.format(amount, donationAssetInfo[asset].decimals).split('.')
	const trimmed = fraction.slice(0, shownFractionDigits).replace(/0+$/, '')

	return `${BigInt(whole).toLocaleString('en-US')}${trimmed === '' ? '' : `.${trimmed}`}`
}

/** Format a USD value with `usdPriceDecimals` decimals as `$1,234`, showing cents only below 100 USD when there are any. */
export function formatUsd(value: bigint): string {
	const dollars = Number(value / 10n ** BigInt(usdPriceDecimals - 2)) / 100
	const fractionDigits = dollars >= 100 || Number.isInteger(dollars) ? 0 : 2

	return dollars.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	})
}

/** Parse a user-entered decimal amount into base units, or `null` if it is not a positive number. */
export function parseAssetAmount(asset: DonationAsset, input: string): bigint | null {
	const trimmed = input.trim()
	const { decimals } = donationAssetInfo[asset]

	if (!/^[0-9]*\.?[0-9]+$/.test(trimmed) || (trimmed.split('.')[1] ?? '').length > decimals) {
		return null
	}

	const amount = Value.from(trimmed, decimals)

	return amount > 0n ? amount : null
}
