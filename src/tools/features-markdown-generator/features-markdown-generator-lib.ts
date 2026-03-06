import * as fs from 'fs'
import * as path from 'path'
import * as prettier from 'prettier'
import ts from 'typescript'

import { assertValidMarkdown } from '@/tests/utils/assert-valid-markdown'

export interface FeaturesMarkdownConfig {
	featuresSrcFile: string
	featuresDir: string
	outputPath: string
	srcRoot: string
	quiet: boolean
	test: boolean
}

interface FileResult {
	relPath: string
	content: string
}

// --- JSDoc Extraction ---

/**
 * Extracts JSDoc comment lines from a node's leading trivia.
 * Returns cleaned lines (leading "* " stripped, @tag lines removed).
 */
async function extractJSDocLines(sourceText: string, node: ts.Node): Promise<string[]> {
	const ranges = ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? []
	let lastJsDocRange: ts.CommentRange | undefined

	for (const range of ranges) {
		if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
			if (sourceText.slice(range.pos, range.pos + 3) === '/**') {
				lastJsDocRange = range
			}
		}
	}

	if (lastJsDocRange === undefined) {
		return []
	}

	// Extract text between /** and */
	const raw = sourceText.slice(lastJsDocRange.pos + 3, lastJsDocRange.end - 2)
	const cleaned: string[] = []

	for (const line of raw.split('\n')) {
		// Strip leading * prefix and surrounding whitespace
		const stripped = line.replace(/^\s*\*\s?/, '').trimEnd()

		// Skip @tag lines
		if (/^\s*@\w/.test(stripped)) {
			continue
		}

		cleaned.push(stripped)
	}
	// Trim leading/trailing empty lines
	while (cleaned.length > 0 && cleaned[0].trim() === '') {
		cleaned.shift()
	}
	while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
		cleaned.pop()
	}

	await assertValidMarkdown(cleaned.join('\n') + '\n')

	return cleaned
}

/**
 * Convert JSDoc lines to a description.
 * - Prose lines within a paragraph are joined with spaces.
 * - List items (`- `, `* `) and their continuations preserve line breaks.
 * - Fenced code blocks (``` ... ```) are preserved verbatim.
 * - Blank lines separate segments with a double newline.
 */
function jsDocToDescription(lines: string[]): string {
	if (lines.length === 0) {
		return ''
	}

	type SegmentType = 'prose' | 'list' | 'code'
	type Segment = { type: SegmentType; lines: string[] }
	const segments: Segment[] = []
	const lastSeg = (): Segment | undefined => segments[segments.length - 1]
	let inCode = false

	for (const line of lines) {
		const trimmed = line.trim()

		if (trimmed.startsWith('```')) {
			if (!inCode) {
				inCode = true
				segments.push({ type: 'code', lines: [trimmed] })
			} else {
				inCode = false
				lastSeg()!.lines.push(trimmed)
			}
		} else if (inCode) {
			lastSeg()!.lines.push(line)
		} else if (trimmed === '') {
			if (lastSeg() !== undefined) {
				segments.push({ type: 'prose', lines: [] })
			}
		} else if (/^[-*+] /.test(trimmed) || (/^ {2,}/.test(line) && lastSeg()?.type === 'list')) {
			if (lastSeg()?.type !== 'list') {
				segments.push({ type: 'list', lines: [] })
			}

			lastSeg()!.lines.push(line)
		} else {
			if (lastSeg()?.type !== 'prose') {
				segments.push({ type: 'prose', lines: [] })
			}

			lastSeg()!.lines.push(trimmed)
		}
	}

	return segments
		.filter(s => s.lines.length > 0)
		.map(s => (s.type === 'prose' ? s.lines.join(' ') : s.lines.join('\n')))
		.join('\n\n')
}

/**
 * Format a description string for embedding inside a markdown list item.
 * The first line continues the bullet; subsequent lines are indented 2 spaces.
 * Blank lines are preserved unindented.
 */
function descriptionForListItem(desc: string): string {
	return desc
		.split('\n')
		.map((l, i) => (i === 0 || l.trim() === '' ? l : '  ' + l))
		.join('\n')
}

/**
 * Get the display string for a TypeScript type node.
 * Block comments (including JSDoc trivia) are stripped and whitespace normalized.
 * Inline object literal types are handled by the caller via nested sub-bullets.
 */
function typeDisplay(typeNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile): string {
	if (typeNode === undefined) {
		return 'unknown'
	}

	return typeNode
		.getText(sourceFile)
		.replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments (incl. JSDoc)
		.replace(/\/\/[^\n]*/g, '') // strip line comments
		.replace(/\s+/g, ' ')
		.trim()
}

