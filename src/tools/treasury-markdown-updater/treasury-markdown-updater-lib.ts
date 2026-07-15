import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, optimize } from 'svgo'

import type { NonEmptyArray } from '@/types/utils/non-empty'
import { Enum } from '@/utils/enum'

import { fetchPrices, normalizeAsset, type PriceDataRow, priceKey } from './crypto-prices-lib'

// --- Treasury Category Enum ---

/** Categories used to classify treasury transactions. */
export enum TreasuryCategory {
	'expense:swag' = 'expense:swag',
	'expense:travel' = 'expense:travel',
	'expense:wallet' = 'expense:wallet',
	grant = 'grant',
	'hosting-infra' = 'hosting-infra',
	'ignored:multi_tx_swap' = 'ignored:multi_tx_swap',
	'ignored:reverted' = 'ignored:reverted',
	'labor:branding' = 'labor:branding',
	'labor:comms' = 'labor:comms',
	'labor:data_entry' = 'labor:data_entry',
	'labor:dev' = 'labor:dev',
	multi_step_swap = 'multi_step_swap',
	operational = 'operational',
	'services:email' = 'services:email',
	'services:social_media' = 'services:social_media',
	swap = 'swap',
	test = 'test',
}

/** Enum for `TreasuryCategory`. */
export const treasuryCategory = new Enum<TreasuryCategory>({
	[TreasuryCategory['expense:swag']]: true,
	[TreasuryCategory['expense:travel']]: true,
	[TreasuryCategory['expense:wallet']]: true,
	[TreasuryCategory.grant]: true,
	[TreasuryCategory['hosting-infra']]: true,
	[TreasuryCategory['ignored:multi_tx_swap']]: true,
	[TreasuryCategory['ignored:reverted']]: true,
	[TreasuryCategory['labor:branding']]: true,
	[TreasuryCategory['labor:comms']]: true,
	[TreasuryCategory['labor:data_entry']]: true,
	[TreasuryCategory['labor:dev']]: true,
	[TreasuryCategory.multi_step_swap]: true,
	[TreasuryCategory.operational]: true,
	[TreasuryCategory['services:email']]: true,
	[TreasuryCategory['services:social_media']]: true,
	[TreasuryCategory.swap]: true,
	[TreasuryCategory.test]: true,
})

// --- Interfaces ---

export interface TreasuryMarkdownUpdaterConfig {
	addressesPath: string
	chartOutputPath: string
	operationsPath: string
	outputPath: string
	priceDataPath: string
	quiet: boolean
	test: boolean
}

interface AddressRow {
	Address: string
	Name: string
	Control: string
	Description: string
}

interface OperationRow {
	Date: string
	From: string
	To: string
	Amount: string
	Purpose: string
	ID: string
}

interface Logger {
	info(message: string): void
}

// --- Helpers ---

/**
 * Reads a file and returns its content as a string.
 * Throws an error if reading fails, allowing the caller to handle logging/exiting.
 */
function readFile(filePath: string): string {
	return fs.readFileSync(filePath, 'utf-8')
}

/**
 * Parses a TSV string into an array of objects.
 * Uses strict typing avoiding 'any'.
 */
function parseTSV<T>(content: string): T[] {
	const lines = content.trim().split('\n')

	if (lines.length < 2) {
		return []
	} // Header + Data required

	const headers = lines[0].split('\t').map(h => h.trim())
	const result: T[] = []

	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i].split('\t')
		const rowData: Record<string, string> = {}

		headers.forEach((header, index) => {
			rowData[header] = currentLine[index] ? currentLine[index].trim() : ''
		})

		// Cast to unknown first to satisfy compiler when casting to generic T
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We assume all lines conform to the schema.
		result.push(rowData as unknown as T)
	}

	return result
}

/**
 * Escapes characters that might break Markdown tables (specifically pipes).
 */
function escapeMd(text: string): string {
	return text.replace(/\|/g, '\\|')
}

/**
 * Generates a pretty-printed Markdown table with aligned columns.
 */
