#!/usr/bin/env node
/**
 * Temporary script to analyze redactions in a capture file.
 * Prints canonical hashes in order so the user knows which raw strings to provide.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const filePath = process.argv[2]

if (!filePath) {
	console.error('Usage: analyze-redactions.mjs <capture-file>')
	process.exit(1)
}

const data = JSON.parse(readFileSync(filePath, 'utf8'))

if (!data.redactions) {
	console.error('File does not have a redactions section (already converted?)')
	process.exit(1)
}

const salt = data.redactions.salt
const redactions = data.redactions.redactions

// Find unique canonical hashes in order
const seen = new Set()
const canonical = []

for (const r of redactions) {
	const canonHash = r.origHash || r.hash

	if (!seen.has(canonHash)) {
		seen.add(canonHash)
		canonical.push({
			hash: r.hash,
			canonHash,
			labelPrefix: r.labelPrefix,
			labelIndex: r.labelIndex,
			piece: r.piece,
			pieces: r.pieces,
			hint: r.hint,
			length: r.length,
			firstChar: r.firstChar,
		})
	}
}

console.log(`Salt: ${salt}`)
console.log(`Total redaction entries: ${redactions.length}`)
console.log(`Unique canonical hashes: ${canonical.length}`)
console.log()

canonical.forEach((c, i) => {
	const pieceStr = c.piece ?? (c.pieces ?? 'unknown').join(', ')
	console.log(
		`  $${i + 1}: ${c.labelPrefix}_${c.labelIndex} (hash: ${c.canonHash.slice(0, 12)}...) - piece: ${pieceStr}, hint: "${c.hint}", length: ${c.length}, firstChar: "${c.firstChar}"`,
	)
})

// Also show all labels grouped by canonical hash
console.log('\nAll labels grouped by canonical hash:')
const byCanon = new Map()

for (const r of redactions) {
	const canonHash = r.origHash || r.hash
	if (!byCanon.has(canonHash)) {
		byCanon.set(canonHash, [])
	}
	byCanon.get(canonHash).push(`${r.labelPrefix}_${r.labelIndex}`)
}

for (const [hash, labels] of byCanon.entries()) {
	console.log(`  ${hash.slice(0, 12)}... -> ${labels.join(', ')}`)
}

// Count ~R: occurrences
const raw = readFileSync(filePath, 'utf8')
const rPattern = /~R:/g
const matches = raw.match(rPattern)
console.log(`\nTotal ~R: occurrences in file: ${matches ? matches.length : 0}`)

// Show unique escape characters used
const escapeChars = new Set()
for (const r of redactions) {
	// The escape char isn't stored in the redaction entry itself,
	// it's embedded in the ~R: strings
}

console.log('\nDone.')