#!/usr/bin/env node
/**
 * Converts a wallet capture file from the old redaction format (~R: strings + redactions section)
 * to the new userData format (raw strings + userData section).
 *
 * Usage:
 *   pnpm tsx src/tools/wallet-data-collection/convert-capture-redactions.ts <capture-file> <raw-string-1> [raw-string-2] ...
 *
 * The script will:
 * 1. Analyze the capture file's `redactions` section to find unique hashes
 * 2. Print the expected raw strings in order (with hints)
 * 3. Match provided strings to redaction entries by computing hashes (any order accepted)
 * 4. Replace all ~R: strings with unredacted values
 * 5. Convert the `redactions` section to the new `userData` format
 * 6. Write the converted file back (with a .converted.json suffix)
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

// == Types ==

interface OldRedactionEntry {
	labelPrefix: string
	labelIndex: number
	hash: string
	origHash?: string
	entropy: string
	length: number
	firstChar: string
	piece?: string
	pieces?: string[]
	hint?: string
}

interface OldRedactionsSection {
	salt: string
	redactions: OldRedactionEntry[]
}

interface NewUserDataEntry {
	str: string
	piece?: string
	pieces?: string[]
}

interface NewCaptureFile {
	identity: Record<string, string>
	flows: Record<string, unknown>
	userData: { userData: NewUserDataEntry[] }
	sessions: number
}

// == Helpers ==

function hashWithSalt(salt: string, input: string): string {
	const h = createHash('sha256')

	h.update(salt)
	h.update(input)

	return h.digest('hex')
}

/**
 * Given a ~R: encoded string and a label-to-raw map, decode it back to the original string.
 *
 * Format: ~R:<escapeChar><payload>
 * In payload, redacted labels appear as <escapeChar><LABEL_PREFIX>_<LABEL_INDEX><escapeChar>
 */
function decodeRedactedString(encoded: string, labelToRaw: Map<string, string>): string | null {
	if (!encoded.startsWith('~R:')) {
		return null
	}

	// First character after ~R: is the escape character
	if (encoded.length < 5) {
		// ~R:<escapeChar> is minimum (5 chars), but we need at least the prefix + escape
		// Actually ~R:~ is 4 chars for a completely empty payload
		return encoded.length < 4 ? null : encoded.slice(4)
	}

	const escapeChar = encoded.charAt(3)
	const payload = encoded.slice(4)

	// Find all <escapeChar><LABEL>_<INDEX><escapeChar> patterns in payload
	// The label format is like ACCOUNTADDRESS_1
	const labelRegex = new RegExp(
		`${escapeChar.replaceAll('+', '\\+')}([A-Z]+)_(\\d+)${escapeChar.replaceAll('+', '\\+')}`,
		'g',
	)

	let result = payload
	let match: RegExpExecArray | null

	// Reset regex

	while ((match = labelRegex.exec(payload)) !== null) {
		const fullMatch = match[0]
		const label = `${match[1]}_${match[2]}`
		const raw = labelToRaw.get(label)

		if (raw === undefined) {
			console.error(`WARNING: Unknown redaction label "${label}" in string`)

			return null
		}

		result = result.replace(fullMatch, raw)
	}

	return result
}

/**
 * Recursively walk a JSON value, replacing all ~R: strings with decoded values.
 * Returns the transformed value.
 */
function unredactValue(value: unknown, labelToRaw: Map<string, string>): unknown {
	if (typeof value === 'string') {
		if (value.startsWith('~R:')) {
			const decoded = decodeRedactedString(value, labelToRaw)

			if (decoded === null) {
				console.error(`ERROR: Failed to decode redacted string: ${value.substring(0, 100)}`)
				process.exit(1)
			}

			return decoded
		}

		return value
	}

	if (Array.isArray(value)) {
		return value.map(item => unredactValue(item, labelToRaw))
	}

	if (typeof value === 'object' && value !== null) {
		const result: Record<string, unknown> = {}

		for (const [key, val] of Object.entries(value)) {
			result[key] = unredactValue(val, labelToRaw)
		}

		return result
	}

	return value
}

// == Main ==