function generateAlignedTable(headers: string[], dataRows: string[][]): string {
	// 1. Calculate the maximum width for each column
	// Initialize with header lengths
	const colWidths = headers.map(h => h.length)

	// Update widths based on data content
	dataRows.forEach(row => {
		row.forEach((cell, index) => {
			if (cell.length > colWidths[index]) {
				colWidths[index] = cell.length
			}
		})
	})

	// 2. Helper to format a row
	const formatRow = (rowItems: string[]): string => {
		const inner = rowItems.map((item, i) => item.padEnd(colWidths[i])).join(' | ')

		return `| ${inner} |`
	}

	// 3. Generate Header
	const headerLine = formatRow(headers)

	// 4. Generate Separator (e.g., | --- | --- |)
	const separatorLine = `| ${colWidths.map(w => '-'.repeat(w)).join(' | ')} |`

	// 5. Generate Body
	const bodyLines = dataRows.map(row => formatRow(row))

	return [headerLine, separatorLine, ...bodyLines].join('\n')
}

function getAddressRowByName(name: string, rows: AddressRow[]): AddressRow {
	for (const addressRow of rows) {
		if (addressRow.Name === name) {
			return addressRow
		}
	}

	throw new Error(`No address with label "${name}"`)
}

function markdownAddressLink(addressRow: AddressRow, label: string, monospace: boolean): string {
	const components = addressRow.Address.split(':')
	const chain = components[0]
	const addr = components[1]
	const m = monospace ? '`' : ''

	switch (chain) {
		case 'eth':
			return `[${m}${escapeMd(label)}${m}](https://eth.blockscout.com/address/${escapeMd(addr)})`
		case 'fil':
			return `[${m}${escapeMd(label)}${m}](https://filscan.io/en/address/${escapeMd(addr)}/)`
		case 'btc':
			return `[${m}${escapeMd(label)}${m}](https://mempool.space/address/${escapeMd(addr)})`
		default:
			throw new Error(`Invalid chain "${chain}"`)
	}
}

/**
 * Generates the Addresses Markdown Table
 */
function generateAddressesTable(rows: AddressRow[]): string {
	const headers = ['Name', 'Address', 'Controlled by', 'Description']

	// Pre-process rows into final string format to calculate lengths correctly
	const formattedRows = rows.map(row => {
		return [
			`\`${escapeMd(row.Name)}\``,
			markdownAddressLink(row, row.Address, true),
			escapeMd(row.Control),
			escapeMd(row.Description),
		]
	})

	return generateAlignedTable(headers, formattedRows)
}

/** Returns a human-readable label for a treasury category. */
export function categoryLabel(category: TreasuryCategory): string {
	switch (category) {
		case TreasuryCategory['expense:swag']:
			return 'Merch'
		case TreasuryCategory['expense:travel']:
			return 'Travel'
		case TreasuryCategory['expense:wallet']:
			return 'Wallet'
		case TreasuryCategory.grant:
			return 'Grant'
		case TreasuryCategory['hosting-infra']:
			return 'Hosting'
		case TreasuryCategory['ignored:multi_tx_swap']:
			return 'Swap'
		case TreasuryCategory['ignored:reverted']:
			return '(reverted)'
		case TreasuryCategory['labor:branding']:
			return 'Branding'
		case TreasuryCategory['labor:comms']:
			return 'Comms'
		case TreasuryCategory['labor:data_entry']:
			return 'Data entry'
		case TreasuryCategory['labor:dev']:
			return 'Dev'
		case TreasuryCategory.multi_step_swap:
			return 'Swap'
		case TreasuryCategory.operational:
			return 'Ops'
		case TreasuryCategory['services:email']:
			return 'Email'
		case TreasuryCategory['services:social_media']:
			return 'Social media'
		case TreasuryCategory.swap:
			return 'Swap'
		case TreasuryCategory.test:
			return 'Test'
	}
}

