export type CssAttributeDoc = {
	component?: string
	purpose?: string
	usage?: string[]
	tokens?: string[]
	cssVariables?: string[]
}

export type CssAttributeEntry = {
	name: string
	doc: CssAttributeDoc
	docMarkdown?: string
	values: Set<string>
	cssVariables: Set<string>
	sourceSelector: string
}

type CssCommentedBlock = {
	comment: string
	selectorHeader: string
	body: string
	/** When true, `docMarkdown` is appended to any existing entry (subsection inside a larger rule). */
	nested?: boolean
}

const joinDocMarkdown = (previous: string | undefined, next: string): string => {
	const p = previous?.trim() ?? ''
	const n = next.trim()

	if (p.length === 0) {
		return n
	}

	if (n.length === 0) {
		return p
	}

	return `${p}\n\n---\n\n${n}`
}

// Parses documentation comments that sit immediately before a nested selector block inside `{ … }`.
const findNestedCommentedBlocksInBody = (body: string): CssCommentedBlock[] => {
	const out: CssCommentedBlock[] = []
	let i = 0

	while (i < body.length) {
		const commentStart = body.indexOf('/**', i)

		if (commentStart === -1) {
			break
		}

		const commentEnd = body.indexOf('*/', commentStart + 3)

		if (commentEnd === -1) {
			break
		}

		const comment = body.slice(commentStart, commentEnd + 2)
		let pos = commentEnd + 2

		while (pos < body.length && /\s/.test(body[pos])) {
			pos += 1
		}

		const braceStart = body.indexOf('{', pos)

		if (braceStart === -1) {
			break
		}

		const selectorHeader = body.slice(pos, braceStart).trim()
		let depth = 0
		let cursor = braceStart
		let braceEnd = -1

		for (; cursor < body.length; cursor += 1) {
			if (body[cursor] === '{') {
				depth += 1
			} else if (body[cursor] === '}') {
				depth -= 1

				if (depth === 0) {
					braceEnd = cursor
					break
				}
			}
		}

		if (braceEnd === -1) {
			break
		}

		const nestedBody = body.slice(braceStart + 1, braceEnd)

		out.push({ comment, selectorHeader, body: nestedBody, nested: true })
		out.push(...findNestedCommentedBlocksInBody(nestedBody))
		i = braceEnd + 1
	}

	return out
}

const parseCommentBlock = (rawComment: string): CssAttributeDoc => {
	const lines = rawComment
		.replace(/^\/\*\*|\*\/$/g, '')
		.split('\n')
		.map(line => line.replace(/^\s*\*\s?/, '').trim())
		.filter(Boolean)

	const readList = (sectionName: string): string[] | undefined => {
		const sectionIndex = lines.findIndex(line => line.startsWith(`${sectionName}:`))

		if (sectionIndex === -1) {
			return undefined
		}

		const inlineValue = lines[sectionIndex].replace(`${sectionName}:`, '').trim()

		if (inlineValue.length > 0) {
			return [inlineValue]
		}

		const values: string[] = []

		for (const line of lines.slice(sectionIndex + 1)) {
			if (!line.startsWith('- ')) {
				break
			}

			values.push(line.slice(2).trim())
		}

		return values.length === 0 ? undefined : values
	}

	return {
		component: lines
			.find(line => line.startsWith('Component:'))
			?.replace('Component:', '')
			.trim(),
		purpose: lines
			.find(line => line.startsWith('Purpose:'))
			?.replace('Purpose:', '')
			.trim(),
		usage: readList('Usage'),
		tokens: readList('Tokens'),
		cssVariables: readList('CSS Variables'),
	}
}

const parseCommentMarkdown = (rawComment: string): string =>
	rawComment
		.replace(/^\/\*\*|\*\/$/g, '')
		.split('\n')
		.map(line => line.replace(/^\s*\* ?/, ''))
		.join('\n')
		.trim()

const findCommentedBlocks = (css: string): CssCommentedBlock[] => {
	const blocks: CssCommentedBlock[] = []
	let index = 0

	while (index < css.length) {
		const commentStart = css.indexOf('/**', index)

		if (commentStart === -1) {
			break
		}

		const commentEnd = css.indexOf('*/', commentStart + 3)

		if (commentEnd === -1) {
			break
		}

		const comment = css.slice(commentStart, commentEnd + 2)
		const selectorStart = commentEnd + 2
		const braceStart = css.indexOf('{', selectorStart)

		if (braceStart === -1) {
			break
		}

		const interstitial = css.slice(selectorStart, braceStart)

		if (interstitial.includes('/**')) {
			index = commentEnd + 2
			continue
		}

		const selectorHeader = css.slice(selectorStart, braceStart).trim()
		let depth = 0
		let cursor = braceStart
		let braceEnd = -1

		for (; cursor < css.length; cursor += 1) {
			if (css[cursor] === '{') {
				depth += 1
			} else if (css[cursor] === '}') {
				depth -= 1

				if (depth === 0) {
					braceEnd = cursor
					break
				}
			}
		}

		if (braceEnd === -1) {
			break
		}

		const innerBody = css.slice(braceStart + 1, braceEnd)

		blocks.push({
			comment,
			selectorHeader,
			body: innerBody,
		})
		blocks.push(...findNestedCommentedBlocksInBody(innerBody))

		index = braceEnd + 1
	}

	return blocks
}