function main() {
	const args = process.argv.slice(2)

	if (args.length < 1) {
		console.error('Usage: convert-capture-redactions.ts <capture-file> [raw-strings...]')
		console.error('')
		console.error('If no raw strings are provided, the script will print the expected strings.')
		console.error('Provide raw strings as positional arguments to perform the conversion.')
		process.exit(1)
	}

	const filePath = args[0]
	const providedStrings = args.slice(1)

	// Read and parse the file
	let rawData = ''

	try {
		rawData = readFileSync(filePath, 'utf8')
	} catch {
		console.error(`ERROR: Could not read file: ${filePath}`)
		process.exit(1)
	}

	const data: Record<string, unknown> = JSON.parse(rawData)

	// Check if file already uses new format
	const redactionsSection = data.redactions as OldRedactionsSection | undefined

	if (!redactionsSection || !redactionsSection.redactions) {
		if ('userData' in data) {
			console.log('File already uses the new userData format. Nothing to convert.')
		} else {
			console.error('ERROR: File does not have a redactions section and no userData section.')
		}

		process.exit(0)
	}

	const salt = redactionsSection.salt
	const redactionEntries = redactionsSection.redactions

	// Build maps: entry.hash -> entry, label -> hash, hash -> pieces
	const hashToEntry = new Map<string, OldRedactionEntry>()
	const labelToHash = new Map<string, string>()
	const hashToPieces = new Map<string, Set<string>>()

	for (const entry of redactionEntries) {
		const hash = entry.hash
		const label = `${entry.labelPrefix}_${entry.labelIndex}`

		hashToEntry.set(hash, entry)
		labelToHash.set(label, hash)

		// Track pieces for each hash
		if (!hashToPieces.has(hash)) {
			hashToPieces.set(hash, new Set())
		}

		const pieces = hashToPieces.get(hash)!

		if (entry.piece) {
			pieces.add(entry.piece)
		}

		if (entry.pieces) {
			for (const p of entry.pieces) {
				pieces.add(p)
			}
		}
	}

	// Collect unique hashes for display
	const uniqueHashes = new Set(redactionEntries.map(e => e.hash))

	console.log(`File: ${filePath}`)
	console.log(`Total redaction entries: ${redactionEntries.length}`)
	console.log(`Unique hashes: ${uniqueHashes.size}`)
	console.log(`Salt: ${salt}`)
	console.log()

	// Print expected strings (ordered by first appearance in redactions array)
	console.log('Expected raw strings (provide in any order):')

	const hashesInOrder = [...uniqueHashes]

	for (let i = 0; i < hashesInOrder.length; i++) {
		const hash = hashesInOrder[i]
		const entry = hashToEntry.get(hash)!

		console.log(
			`  #${i + 1}: hash=${hash.slice(0, 16)}... hint="${entry.hint ?? 'N/A'}" length=${entry.length} firstChar="${entry.firstChar}" piece(s)=[${[...hashToPieces.get(hash)!].join(', ')}]`,
		)
	}

	console.log()

	// If no raw strings provided, just show the info and exit
	if (providedStrings.length === 0) {
		console.log('No raw strings provided. Run with positional arguments to convert:')
		console.log(`  pnpm tsx ${process.argv[1]} ${filePath} "<string-1>" "<string-2>" ...`)
		process.exit(0)
	}

	// Match provided strings to entries by computing hashes
	// Each provided string matches one or more entries (same hash for aliases)
	// All entries must be matched by at least one provided string
	const hashToRaw = new Map<string, string>()
	const matchedHashes = new Set<string>()
	const usedStrings = new Set<string>()

	for (const rawStr of providedStrings) {
		// Try both original and lowercase variants (Python hashes both)
		const hashesToTry = new Set<string>()

		hashesToTry.add(hashWithSalt(salt, rawStr))
		hashesToTry.add(hashWithSalt(salt, rawStr.toLowerCase()))

		let stringMatched = false

		for (const computedHash of hashesToTry) {
			if (!matchedHashes.has(computedHash) && hashToEntry.has(computedHash)) {
				const entry = hashToEntry.get(computedHash)!

				// Validate length
				if (rawStr.length !== entry.length) {
					console.error(
						`ERROR: String "${rawStr}" length mismatch for ${entry.labelPrefix}_${entry.labelIndex}: expected ${entry.length}, got ${rawStr.length}`,
					)
					process.exit(1)
				}

				// Validate first character (case-insensitive)
				if (rawStr.charAt(0).toLowerCase() !== entry.firstChar.toLowerCase()) {
					console.error(
						`ERROR: String "${rawStr}" first char mismatch for ${entry.labelPrefix}_${entry.labelIndex}: expected "${entry.firstChar}", got "${rawStr.charAt(0)}"`,
					)
					process.exit(1)
				}

				hashToRaw.set(computedHash, rawStr)
				matchedHashes.add(computedHash)
				stringMatched = true
			}
		}

		if (stringMatched) {
			usedStrings.add(rawStr)
		}
	}

	// Check all entries matched
	if (matchedHashes.size !== uniqueHashes.size) {
		const unmatched = [...uniqueHashes].filter(h => !matchedHashes.has(h))

		console.error(
			`ERROR: ${unmatched.length} redaction entry(ies) could not be matched to any provided string.`,
		)

		for (const hash of unmatched) {
			const entry = hashToEntry.get(hash)!

			console.error(
				`  Unmatched: ${entry.labelPrefix}_${entry.labelIndex} (hash: ${hash.slice(0, 16)}... hint: "${entry.hint ?? 'N/A'}")`,
			)
		}

		process.exit(1)
	}

	// Build label -> rawStr map
	const labelToRaw = new Map<string, string>()

	for (const [label, hash] of labelToHash.entries()) {
		const rawStr = hashToRaw.get(hash)

		if (rawStr !== undefined) {
			labelToRaw.set(label, rawStr)
		}
	}

	console.log('All strings validated successfully.')
	console.log()

	// Now unredact the entire JSON (except the redactions section itself)
	const newData: Record<string, unknown> = JSON.parse(rawData)

	// Remove the redactions section
	delete newData.redactions

	// Unredact flows, identity, etc.
	if (newData.flows != null) {
		newData.flows = unredactValue(newData.flows, labelToRaw)
	}

	// Build userData section by deduplicating by raw string
	const rawStrToPieces = new Map<string, Set<string>>()

	for (const [hash, rawStr] of hashToRaw.entries()) {
		const pieces = hashToPieces.get(hash)

		if (!pieces || pieces.size === 0) {
			continue
		}

		if (!rawStrToPieces.has(rawStr)) {
			rawStrToPieces.set(rawStr, new Set())
		}

		const merged = rawStrToPieces.get(rawStr)!

		for (const p of pieces) {
			merged.add(p)
		}
	}

	const userDataEntries: NewUserDataEntry[] = []

	for (const [rawStr, pieces] of rawStrToPieces.entries()) {
		const sortedPieces = [...pieces].sort()
		const entry: NewUserDataEntry = { str: rawStr }

		if (sortedPieces.length === 1) {
			entry.piece = sortedPieces[0]
		} else {
			entry.pieces = sortedPieces
		}

		userDataEntries.push(entry)
	}

	// Sort by string value (same as Python implementation)
	userDataEntries.sort((a, b) => a.str.localeCompare(b.str))

	// Add userData section
	newData.userData = { userData: userDataEntries }

	// Write output
	const output = JSON.stringify(newData, null, '\t') + '\n'

	// Determine output path
	const outputPath = filePath.replace(/\.json$/, '.converted.json')

	writeFileSync(outputPath, output, 'utf8')

	console.log(`Converted file written to: ${outputPath}`)
	console.log(`  Redaction entries processed: ${redactionEntries.length}`)
	console.log(`  Unique raw strings in userData: ${userDataEntries.length}`)

	// Verify the converted file can be parsed
	try {
		const verify = JSON.parse(output) as NewCaptureFile

		if (verify.userData === undefined) {
			console.error('ERROR: Converted file does not have userData section!')
			process.exit(1)
		}

		if ('redactions' in verify) {
			console.error('ERROR: Converted file still has redactions section!')
			process.exit(1)
		}

		// Check for remaining ~R: strings
		const remainingRedactions = output.match(/~R:/g)

		if (remainingRedactions) {
			console.error(
				`WARNING: ${remainingRedactions.length} ~R: strings still remain in the converted file!`,
			)
			process.exit(1)
		}

		console.log('Verification: PASSED')
	} catch {
		console.error('ERROR: Could not parse converted file!')
		process.exit(1)
	}
}

main()