/** Determines if a category should appear in the expense breakdown chart. */
export function includeInExpenseBreakdown(category: TreasuryCategory): boolean {
	switch (category) {
		case TreasuryCategory['expense:swag']:
			return true
		case TreasuryCategory['expense:travel']:
			return true
		case TreasuryCategory['expense:wallet']:
			return true
		case TreasuryCategory['labor:branding']:
			return true
		case TreasuryCategory['labor:comms']:
			return true
		case TreasuryCategory['labor:data_entry']:
			return true
		case TreasuryCategory['labor:dev']:
			return true
		case TreasuryCategory['services:email']:
			return true
		case TreasuryCategory['services:social_media']:
			return true
		case TreasuryCategory['hosting-infra']:
			return true
		case TreasuryCategory.operational:
			return true
		case TreasuryCategory.test:
			return true
		case TreasuryCategory.grant:
			return false
		case TreasuryCategory.swap:
			return false
		case TreasuryCategory.multi_step_swap:
			return false
		case TreasuryCategory['ignored:multi_tx_swap']:
			return false
		case TreasuryCategory['ignored:reverted']:
			return false
	}
}

/** Formats a parsed amount for display in the markdown table. */
function formatAmountForTable(parsed: ParsedAmount): string {
	switch (parsed.type) {
		case 'zero':
			return '(zero)'
		case 'swap':
			return `${parsed.input.value} ${parsed.input.asset} → ${parsed.output.value} ${parsed.output.asset}`
		case 'expense': {
			const parts = parsed.assets.map(
				asset => `${asset.value} ${asset.asset} [${categoryLabel(asset.category)}]`,
			)

			return parts.join(' + ')
		}
	}
}

/**
 * Generates the Operations Markdown Table
 */
function generateOperationsTable(operations: OperationRow[], addresses: AddressRow[]): string {
	const headers = ['Date', 'From', 'To', 'Amount', 'Purpose', 'Transaction ID']

	// Pre-process rows into final string format
	const formattedRows = operations.map(operation => {
		const txLink = (() => {
			if (operation.ID.startsWith('fil:')) {
				return `[\`${operation.ID.substring(4, 14)}...\`](https://filscan.io/en/message/${escapeMd(operation.ID.substring(4))}/)`
			}

			if (operation.ID.startsWith('0x')) {
				return `[\`${operation.ID.substring(0, 10)}...\`](https://eth.blockscout.com/tx/${escapeMd(operation.ID)})`
			}

			if (operation.ID.startsWith('btc:')) {
				return `[\`${operation.ID.substring(4, 14)}...\`](https://mempool.space/tx/${escapeMd(operation.ID.substring(4))})`
			}

			return escapeMd(operation.ID)
		})()

		const parsedAmount = parseAmounts(operation.Amount)
		const formattedAmount = formatAmountForTable(parsedAmount)

		return [
			escapeMd(operation.Date),
			`${markdownAddressLink(getAddressRowByName(operation.From, addresses), operation.From, true)}`,
			`${markdownAddressLink(getAddressRowByName(operation.To, addresses), operation.To, true)}`,
			`\`${escapeMd(formattedAmount)}\``,
			escapeMd(operation.Purpose),
			txLink,
		]
	})

	return generateAlignedTable(headers, formattedRows)
}

// --- Price Data ---

/** A parsed monetary amount: a numeric value, its asset symbol, and a required category. */
interface AssetAmount {
	value: number
	asset: string
	category: TreasuryCategory
}

/** A parsed swap: input and output asset amounts, both categorized as "swap". */
interface ParsedSwap {
	type: 'swap'
	category: 'swap'
	input: AssetAmount
	output: AssetAmount
}

/** A parsed expense: one or more asset amounts, each with a required category. */
interface ParsedExpense {
	type: 'expense'
	assets: NonEmptyArray<AssetAmount>
}

/** A parsed zero amount: the cell contains a bare "0" with no asset or category. */
interface ParsedZeroAmount {
	type: 'zero'
}

/** Union of all parsed amount types. */
export type ParsedAmount = ParsedSwap | ParsedExpense | ParsedZeroAmount