// --- Type Rendering ---

async function renderInterfaceMembers(
	sourceFile: ts.SourceFile,
	sourceText: string,
	members: ts.NodeArray<ts.TypeElement>,
	indent: string = '',
): Promise<string> {
	const lines: string[] = []

	for (const member of members) {
		if (!ts.isPropertySignature(member)) {
			continue
		}

		const name = member.name.getText(sourceFile)
		const optional = member.questionToken !== undefined ? ', optional' : ''
		const desc = jsDocToDescription(await extractJSDocLines(sourceText, member))
		const descPart = desc ? `: ${descriptionForListItem(desc)}` : ''

		if (member.type !== undefined && ts.isTypeLiteralNode(member.type)) {
			// Inline object type: expand its members as nested sub-bullets
			lines.push(`${indent}- \`${name}\` (object${optional})${descPart}`)
			const nested = await renderInterfaceMembers(
				sourceFile,
				sourceText,
				member.type.members,
				indent + '  ',
			)

			for (const nestedLine of nested.trimEnd().split('\n')) {
				lines.push(nestedLine)
			}
		} else {
			const type = typeDisplay(member.type, sourceFile)

			lines.push(`${indent}- \`${name}\` (\`${type}\`${optional})${descPart}`)
		}
	}

	if (lines.length === 0) {
		return `${indent}_No properties._\n`
	}

	return lines.join('\n') + '\n'
}

async function renderEnumMembers(
	sourceFile: ts.SourceFile,
	sourceText: string,
	members: ts.NodeArray<ts.EnumMember>,
): Promise<string> {
	const lines: string[] = []

	for (const member of members) {
		const name = member.name.getText(sourceFile)
		const value = member.initializer?.getText(sourceFile) ?? '(auto)'
		const desc = jsDocToDescription(await extractJSDocLines(sourceText, member))
		const descPart = desc ? `: ${descriptionForListItem(desc)}` : ''

		lines.push(`- \`${name}\` = \`${value}\`${descPart}`)
	}

	if (lines.length === 0) {
		return '_No members._\n'
	}

	return lines.join('\n') + '\n'
}

// --- Declaration Processing ---

function isExported(
	decl: ts.InterfaceDeclaration | ts.EnumDeclaration | ts.TypeAliasDeclaration,
): boolean {
	return (ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Export) !== 0
}

function getTypeParams(
	typeParams: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
	sourceFile: ts.SourceFile,
): string {
	if (typeParams === undefined || typeParams.length === 0) {
		return ''
	}

	return '<' + typeParams.map(tp => tp.getText(sourceFile)).join(', ') + '>'
}

/** Process a single TypeScript file, returning its relative path and generated Markdown content. */
async function processFile(filePath: string, srcRoot: string): Promise<FileResult> {
	const sourceText = fs.readFileSync(filePath, 'utf-8')
	const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
	const relPath = path.relative(srcRoot, filePath)
	let content = ''

	for (const stmt of sourceFile.statements) {
		if (
			!ts.isInterfaceDeclaration(stmt) &&
			!ts.isEnumDeclaration(stmt) &&
			!ts.isTypeAliasDeclaration(stmt)
		) {
			continue
		}

		if (!isExported(stmt)) {
			continue
		}

		const jsdocLines = await extractJSDocLines(sourceText, stmt)
		const desc = jsDocToDescription(jsdocLines)

		if (ts.isInterfaceDeclaration(stmt)) {
			const typeParams = getTypeParams(stmt.typeParameters, sourceFile)

			content += `### Interface: \`${stmt.name.text}${typeParams}\`\n\n`

			if (desc) {
				content += desc + '\n\n'
			}

			content += await renderInterfaceMembers(sourceFile, sourceText, stmt.members)
			content += '\n---\n\n'
		} else if (ts.isEnumDeclaration(stmt)) {
			content += `### Enum: \`${stmt.name.text}\`\n\n`

			if (desc) {
				content += desc + '\n\n'
			}

			content += await renderEnumMembers(sourceFile, sourceText, stmt.members)
			content += '\n---\n\n'
		} else {
			// TypeAliasDeclaration
			const typeParams = getTypeParams(stmt.typeParameters, sourceFile)

			content += `### Type: \`${stmt.name.text}${typeParams}\`\n\n`

			if (desc) {
				content += desc + '\n\n'
			}

			const typeNode = stmt.type

			if (ts.isTypeLiteralNode(typeNode)) {
				content += await renderInterfaceMembers(sourceFile, sourceText, typeNode.members)
			} else {
				const typeText = typeNode.getText(sourceFile)

				content += '```typescript\n'
				content += `type ${stmt.name.text}${typeParams} = ${typeText}\n`
				content += '```\n'
			}

			content += '\n---\n\n'
		}
	}

	return { relPath, content }
}

