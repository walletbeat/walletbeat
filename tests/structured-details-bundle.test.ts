import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from './utils/codebase'

const root = getRepositoryRoot()

const clientSafeStructuredDetailsModules = new Set(['src/utils/structured-details/context.ts'])
const serverOnlyEntryPoints = new Set([
	'src/utils/wallet-page-markdown.ts',
	'src/utils/wallet-json-export.ts',
])
const webViewModules = [
	'src/views/attributes/privacy/AddressCorrelationDetails.svelte',
	'src/views/attributes/privacy/PrivateTransfersDetails.svelte',
	'src/views/attributes/security/AccountRecoveryDetails.svelte',
	'src/views/attributes/security/ChainVerificationDetails.svelte',
	'src/views/attributes/security/ScamPreventionDetails.svelte',
	'src/views/attributes/security/SecurityAuditsDetails.svelte',
	'src/views/attributes/self-sovereignty/AccountUnruggabilityDetails.svelte',
	'src/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte',
	'src/views/attributes/transparency/FundingDetails.svelte',
]
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.svelte', '.astro']

function resolveImport(specifier: string, fromFile: string): string | null {
	const cleanSpecifier = specifier.split(/[?#]/)[0]
	const relative = cleanSpecifier.startsWith('@/data/')
		? cleanSpecifier.replace('@/data/', 'data/')
		: cleanSpecifier.startsWith('@/tests/')
			? cleanSpecifier.replace('@/tests/', 'tests/')
			: cleanSpecifier.startsWith('@/')
				? cleanSpecifier.replace('@/', 'src/')
				: cleanSpecifier.startsWith('.')
					? path.join(path.dirname(fromFile), cleanSpecifier)
					: null

	if (relative === null) {
		return null
	}

	const candidates = [
		relative,
		...sourceExtensions.map(extension => `${relative}${extension}`),
		...sourceExtensions.map(extension => path.join(relative, `index${extension}`)),
	]

	for (const candidate of candidates) {
		const absolute = path.join(root, candidate)

		if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
			return path.normalize(candidate).split(path.sep).join('/')
		}
	}

	return null
}

function isRuntimeImport(node: ts.ImportDeclaration): boolean {
	const clause = node.importClause

	if (clause === undefined) {
		return true
	}

	if (clause.isTypeOnly) {
		return false
	}

	if (clause.name !== undefined || clause.namedBindings === undefined) {
		return true
	}

	return (
		ts.isNamespaceImport(clause.namedBindings) ||
		clause.namedBindings.elements.some(element => !element.isTypeOnly)
	)
}

function isRuntimeExport(node: ts.ExportDeclaration): boolean {
	if (node.isTypeOnly) {
		return false
	}

	return (
		node.exportClause === undefined ||
		!ts.isNamedExports(node.exportClause) ||
		node.exportClause.elements.some(element => !element.isTypeOnly)
	)
}

function runtimeModuleSpecifiers(filePath: string, source: string): string[] {
	const sourceFile = ts.createSourceFile(
		filePath,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	)
	const specifiers = new Set<string>()

	function addModuleSpecifier(expression: ts.Expression | undefined) {
		if (expression !== undefined && ts.isStringLiteralLike(expression)) {
			specifiers.add(expression.text)
		}
	}

	function visit(node: ts.Node) {
		if (ts.isImportDeclaration(node) && isRuntimeImport(node)) {
			addModuleSpecifier(node.moduleSpecifier)
		} else if (ts.isExportDeclaration(node) && isRuntimeExport(node)) {
			addModuleSpecifier(node.moduleSpecifier)
		} else if (
			ts.isCallExpression(node) &&
			(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
				(ts.isIdentifier(node.expression) && node.expression.text === 'require'))
		) {
			addModuleSpecifier(node.arguments[0])
		}

		ts.forEachChild(node, visit)
	}

	visit(sourceFile)

	return [...specifiers]
}

function reachableModules(entry: string): Set<string> {
	const seen = new Set<string>()
	const queue = [entry]

	while (queue.length > 0) {
		const current = queue.pop()

		if (current === undefined || seen.has(current)) {
			continue
		}

		seen.add(current)

		const source = fs.readFileSync(path.join(root, current), { encoding: 'utf-8' })

		for (const specifier of runtimeModuleSpecifiers(current, source)) {
			const resolved = resolveImport(specifier, current)

			if (resolved !== null) {
				queue.push(resolved)
			}
		}
	}

	return seen
}

describe('structured details client dependency boundary', () => {
	const webModules = reachableModules('src/views/attributes/structured-details-registry.ts')

	it('follows every registered web view', () => {
		for (const viewModule of webViewModules) {
			expect(webModules.has(viewModule)).toBe(true)
		}
	})

	it('does not reach server adapters or export entry points', () => {
		const serverModules = [...webModules].filter(
			module =>
				serverOnlyEntryPoints.has(module) ||
				(module.startsWith('src/utils/structured-details/') &&
					!clientSafeStructuredDetailsModules.has(module)),
		)

		expect(serverModules).toEqual([])
	})
})
