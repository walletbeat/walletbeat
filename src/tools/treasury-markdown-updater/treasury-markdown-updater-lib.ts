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
	expensesOverTimePath: string
	expensesBreakdownPath: string
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
export function categoryLabel(category: TreasuryCategory | 'Other'): string {
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
		case 'Other':
			return 'Other'
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

/**
 * Returns the hex color for a given expense category label.
 * Used by both the pie chart and the bar chart to ensure consistent
 * coloring across all treasury visualizations.
 * Colors are chosen for high mutual distinguishability and good
 * contrast on both light and dark backgrounds.
 */
export function getChartColor(category: TreasuryCategory | 'Other'): string {
	switch (category) {
		case TreasuryCategory['expense:swag']:
			return '#e76f51'
		case TreasuryCategory['expense:travel']:
			return '#0077b6'
		case TreasuryCategory['expense:wallet']:
			return '#00b894'
		case TreasuryCategory['hosting-infra']:
			return '#c9184e'
		case TreasuryCategory['labor:branding']:
			return '#e76f51'
		case TreasuryCategory['labor:comms']:
			return '#00b4d8'
		case TreasuryCategory['labor:data_entry']:
			return '#e09f3e'
		case TreasuryCategory['labor:dev']:
			return '#7209b7'
		case TreasuryCategory['services:email']:
			return '#ff6d00'
		case TreasuryCategory['services:social_media']:
			return '#80b918'
		case TreasuryCategory.operational:
			return '#6b7280'
		case TreasuryCategory.test:
			return '#434343'
		case 'Other':
			return '#9e9e9e'
	}

	throw new Error(`Unknown category: ${category}`)
}

/** Format a USD amount compactly (no locale). Append " USD" when showCurrency is true. */
function formatUsd(value: number, showCurrency = false): string {
	let result: string

	if (value >= 1_000_000) {
		result = `${(value / 1_000_000).toFixed(3)}M`
	} else if (value >= 1_000) {
		result = `${(value / 1_000).toFixed(3)}k`
	} else {
		result = `${value.toFixed(0)}`
	}

	return showCurrency ? `${result} USD` : result
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
	category: TreasuryCategory | 'Other'
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
export async function generateExpensesOverTimeChart(
	operationsPath: string,
	priceDataPath: string,
	outputPath: string,
): Promise<string> {
	const operationsRaw = readFile(operationsPath)
	const operations = parseTSV<OperationRow>(operationsRaw)

	const priceData = readPriceData(priceDataPath)

	// Aggregate expenses by (month, category) → USD
	const aggregated = new Map<string, Map<TreasuryCategory, number>>()

	for (const op of operations) {
		const parsed = parseAmounts(op.Amount)

		if (parsed.type !== 'expense') {
			continue
		}

		const yearMonth = op.Date.substring(0, 7)

		if (!aggregated.has(yearMonth)) {
			aggregated.set(yearMonth, new Map<TreasuryCategory, number>())
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

			monthData.set(category, (monthData.get(category) ?? 0) + usd)
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
	const allCategories = new Set<TreasuryCategory>()

	for (const monthData of aggregated.values()) {
		for (const category of monthData.keys()) {
			allCategories.add(category)
		}
	}

	const sortedCategories = [...allCategories].sort((a, b) =>
		categoryLabel(a).localeCompare(categoryLabel(b)),
	)

	const chartData: ExpenseChartMonth[] = allMonths.map(month => {
		const monthData = aggregated.get(month) ?? new Map<TreasuryCategory, number>()
		const segments = sortedCategories
			.map(category => ({
				category,
				usd: monthData.get(category) ?? 0,
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
			const color = getChartColor(seg.category)
			const tooltip = `${categoryLabel(seg.category)}: ${formatUsd(seg.usd, true)}`

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
	const repoRoot = path.dirname(path.dirname(path.dirname(path.resolve(outputPath))))
	const svgoConfig = await loadConfig(path.join(repoRoot, 'tests/utils/svgo.config.mjs'))

	const optimized = optimize(svgString, {
		path: outputPath,
		...svgoConfig,
	})

	return optimized.data
}

/**
 * Aggregate expenses by category across all time (in USD).
 * Shared by both the monthly bar chart and the pie chart.
 */
function aggregateExpensesByCategory(
	operations: OperationRow[],
	priceData: Map<string, PriceDataRow>,
): Map<TreasuryCategory, number> {
	const totals = new Map<TreasuryCategory, number>()

	for (const op of operations) {
		const parsed = parseAmounts(op.Amount)

		if (parsed.type !== 'expense') {
			continue
		}

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

			totals.set(category, (totals.get(category) ?? 0) + usd)
		}
	}

	return totals
}

interface PieSegment {
	category: TreasuryCategory | 'Other'
	label: string
	usd: number
	percentage: number
	color: string
}

/**
 * Generate a pie chart SVG of aggregate expenses by category across all time.
 * Reads operations and price data, converts amounts to USD,
 * and returns the SVG contents.
 */
export async function generateExpensesBreakdownChart(
	operationsPath: string,
	priceDataPath: string,
	outputPath: string,
): Promise<string> {
	const operationsRaw = readFile(operationsPath)
	const operations = parseTSV<OperationRow>(operationsRaw)
	const priceData = readPriceData(priceDataPath)

	// Aggregate expenses by category across all time
	const totals = aggregateExpensesByCategory(operations, priceData)

	if (totals.size === 0) {
		throw new Error('no expense data detected in TSV')
	}

	const totalUsd = [...totals.values()].reduce((sum, v) => sum + v, 0)

	// Build segments sorted by USD descending
	const allSegments: PieSegment[] = [...totals.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([category, usd]) => ({
			category,
			label: categoryLabel(category),
			usd,
			percentage: (usd / totalUsd) * 100,
			color: getChartColor(category),
		}))

	// Group small tail into "Other" (categories whose combined total is ≤ 1%)
	let otherStart = allSegments.length

	for (let i = allSegments.length - 1; i >= 0; i--) {
		const tailSum = allSegments.slice(i).reduce((sum, s) => sum + s.percentage, 0)

		if (tailSum <= 1) {
			otherStart = i
		} else {
			break
		}
	}

	const segments: PieSegment[] =
		otherStart < allSegments.length
			? [
					...allSegments.slice(0, otherStart),
					{
						category: 'Other',
						label: 'Other',
						usd: allSegments.slice(otherStart).reduce((sum, s) => sum + s.usd, 0),
						percentage: allSegments.slice(otherStart).reduce((sum, s) => sum + s.percentage, 0),
						color: getChartColor('Other'),
					},
				]
			: allSegments

	// --- Generate SVG ---
	const svgWidth = 600
	const svgHeight = 400
	const pieCenterX = 220
	const pieCenterY = 200
	const pieRadius = 160

	const svgParts: string[] = []

	svgParts.push(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Total expenses breakdown pie chart by category">`,
	)

	// Styles
	svgParts.push(
		'<style>',
		'  text { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; fill: #374151; }',
		'  .pie-segment { cursor: pointer; }',
		'  .pie-segment:hover { opacity: 0.8; }',
		'  .pie-label { font-size: 10px; text-anchor: middle; dominant-baseline: central; pointer-events: none; }',
		'  .pie-title { font-size: 16px; font-weight: 600; fill: #111827; text-anchor: middle; }',
		'  .legend-item { cursor: pointer; }',
		'  .legend-item:hover { opacity: 0.8; }',
		'  .legend-text { font-size: 11px; }',
		'</style>',
	)

	// Title
	svgParts.push(
		`<text x="${pieCenterX}" y="${pieCenterY - pieRadius - 28}" class="pie-title">Total Expenses</text>`,
	)
	svgParts.push(
		`<text x="${pieCenterX}" y="${pieCenterY - pieRadius - 10}" font-size="12px" fill="#6b7280" text-anchor="middle">${formatUsd(totalUsd, true)}</text>`,
	)

	// Draw pie slices
	let cumulativeAngle = -90 // Start from top

	for (const seg of segments) {
		const sliceAngle = (seg.usd / totalUsd) * 360
		const startAngle = cumulativeAngle
		const endAngle = cumulativeAngle + sliceAngle

		const startRad = (startAngle * Math.PI) / 180
		const endRad = (endAngle * Math.PI) / 180

		const x1 = pieCenterX + pieRadius * Math.cos(startRad)
		const y1 = pieCenterY + pieRadius * Math.sin(startRad)
		const x2 = pieCenterX + pieRadius * Math.cos(endRad)
		const y2 = pieCenterY + pieRadius * Math.sin(endRad)

		const largeArc = sliceAngle > 180 ? 1 : 0

		const d = `M${pieCenterX},${pieCenterY}L${x1.toFixed(2)},${y1.toFixed(2)}A${pieRadius},${pieRadius} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)}Z`
		const tooltip = `${seg.label}: ${formatUsd(seg.usd, true)} (${seg.percentage.toFixed(1)}%)`

		svgParts.push(
			`<path d="${d}" fill="${seg.color}" class="pie-segment"><title>${tooltip}</title></path>`,
		)

		// Label on the slice (at midpoint angle, 70% of radius)
		const midAngle = (startAngle + endAngle) / 2
		const midRad = (midAngle * Math.PI) / 180
		const labelR = pieRadius * 0.7
		const lx = pieCenterX + labelR * Math.cos(midRad)
		const ly = pieCenterY + labelR * Math.sin(midRad)

		if (seg.percentage >= 2) {
			let label: string

			if (seg.percentage < 1) {
				label = '<1'
			} else if (seg.percentage < 5) {
				label = `${seg.percentage.toFixed(1)}%`
			} else {
				label = `${Math.round(seg.percentage)}%`
			}

			svgParts.push(
				`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="pie-label">${label}</text>`,
			)
		}

		cumulativeAngle += sliceAngle
	}

	// Legend (right side, single column)
	const legendX = 410
	const legendYStart = 40
	const legendRowHeight = 22
	const labelPadding = 18
	const percentagePadding = 8
	const percentageRightX = 560

	for (let i = 0; i < segments.length; i++) {
		const x = legendX
		const y = legendYStart + i * legendRowHeight

		const seg = segments[i]
		const percentageLabel = `${seg.percentage.toFixed(1)}%`
		const labelText = seg.label
		const labelX = x + labelPadding
		const percentageX = Math.max(
			labelX + labelText.length * 6.5 + percentagePadding,
			percentageRightX,
		)

		svgParts.push('<g class="legend-item">')
		svgParts.push(
			`<rect x="${x}" y="${y - 10}" width="14" height="14" fill="${seg.color}" rx="2" ry="2"/>`,
		)
		svgParts.push(`<text x="${labelX}" y="${y}" class="legend-text">${labelText}</text>`)
		svgParts.push(
			`<text x="${percentageX}" y="${y}" class="legend-text" text-anchor="end" fill="#6b7280">${percentageLabel}</text>`,
		)
		svgParts.push('</g>')
	}

	svgParts.push('</svg>')

	const svgString = svgParts.join('')

	// Optimize with SVGO
	const repoRoot = path.dirname(path.dirname(path.dirname(path.resolve(outputPath))))
	const svgoConfig = await loadConfig(path.join(repoRoot, 'tests/utils/svgo.config.mjs'))

	const optimized = optimize(svgString, {
		path: outputPath,
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
	const expensesOverTimeContent = await generateExpensesOverTimeChart(
		config.operationsPath,
		config.priceDataPath,
		config.expensesOverTimePath,
	)
	const expensesBreakdownContent = await generateExpensesBreakdownChart(
		config.operationsPath,
		config.priceDataPath,
		config.expensesBreakdownPath,
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

![Total expenses breakdown](treasury-expenses-breakdown.svg)

![Expenses over time](treasury-expenses-over-time.svg)

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

		// Verify expenses over time chart is up to date
		if (expensesOverTimeContent !== '') {
			if (!fs.existsSync(config.expensesOverTimePath)) {
				throw new Error(
					'Test Failed: Expenses over time chart output file does not exist: ' +
						config.expensesOverTimePath,
				)
			}

			const existingExpensesOverTime = fs.readFileSync(config.expensesOverTimePath, 'utf-8')

			if (existingExpensesOverTime !== expensesOverTimeContent) {
				throw new Error(
					'Expenses over time chart mismatch. The existing chart SVG does not match the generated output.\n' +
						'Run `pnpm fix` to automatically fix this.',
				)
			}
		}

		// Verify expenses breakdown chart is up to date
		if (expensesBreakdownContent !== '') {
			if (!fs.existsSync(config.expensesBreakdownPath)) {
				throw new Error(
					'Test Failed: Expenses breakdown chart output file does not exist: ' +
						config.expensesBreakdownPath,
				)
			}

			const existingExpensesBreakdown = fs.readFileSync(config.expensesBreakdownPath, 'utf-8')

			if (existingExpensesBreakdown !== expensesBreakdownContent) {
				throw new Error(
					'Expenses breakdown chart mismatch. The existing chart SVG does not match the generated output.\n' +
						'Run `pnpm fix` to automatically fix this.',
				)
			}
		}

		logger.info('Treasury files up to date.')
	} else {
		let updated = false
		const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

		if (existingContent.trim() !== markdownContent.trim()) {
			fs.writeFileSync(config.outputPath, markdownContent)
			updated = true
		}

		const existingExpensesOverTime = fs.readFileSync(config.expensesOverTimePath, 'utf-8')

		if (existingExpensesOverTime !== expensesOverTimeContent) {
			fs.writeFileSync(config.expensesOverTimePath, expensesOverTimeContent)
			updated = true
		}

		const existingExpensesBreakdown = fs.readFileSync(config.expensesBreakdownPath, 'utf-8')

		if (existingExpensesBreakdown !== expensesBreakdownContent) {
			fs.writeFileSync(config.expensesBreakdownPath, expensesBreakdownContent)

			updated = true
		}

		if (updated) {
			logger.info('Treasury transparency report updated.')
		}
	}
}