// --- File Collection ---

/** Collect all .ts files under a directory, sorted alphabetically by absolute path. */
function collectTsFiles(dir: string): string[] {
	const result: string[] = []

	if (!fs.existsSync(dir)) {
		return result
	}

	function collect(currentDir: string): void {
		const entries = fs.readdirSync(currentDir, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name)

			if (entry.isDirectory()) {
				collect(fullPath)
			} else if (entry.isFile() && entry.name.endsWith('.ts')) {
				result.push(fullPath)
			}
		}
	}

	collect(dir)

	return result.sort()
}

/** Compute a GitHub-flavored Markdown anchor from a relative file path. */
function pathToAnchor(relPath: string): string {
	// GFM anchor: lowercase, remove non-alphanumeric/space/hyphen, spaces → hyphens
	return relPath
		.toLowerCase()
		.replace(/[^a-z0-9 -]/g, '')
		.replace(/ /g, '-')
}

// --- Main Generator ---

export async function generateMarkdown(config: FeaturesMarkdownConfig): Promise<string> {
	// Build ordered file list: features.ts first, then sub-files alphabetically
	const files: string[] = [config.featuresSrcFile, ...collectTsFiles(config.featuresDir)]

	// Process each file
	const fileResults: FileResult[] = []

	for (const filePath of files) {
		const result = await processFile(filePath, config.srcRoot)

		if (result.content) {
			fileResults.push(result)
		}
	}

	// Build Table of Contents
	const tocLines = fileResults.map(({ relPath }) => {
		const anchor = pathToAnchor(relPath)

		return `- [\`${relPath}\`](#${anchor})`
	})

	// Build per-file content sections
	let sections = ''

	for (const { relPath, content } of fileResults) {
		sections += `## \`${relPath}\`\n\n`
		sections += content
	}

	const raw =
		'# Walletbeat Feature Types Reference\n' +
		'\n' +
		'_Auto-generated from TypeScript source. Run `pnpm fix` to regenerate._\n' +
		'\n' +
		'> This document describes all feature types used to evaluate Ethereum wallets in Walletbeat.\n' +
		'> Types are defined in `src/schema/features.ts` and its sub-modules.\n' +
		'>\n' +
		'> **Core concepts:**\n' +
		'>\n' +
		"> - `Support<T>` — Discriminated union: `{ support: 'NOT_SUPPORTED' }` OR `{ support: 'SUPPORTED', ...T }`\n" +
		'> - `VariantFeature<T>` — Variant-specific value (browser/mobile/desktop); resolved to a single value at evaluation time\n' +
		'> - `WithRef<T>` — Adds optional `ref: Reference[]` (citations) to type T\n' +
		'> - `MustRef<T>` — Adds mandatory `ref: Reference[]` to type T\n' +
		'> - `Nullable<T>` — All fields of T become nullable (i.e. `T[K] | null` for all K); the whole object may also be `null`\n' +
		'\n' +
		'## Table of Contents\n' +
		'\n' +
		tocLines.join('\n') +
		'\n' +
		'\n' +
		'---\n' +
		'\n' +
		sections.trimEnd() +
		'\n'

	await assertValidMarkdown(raw)

	const prettierConfig = (await prettier.resolveConfig(config.outputPath)) ?? {}

	return prettier.format(raw, { ...prettierConfig, parser: 'markdown' })
}

// --- Public API ---

export async function featuresMarkdownUpdate(config: FeaturesMarkdownConfig): Promise<void> {
	const markdownContent = await generateMarkdown(config)

	if (config.test) {
		if (!fs.existsSync(config.outputPath)) {
			throw new Error('docs/features.md does not exist. Run `pnpm fix` to generate it.')
		}

		const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

		if (existingContent.trim() !== markdownContent.trim()) {
			throw new Error(
				'docs/features.md is out of sync with the TypeScript source. Run `pnpm fix` to regenerate.',
			)
		}
	} else {
		if (fs.existsSync(config.outputPath)) {
			const existingContent = fs.readFileSync(config.outputPath, 'utf-8')

			if (existingContent.trim() === markdownContent.trim()) {
				// Already up to date
				return
			}
		}

		fs.mkdirSync(path.dirname(config.outputPath), { recursive: true })
		fs.writeFileSync(config.outputPath, markdownContent)
	}
}
