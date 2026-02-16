import * as fs from 'fs'

// --- Interfaces ---

export interface TreasuryMarkdownUpdaterConfig {
	addressesPath: string
	operationsPath: string
	outputPath: string
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

		return [
			escapeMd(operation.Date),
			`${markdownAddressLink(getAddressRowByName(operation.From, addresses), operation.From, true)}`,
			`${markdownAddressLink(getAddressRowByName(operation.To, addresses), operation.To, true)}`,
			`\`${escapeMd(operation.Amount)}\``,
			escapeMd(operation.Purpose),
			txLink,
		]
	})

	return generateAlignedTable(headers, formattedRows)
}

// --- Main Execution ---

export function treasuryMarkdownUpdate(config: TreasuryMarkdownUpdaterConfig): void {
	// Initialize Logger based on config
	const logger: Logger = {
		info: (message: string): void => {
			if (!config.quiet) {
				process.stdout.write(message + '\n')
			}
		},
	}

	const addressesRaw = readFile(config.addressesPath)
	const operationsRaw = readFile(config.operationsPath)
	const addresses = parseTSV<AddressRow>(addressesRaw)
	const operations = parseTSV<OperationRow>(operationsRaw)
	const timestamp = operations[operations.length - 1].Date
	const markdownContent = `# Walletbeat Treasury Transparency Report

_Latest operation: ${timestamp}_

This document tracks known treasury addresses and their operational history.

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
		if (!fs.existsSync(config.outputPath)) {
			throw new Error('Test Failed: Output file does not exist.')
		}

		const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

		if (existingContent.trim() !== markdownContent.trim()) {
			throw new Error(
				'Content mismatch.\nThe existing markdown file does not match the generated output.\nRun `pnpm fix` to automatically fix this.',
			)
		}

		logger.info('File is up to date.')
	} else {
		if (fs.existsSync(config.outputPath)) {
			const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

			if (existingContent.trim() === markdownContent.trim()) {
				// Contents already up-to-date, nothing to do.
				return
			}
		}

		fs.writeFileSync(config.outputPath, markdownContent)
		logger.info('Treasury transparency report updated.')
	}
}
