import * as fs from 'fs'
import * as path from 'path'
import * as prettier from 'prettier'
import ts from 'typescript'

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
function extractJSDocLines(sourceText: string, node: ts.Node): string[] {
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

	return cleaned
}

/** Convert JSDoc lines to a description, preserving paragraph breaks. */
function jsDocToDescription(lines: string[]): string {
	if (lines.length === 0) {
		return ''
	}

	const paragraphs: string[][] = [[]]

	for (const line of lines) {
		if (line.trim() === '') {
			paragraphs.push([])
		} else {
			paragraphs[paragraphs.length - 1].push(line.trim())
		}
	}

	return paragraphs
		.filter(p => p.length > 0)
		.map(p => p.join(' '))
		.join('\n\n')
}

/** Convert JSDoc lines to a single-line description. */
function jsDocToSingleLine(lines: string[]): string {
	return lines
		.filter(l => l.trim() !== '')
		.map(l => l.trim())
		.join(' ')
		.trim()
		.replace(/\b0x[0-9a-fA-F]+\b/g, match => `\`${match}\``)
		.replace(/\[(\d+)\]/g, '\\[$1\\]')
}

// --- Type Rendering ---

function renderInterfaceMembers(
	sourceFile: ts.SourceFile,
	sourceText: string,
	members: ts.NodeArray<ts.TypeElement>,
): string {
	const lines: string[] = []

	for (const member of members) {
		if (!ts.isPropertySignature(member)) {
			continue
		}

		const name = member.name.getText(sourceFile)
		const rawType = member.type?.getText(sourceFile) ?? 'unknown'
		const type = rawType.replace(/\s+/g, ' ').trim()
		const optional = member.questionToken !== undefined ? ', optional' : ''
		const desc = jsDocToSingleLine(extractJSDocLines(sourceText, member))
		const descPart = desc ? `: ${desc}` : ''

		lines.push(`- \`${name}\` (\`${type}\`${optional})${descPart}`)
	}

	if (lines.length === 0) {
		return '_No properties._\n'
	}

	return lines.join('\n') + '\n'
}

function renderEnumMembers(
	sourceFile: ts.SourceFile,
	sourceText: string,
	members: ts.NodeArray<ts.EnumMember>,
): string {
	const lines: string[] = []

	for (const member of members) {
		const name = member.name.getText(sourceFile)
		const value = member.initializer?.getText(sourceFile) ?? '(auto)'
		const desc = jsDocToSingleLine(extractJSDocLines(sourceText, member))
		const descPart = desc ? `: ${desc}` : ''

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
function processFile(filePath: string, srcRoot: string): FileResult {
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

		const jsdocLines = extractJSDocLines(sourceText, stmt)
		const desc = jsDocToDescription(jsdocLines)

		if (ts.isInterfaceDeclaration(stmt)) {
			const typeParams = getTypeParams(stmt.typeParameters, sourceFile)

			content += `### Interface: \`${stmt.name.text}${typeParams}\`\n\n`

			if (desc) {
				content += desc + '\n\n'
			}

			content += renderInterfaceMembers(sourceFile, sourceText, stmt.members)
			content += '\n---\n\n'
		} else if (ts.isEnumDeclaration(stmt)) {
			content += `### Enum: \`${stmt.name.text}\`\n\n`

			if (desc) {
				content += desc + '\n\n'
			}

			content += renderEnumMembers(sourceFile, sourceText, stmt.members)
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
				content += renderInterfaceMembers(sourceFile, sourceText, typeNode.members)
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
		const result = processFile(filePath, config.srcRoot)

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