/**
 * Parse the contents of an "Amount" cell into one or more asset amounts.
 *
 * Supported formats:
 *   - Zero:            "0"
 *   - Simple expense:  "0.05 ETH [dev]" or "0.05 ETH"
 *   - Multi expense:   "0.05 ETH [dev] + 100 USDC [comms]"
 *   - Swap:            "0.05 ETH → 0.00157093 BTC"
 *
 * Categories must match kebab-case identifiers (letters, digits, hyphens).
 * Throws when no amounts can be parsed or the format is unrecognized.
 */
export function parseAmounts(cellContents: string): ParsedAmount {
	const trimmed = cellContents.trim()

	// Zero amount: bare "0" with no unit, category, or arrow
	if (trimmed === '0') {
		return { type: 'zero' }
	}

	// Try swap format first (contains →)
	if (trimmed.includes(' → ')) {
		const parts = trimmed.split(' → ')

		if (parts.length !== 2) {
			throw new Error(`Invalid swap format (expected exactly one →): "${cellContents}"`)
		}

		// Swaps must NOT contain categories
		if (parts[0].includes('[') || parts[1].includes('[')) {
			throw new Error(`Swap amounts must not contain categories: "${cellContents}"`)
		}

		const input = parseSimpleAmount(parts[0].trim(), TreasuryCategory.swap)
		const output = parseSimpleAmount(parts[1].trim(), TreasuryCategory.swap)

		return { type: 'swap', category: TreasuryCategory.swap, input, output }
	}

	// Try multi-expense format (contains " + ")
	if (trimmed.includes(' + ')) {
		const parts = trimmed.split(' + ')
		const assets: [AssetAmount, ...AssetAmount[]] = [
			parseSimpleAmountWithCategory(parts[0].trim()),
			...parts.slice(1).map(part => parseSimpleAmountWithCategory(part.trim())),
		]

		return { type: 'expense', assets }
	}

	// Simple amount (with optional category)
	const asset = parseSimpleAmountWithCategory(trimmed)

	return { type: 'expense', assets: [asset] }
}

/**
 * Parse a simple amount string like "0.05 ETH" (no category, no →, no +).
 * The category is provided externally since the format doesn't include one.
 * Throws if the format is invalid or the category is not a valid enum value.
 */
function parseSimpleAmount(text: string, category: TreasuryCategory): AssetAmount {
	const trimmed = text.trim()
	const match = trimmed.match(/^([\d,]+(?:\.\d+)?)\s+([A-Z][a-zA-Z]*)$/)

	if (!match) {
		throw new Error(`Cannot parse amount: "${text}"`)
	}

	treasuryCategory.assert(category)

	return {
		value: parseFloat(match[1].replace(/,/g, '')),
		asset: match[2],
		category,
	}
}

/**
 * Parse a simple amount string with a required category like "0.05 ETH [dev]".
 * Throws if the format is invalid or the category is not a valid enum value.
 */
function parseSimpleAmountWithCategory(text: string): AssetAmount {
	const trimmed = text.trim()
	const match = trimmed.match(/^([\d,]+(?:\.\d+)?)\s+([A-Z][a-zA-Z]*)\s+\[([a-z][a-z0-9_:~-]*)\]$/)

	if (!match) {
		throw new Error(`Cannot parse amount with category: "${text}"`)
	}

	const category = treasuryCategory.assert(match[3])

	return {
		value: parseFloat(match[1].replace(/,/g, '')),
		asset: match[2],
		category,
	}
}

/**
 * Extract all unique (date, asset) pairs from operations.
 * Derives from parseAmounts, normalizing assets via normalizeAsset.
 */
function extractAssetPairs(operations: OperationRow[]): Map<string, Set<string>> {
	const pairs = new Map<string, Set<string>>()

	for (const op of operations) {
		const parsed = parseAmounts(op.Amount)

		// Zero amounts contribute no assets
		if (parsed.type === 'zero') {
			continue
		}

		const assets = new Set<string>()

		const amountEntries = parsed.type === 'swap' ? [parsed.input, parsed.output] : parsed.assets

		for (const { asset } of amountEntries) {
			assets.add(normalizeAsset(asset))
		}

		if (!pairs.has(op.Date)) {
			pairs.set(op.Date, new Set())
		}

		for (const asset of assets) {
			pairs.get(op.Date)!.add(asset)
		}
	}

	return pairs
}