const normalizeToken = (token: string): string[] => {
	const cleaned = token.replace(/[`'"]/g, '').trim()
	const numericRangeMatch = cleaned.match(/^(.*?)(\d+)\.\.(\d+)$/)

	if (numericRangeMatch !== null) {
		const prefix = numericRangeMatch[1]
		const start = Number(numericRangeMatch[2])
		const end = Number(numericRangeMatch[3])

		return Number.isFinite(start) && Number.isFinite(end) && end >= start
			? Array.from({ length: end - start + 1 }, (_, i) => `${prefix}${start + i}`)
			: [cleaned]
	}

	const simpleRangeMatch = cleaned.match(/^(.*)\.\.(\d+)$/)

	if (simpleRangeMatch !== null) {
		const prefix = simpleRangeMatch[1]
		const end = Number(simpleRangeMatch[2])

		return Number.isFinite(end)
			? Array.from({ length: end + 1 }, (_, i) => `${prefix}${i}`)
			: [cleaned]
	}

	return [cleaned]
}

const addDocValues = (entry: CssAttributeEntry): void => {
	for (const tokenGroup of entry.doc.tokens ?? []) {
		for (const tokenMatch of tokenGroup.matchAll(/`([^`]+)`/g)) {
			for (const normalized of normalizeToken(tokenMatch[1])) {
				if (normalized.length > 0) {
					entry.values.add(normalized)
				}
			}
		}
	}

	for (const cssVar of entry.doc.cssVariables ?? []) {
		const varMatch = cssVar.match(/`(--[a-zA-Z0-9-_]+)`/)

		if (varMatch !== null) {
			entry.cssVariables.add(varMatch[1])
		}
	}
}

export const parseCssAttributes = (css: string): Map<string, CssAttributeEntry> => {
	const entries = new Map<string, CssAttributeEntry>()
	const parseAttributeNames = (text: string): string[] => [
		...new Set([...text.matchAll(/\[data-([a-z0-9-]+)/g)].map(match => `data-${match[1]}`)),
	]

	for (const block of findCommentedBlocks(css)) {
		const doc = parseCommentBlock(block.comment)
		const docMarkdown = parseCommentMarkdown(block.comment)
		const blockText = `${block.selectorHeader}\n${block.body}`
		const selectorAttributeNames = parseAttributeNames(block.selectorHeader)
		const allBlockAttributeNames = parseAttributeNames(blockText)
		const nestedAttributeNames = allBlockAttributeNames.filter(
			name => !selectorAttributeNames.includes(name),
		)

		for (const name of selectorAttributeNames) {
			const existing = entries.get(name)

			if (existing === undefined) {
				entries.set(name, {
					name,
					doc: { ...doc },
					docMarkdown,
					values: new Set<string>(),
					cssVariables: new Set<string>(),
					sourceSelector: `[${name}]`,
				})
				continue
			}

			existing.doc = {
				...existing.doc,
				...doc,
			}
			existing.docMarkdown =
				block.nested === true ? joinDocMarkdown(existing.docMarkdown, docMarkdown) : docMarkdown
			existing.sourceSelector = `[${name}]`
		}

		for (const name of nestedAttributeNames) {
			const existingNested = entries.get(name)

			if (existingNested === undefined) {
				entries.set(name, {
					name,
					doc: { ...doc },
					docMarkdown,
					values: new Set<string>(),
					cssVariables: new Set<string>(),
					sourceSelector: `[${name}]`,
				})
				continue
			}

			if (block.nested === true) {
				existingNested.doc = {
					...existingNested.doc,
					...doc,
				}
				existingNested.docMarkdown = joinDocMarkdown(existingNested.docMarkdown, docMarkdown)
			}
		}

		for (const tokenMatch of blockText.matchAll(
			/\[(data-[a-z0-9-]+)~=(?:'([^']*)'|"([^"]*)")\]/g,
		)) {
			const name = tokenMatch[1]
			const token = tokenMatch[2] ?? tokenMatch[3]
			const entry = entries.get(name)

			if (entry !== undefined && token !== undefined && token.length > 0) {
				entry.values.add(token)
			}
		}

		for (const cssVarMatch of blockText.matchAll(/--[a-zA-Z0-9-_]+/g)) {
			for (const name of allBlockAttributeNames) {
				entries.get(name)?.cssVariables.add(cssVarMatch[0])
			}
		}
	}

	for (const entry of entries.values()) {
		addDocValues(entry)
	}

	return entries
}