/**
 * Read existing price-data.tsv into a Map keyed by "date|asset".
 * Returns an empty Map if the file doesn't exist or has only a header.
 */
function readPriceData(filePath: string): Map<string, PriceDataRow> {
	const existing = new Map<string, PriceDataRow>()

	if (!fs.existsSync(filePath)) {
		return existing
	}

	const content = fs.readFileSync(filePath, 'utf-8').trim()
	const lines = content.split('\n')

	if (lines.length <= 1) {
		return existing
	}

	const headers = lines[0].split('\t').map(h => h.trim())

	for (let i = 1; i < lines.length; i++) {
		const cols = lines[i].split('\t')
		const row: Record<string, string> = {}

		headers.forEach((h, idx) => {
			row[h] = cols[idx]?.trim() ?? ''
		})

		const priceRow = {
			Date: row['Date'],
			Asset: row['Asset'],
			Value: row['Value'],
			Denomination: row['Denomination'],
		}

		existing.set(priceKey(priceRow.Date, priceRow.Asset), priceRow)
	}

	return existing
}

/**
 * Write price-data.tsv with a header and sorted entries.
 */
function writePriceData(filePath: string, entries: PriceDataRow[]): void {
	// Sort by date ascending, then asset ascending
	const sorted = [...entries].sort((a, b) => {
		const dateCmp = a.Date.localeCompare(b.Date)

		if (dateCmp !== 0) {
			return dateCmp
		}

		return a.Asset.localeCompare(b.Asset)
	})

	const lines = ['Date\tAsset\tValue\tDenomination']

	for (const row of sorted) {
		lines.push(`${row.Date}\t${row.Asset}\t${row.Value}\t${row.Denomination}`)
	}

	fs.writeFileSync(filePath, lines.join('\n') + '\n')
}

/**
 * Check that price-data.tsv has exactly the entries needed by operations:
 * no missing and no extra entries. Throws with details if mismatches exist.
 */
function checkPriceDataCompleteness(
	operations: OperationRow[],
	priceData: Map<string, PriceDataRow>,
): void {
	const needed = extractAssetPairs(operations)
	const missing: string[] = []
	const extra: string[] = []

	for (const [date, assets] of needed) {
		for (const asset of assets) {
			const key = priceKey(date, asset)

			if (!priceData.has(key)) {
				missing.push(`${date} ${asset}`)
			}
		}
	}

	for (const key of priceData.keys()) {
		const [date, asset] = key.split('|')
		const neededAssets = needed.get(date)

		if (!neededAssets || !neededAssets.has(asset)) {
			extra.push(`${date} ${asset}`)
		}
	}

	if (missing.length > 0 || extra.length > 0) {
		const parts: string[] = []

		if (missing.length > 0) {
			parts.push(`missing ${missing.length} entries: ${missing.join(', ')}`)
		}

		if (extra.length > 0) {
			parts.push(`extra ${extra.length} entries: ${extra.join(', ')}`)
		}

		throw new Error(`Price data mismatch: ${parts.join('; ')}. Run without --test to fix.`)
	}
}

/**
 * Sync price-data.tsv to match operations: add missing entries by fetching from
 * CoinGecko, and remove entries that are no longer needed.
 * Existing entries are preserved as-is (not re-fetched).
 */
async function populatePriceData(
	operations: OperationRow[],
	priceDataPath: string,
	logger: Logger,
): Promise<void> {
	const needed = extractAssetPairs(operations)
	const existing = readPriceData(priceDataPath)

	// Collect missing (date, asset) pairs
	const missing: [string, string][] = []
	const extra: string[] = []

	for (const [date, assets] of needed) {
		for (const asset of assets) {
			const key = priceKey(date, asset)

			if (!existing.has(key)) {
				missing.push([date, asset])
			}
		}
	}

	for (const key of existing.keys()) {
		const [date, asset] = key.split('|')
		const neededAssets = needed.get(date)

		if (!neededAssets || !neededAssets.has(asset)) {
			extra.push(key)
		}
	}

	// Remove extra entries from existing
	for (const key of extra) {
		existing.delete(key)
	}

	if (missing.length === 0 && extra.length === 0) {
		return
	}

	const messages: string[] = []

	if (missing.length > 0) {
		logger.info(`Fetching prices for ${missing.length} missing entries...`)

		// Fetch missing prices (sequential to respect rate limits)
		const newEntries = await fetchPrices(missing)

		// Merge: existing + new entries
		for (const entry of newEntries) {
			existing.set(priceKey(entry.Date, entry.Asset), entry)
		}

		messages.push(`added ${newEntries.length}`)
	}

	if (extra.length > 0) {
		messages.push(`removed ${extra.length} unused`)
	}

	writePriceData(priceDataPath, [...existing.values()])
	logger.info(`Price data synced: ${messages.join(', ')}.`)
}

// --- Chart Generation ---

/** Map of category label → hex color for the expense chart. */
const CHART_COLORS: Record<string, string> = {
	Branding: '#9d4edd',
	Comms: '#10b981',
	'Data entry': '#f59e0b',
	Dev: '#7c3aed',
	Email: '#eab308',
	Hosting: '#ef4444',
	Merch: '#14b8a6',
	Ops: '#6b7280',
	'Social media': '#ec4899',
	Test: '#52525b',
	Travel: '#a855f7',
	Wallet: '#6366f1',
}

/** Format a USD amount for display in labels. */
function formatUsd(value: number): string {
	if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(1)}M`
	}

	if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(1)}k`
	}

	return `$${value.toFixed(0)}`
}

/** Format a full USD amount for tooltips. */
function formatUsdFull(value: number): string {
	return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/**
 * Collect all YYYY-MM months between two dates (inclusive).
 */
function collectMonths(fromDate: string, toDate: string): string[] {
	const [fromYear, fromMonth] = fromDate.substring(0, 7).split('-').map(Number)
	const [toYear, toMonth] = toDate.substring(0, 7).split('-').map(Number)

	const months: string[] = []
	let y = fromYear
	let m = fromMonth

	while (y < toYear || (y === toYear && m <= toMonth)) {
		months.push(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`)
		m++

		if (m > 12) {
			m = 1
			y++
		}
	}

	return months
}

interface ExpenseChartSegment {
	label: string
	usd: number
}

interface ExpenseChartMonth {
	month: string
	segments: ExpenseChartSegment[]
	total: number
}

/**
 * Generate a stacked bar chart SVG of monthly expenses by category.
 * Reads operations and price data, converts amounts to USD,
 * and returns the SVG contents.
 */
export async function generateExpensesChart(
	operationsPath: string,
	priceDataPath: string,
	chartOutputPath: string,
): Promise<string> {
	const operationsRaw = readFile(operationsPath)
	const operations = parseTSV<OperationRow>(operationsRaw)

	const priceData = readPriceData(priceDataPath)

	// Aggregate expenses by (month, category) → USD
	const aggregated = new Map<string, Map<string, number>>()

	for (const op of operations) {
		const parsed = parseAmounts(op.Amount)

		if (parsed.type !== 'expense') {
			continue
		}

		const yearMonth = op.Date.substring(0, 7)

		if (!aggregated.has(yearMonth)) {
			aggregated.set(yearMonth, new Map<string, number>())
		}

		const monthData = aggregated.get(yearMonth)!

		for (const { value, asset, category } of parsed.assets) {
			if (!includeInExpenseBreakdown(category)) {
				continue
			}

			const normalized = normalizeAsset(asset)
			const priceKeyStr = priceKey(op.Date, normalized)
			const priceRow = priceData.get(priceKeyStr)

			if (!priceRow) {
				throw new Error(`Missing price data for ${normalized} on ${op.Date}`)
			}

			const price = parseFloat(priceRow.Value)
			const usd = value * price
			const label = categoryLabel(category)

			monthData.set(label, (monthData.get(label) ?? 0) + usd)
		}
	}

	if (aggregated.size === 0) {
		throw new Error('no data detected in TSV')
	}

	// Collect all months (including gaps)
	const firstDate = operations[0].Date
	const lastDate = operations[operations.length - 1].Date
	const allMonths = collectMonths(firstDate, lastDate)

	// Build chart data with consistent segment ordering
	const allLabels = new Set<string>()

	for (const monthData of aggregated.values()) {
		for (const label of monthData.keys()) {
			allLabels.add(label)
		}
	}

	const sortedLabels = [...allLabels].sort()

	const chartData: ExpenseChartMonth[] = allMonths.map(month => {
		const monthData = aggregated.get(month) ?? new Map<string, number>()
		const segments = sortedLabels
			.map(label => ({
				label,
				usd: monthData.get(label) ?? 0,
			}))
			.filter(seg => seg.usd > 0)

		const total = segments.reduce((sum, seg) => sum + seg.usd, 0)

		return { month, segments, total }
	})

	// --- Generate SVG ---

	const barWidth = 40
	const barGap = 18
	const marginLeft = 65
	const marginRight = 20
	const marginTop = 20
	const marginBottom = 50

	const width = marginLeft + chartData.length * (barWidth + barGap) - barGap + marginRight
	const maxTotal = Math.max(...chartData.map(d => d.total), 1)

	// Round up to a nice number
	const niceMax = Math.ceil(maxTotal / 2000) * 2000
	const chartHeight = 240
	const height = marginTop + chartHeight + marginBottom

	// Y-axis ticks
	const tickCount = 5
	const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax / tickCount) * i)

	const svgParts: string[] = []

	svgParts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly expenses chart stacked by category">`,
	)

	// Styles
	svgParts.push(
		'<style>',
		'  text { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; fill: #374151; }',
		'  .axis-line { stroke: #d1d5db; stroke-width: 1; }',
		'  .tick-line { stroke: #e5e7eb; stroke-width: 0.5; }',
		'  .bar-segment { cursor: pointer; }',
		'  .bar-segment:hover { opacity: 0.8; }',
		'</style>',
	)

	// Grid lines and Y-axis labels
	for (const tick of ticks) {
		const y = marginTop + chartHeight - (tick / niceMax) * chartHeight

		svgParts.push(
			`<line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" class="tick-line"/>`,
		)
		svgParts.push(
			`<text x="${marginLeft - 8}" y="${y + 4}" text-anchor="end">${formatUsd(tick)}</text>`,
		)
	}

	// X-axis baseline
	svgParts.push(
		`<line x1="${marginLeft}" y1="${marginTop + chartHeight}" x2="${width - marginRight}" y2="${marginTop + chartHeight}" class="axis-line"/>`,
	)

	// Bars
	for (let i = 0; i < chartData.length; i++) {
		const d = chartData[i]
		const x = marginLeft + i * (barWidth + barGap)

		// Month label
		const labelX = x + barWidth / 2
		const labelY = marginTop + chartHeight + 16
		const label = d.month

		svgParts.push(`<text x="${labelX}" y="${labelY}" text-anchor="middle">${label}</text>`)

		// Stacked segments
		let cumulativeY = marginTop + chartHeight

		for (const seg of d.segments) {
			const segHeight = (seg.usd / niceMax) * chartHeight
			const color = CHART_COLORS[seg.label] ?? '#9ca3af'
			const tooltip = `${seg.label}: ${formatUsdFull(seg.usd)}`

			if (segHeight > 0) {
				const y = cumulativeY - segHeight

				svgParts.push(
					`<rect x="${x}" y="${y}" width="${barWidth}" height="${segHeight}" fill="${color}" class="bar-segment"><title>${tooltip}</title></rect>`,
				)
			}

			cumulativeY -= segHeight
		}
	}

	svgParts.push('</svg>')

	const svgString = svgParts.join('')

	// Optimize with SVGO
	const repoRoot = path.dirname(path.dirname(path.dirname(path.resolve(chartOutputPath))))
	const svgoConfig = await loadConfig(path.join(repoRoot, 'tests/utils/svgo.config.mjs'))

	const optimized = optimize(svgString, {
		path: chartOutputPath,
		...svgoConfig,
	})

	return optimized.data
}

// --- Main Execution ---

export async function treasuryMarkdownUpdate(config: TreasuryMarkdownUpdaterConfig): Promise<void> {
	// Initialize Logger based on config
	const logger: Logger = {
		info: (message: string): void => {
			if (!config.quiet) {
				process.stderr.write(message + '\n')
			}
		},
	}

	// Read and parse source data
	const addressesRaw = readFile(config.addressesPath)
	const operationsRaw = readFile(config.operationsPath)
	const addresses = parseTSV<AddressRow>(addressesRaw)
	const operations = parseTSV<OperationRow>(operationsRaw)

	// Price data validation/population
	{
		const existingPrices = readPriceData(config.priceDataPath)

		if (config.test) {
			// Test mode: check that all needed entries exist
			checkPriceDataCompleteness(operations, existingPrices)
		} else {
			// Write mode: populate any missing entries
			await populatePriceData(operations, config.priceDataPath, logger)
		}
	}

	// Chart generation
	const chartContent = await generateExpensesChart(
		config.operationsPath,
		config.priceDataPath,
		config.chartOutputPath,
	)

	// Markdown generation
	const timestamp = operations[operations.length - 1].Date
	const markdownContent = `---
title: Walletbeat Treasury Transparency Report
description: 'Overview of Walletbeat treasury addresses and their operational history.'
---

# Walletbeat Treasury Transparency Report

_Latest operation: ${timestamp}_

This document tracks known treasury addresses and their operational history.

![Expenses over time](treasury-chart.svg)

## 1. Walletbeat addresses

The following addresses are recognized as part of Walletbeat and its contributors.

${generateAddressesTable(addresses)}

## 2. Operations Log

A history of transfers, grants, and treasury operations.

${generateOperationsTable(operations, addresses)}

---

_Generated automatically from source TSV files._
`

	if (config.test) {
		// Verify markdown is up to date
		if (!fs.existsSync(config.outputPath)) {
			throw new Error('Test Failed: Output file does not exist.')
		}

		const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

		if (existingContent.trim() !== markdownContent.trim()) {
			throw new Error(
				'Content mismatch.\nThe existing markdown file does not match the generated output.\nRun `pnpm fix` to automatically fix this.',
			)
		}

		// Verify chart is up to date
		if (chartContent !== '') {
			if (!fs.existsSync(config.chartOutputPath)) {
				throw new Error('Test Failed: Chart output file does not exist: ' + config.chartOutputPath)
			}

			const existingChart = fs.readFileSync(config.chartOutputPath, 'utf-8')

			if (existingChart !== chartContent) {
				throw new Error(
					'Chart mismatch. The existing chart SVG does not match the generated output.\n' +
						'Run `pnpm fix` to automatically fix this.',
				)
			}
		}

		logger.info('Treasury files up to date.')
	} else {
		// Write markdown if changed
		if (fs.existsSync(config.outputPath)) {
			const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

			if (existingContent.trim() === markdownContent.trim()) {
				// Contents already up-to-date, nothing to do.
				return
			}
		}

		fs.writeFileSync(config.outputPath, markdownContent)

		// Write chart if non-empty
		if (chartContent !== '') {
			const outputDir = path.dirname(config.chartOutputPath)

			fs.mkdirSync(outputDir, { recursive: true })

			if (fs.existsSync(config.chartOutputPath)) {
				const existingChart = fs.readFileSync(config.chartOutputPath, 'utf-8')

				if (existingChart !== chartContent) {
					fs.writeFileSync(config.chartOutputPath, chartContent)
					logger.info('Treasury chart updated.')
				}
			} else {
				fs.writeFileSync(config.chartOutputPath, chartContent)
				logger.info('Treasury chart generated.')
			}
		}

		logger.info('Treasury transparency report updated.')
	}
}
