import { describe, expect, it } from 'vitest'

import { ContentType, type MarkdownContent } from '@/types/content'
import {
	collapseToSingleLine,
	extractMarkdownLinks,
	parseMarkdownWithFrontmatter,
	rewriteMarkdownURLs,
} from '@/utils/markdown-utils'

function makeContent(markdown: string): MarkdownContent<null> {
	return { contentType: ContentType.MARKDOWN, markdown }
}

describe('collapseToSingleLine', () => {
	it('collapses whitespace and trims', () => {
		expect(collapseToSingleLine('  foo   bar  \n  baz  ')).toBe('foo bar baz')
	})

	it('throws on triple-backtick code blocks', () => {
		expect(() => collapseToSingleLine('text with ```code``` here')).toThrow(
			'collapseToSingleLine does not support triple-backtick code blocks',
		)
	})

	it('throws on blockquote lines', () => {
		expect(() => collapseToSingleLine('> quoted line')).toThrow(
			'collapseToSingleLine does not support blockquote lines',
		)
		expect(() => collapseToSingleLine('normal line\n> blockquote')).toThrow(
			'collapseToSingleLine does not support blockquote lines',
		)
	})
})

describe('rewriteMarkdownURLs', () => {
	const defaultOptions = {
		repoRootRelativePath: '/src/docs/docs/intro.md' as const,
		repoRootPagesDir: '/src/pages/' as const,
		repoRootRelativePaths: {
			'/src/docs': '/' as const,
			'/src/pages': '/pages' as const,
			'/public': '/' as const,
		},
	} as const

	// --- Basic link rewriting ---

	it('rewrites absolute path links', () => {
		const content = makeContent('Check [the docs](/src/docs/docs/guide.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('Check [the docs](/docs/guide.html)')
	})

	it('rewrites image links', () => {
		const content = makeContent('![logo](/src/docs/assets/logo.png)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('![logo](/assets/logo.png)')
	})

	it('handles links with titles', () => {
		const content = makeContent('[guide](/src/docs/docs/guide.html "The Guide")')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[guide](/docs/guide.html "The Guide")')
	})

	it('handles multiple links in the same content', () => {
		const content = makeContent('Link [one](/src/docs/a.html) and [two](/public/b.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('Link [one](/a.html) and [two](/b.html)')
	})

	it('removes the last component of pages files', () => {
		const content = makeContent('[link](/src/pages/hello/world.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/pages/hello/)')
	})

	// --- Relative path handling ---

	it('resolves relative paths (./) from source file location', () => {
		const content = makeContent('[link](./guide.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/docs/guide.html)')
	})

	it('resolves relative paths (../) from source file location upwards', () => {
		const content = makeContent('[link](../other/page.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/other/page.html)')
	})

	it('resolves relative paths to pages files', () => {
		const content = makeContent('[link](../../pages/hello/world.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/pages/hello/)')
	})

	it('throws for deeply nested relative path that goes outside known prefixes', () => {
		const content = makeContent('[link](../../root/page.html)')

		// ../../root/page.html from /src/docs/docs/intro.md resolves to /src/root/page.html
		// but /src doesn't match /src/docs, so it should throw
		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow()
	})

	it('handles relative paths with trailing slash', () => {
		const content = makeContent('[link](./guide/)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/docs/guide/)')
	})

	it('handles relative paths with ../ and trailing slash', () => {
		const content = makeContent('[link](../other/)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/other/)')
	})

	it('handles deeply nested relative paths with trailing slash', () => {
		const content = makeContent('[link](../../../public/assets/)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/assets/)')
	})

	// --- URLs that should NOT be rewritten ---

	it('does not rewrite https:// URLs', () => {
		const content = makeContent('[external](https://example.com/path)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[external](https://example.com/path)')
	})

	it('does not rewrite http:// URLs', () => {
		const content = makeContent('[external](http://example.com/path)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[external](http://example.com/path)')
	})

	it('does not rewrite mailto: links', () => {
		const content = makeContent('[email](mailto:test@example.com)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[email](mailto:test@example.com)')
	})

	it('does not rewrite anchor-only links (#section)', () => {
		const content = makeContent('[section](#getting-started)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[section](#getting-started)')
	})

	it('does not rewrite absolute URLs with hash', () => {
		const content = makeContent('[section](/src/docs/page.html#overview)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[section](/page.html#overview)')
	})

	it('preserves the strings property', () => {
		const content: MarkdownContent<{ key: string }> = {
			contentType: ContentType.MARKDOWN,
			markdown: '[test](/src/docs/page.html)',
			strings: { key: 'value' },
		}
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.strings).toBe(content.strings)
	})

	// --- Code block exclusion ---

	it('does not rewrite URLs inside code blocks', () => {
		const content = makeContent(['```', '[link](/src/docs/page.html)', '```'].join('\n'))
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(['```', '[link](/src/docs/page.html)', '```'].join('\n'))
	})

	it('does not rewrite URLs inside inline code', () => {
		const content = makeContent('Use `[link](/src/docs/page.html)` here')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('Use `[link](/src/docs/page.html)` here')
	})

	it('rewrites URLs outside code blocks but not inside', () => {
		const content = makeContent(
			[
				'[real](/src/docs/a.html)',
				'',
				'```',
				'[fake](/src/docs/b.html)',
				'```',
				'',
				'[real2](/src/docs/c.html)',
			].join('\n'),
		)
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(
			[
				'[real](/a.html)',
				'',
				'```',
				'[fake](/src/docs/b.html)',
				'```',
				'',
				'[real2](/c.html)',
			].join('\n'),
		)
	})

	it('does not rewrite URLs inside indented code blocks', () => {
		const content = makeContent(['    [code block link](/src/docs/page.html)'].join('\n'))
		const result = rewriteMarkdownURLs(content, defaultOptions)

		// Indented code blocks (4+ spaces) should be preserved
		expect(result.markdown).toBe('    [code block link](/src/docs/page.html)')
	})

	// --- Forbidden URL prefixes ---

	it('throws for URLs matching forbidden prefixes', () => {
		const content = makeContent('[link](https://forbidden.com/page)')

		expect(() =>
			rewriteMarkdownURLs(content, {
				...defaultOptions,
				forbiddenURLPrefixes: ['https://forbidden.com'],
			}),
		).toThrow()
	})

	it('does not throw for whitelisted URLs in forbidden prefixes', () => {
		const content = makeContent('[link](https://forbidden.com/allowed)')
		const result = rewriteMarkdownURLs(content, {
			...defaultOptions,
			forbiddenURLPrefixes: ['https://forbidden.com'],
			whitelistURLs: ['https://forbidden.com/allowed'],
		})

		expect(result.markdown).toBe('[link](https://forbidden.com/allowed)')
	})

	it('throws for URLs partially matching forbidden prefix', () => {
		const content = makeContent('[link](https://forbidden.com/sub/page)')

		expect(() =>
			rewriteMarkdownURLs(content, {
				...defaultOptions,
				forbiddenURLPrefixes: ['https://forbidden.com'],
			}),
		).toThrow()
	})

	it('does not throw for URLs that do not match any forbidden prefix', () => {
		const content = makeContent('[link](https://allowed.com/page)')
		const result = rewriteMarkdownURLs(content, {
			...defaultOptions,
			forbiddenURLPrefixes: ['https://forbidden.com'],
		})

		expect(result.markdown).toBe('[link](https://allowed.com/page)')
	})

	// --- Error for unmatched URL prefix ---

	it('throws when an absolute path does not match any prefix', () => {
		const content = makeContent('[link](/unknown/page.html)')

		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow()
	})

	it('throws when a resolved relative path does not match any prefix', () => {
		// From /src/docs/docs/intro.md, ../../../secret.html resolves to /src/secret.html
		// but /src/secret doesn't match /src/docs or /public
		// Actually the resolved URL is /secret.html which doesn't match any prefix
		const content = makeContent('[link](../../../secret.html)')

		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow()
	})

	// --- Edge cases ---

	it('handles empty markdown content', () => {
		const content = makeContent('')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('')
	})

	it('handles markdown with no links', () => {
		const content = makeContent('Just some plain text with no links.')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('Just some plain text with no links.')
	})

	it('handles autolinks <url> format', () => {
		const content = makeContent('<https://example.com>')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('<https://example.com>')
	})

	it('handles multiple mappings and uses the longest match', () => {
		const options = {
			repoRootRelativePath: '/src/docs/docs/sub/nested.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/src/docs/docs/sub': '/docs/sub' as const,
				'/src/docs/docs': '/docs' as const,
				'/src/docs': '/' as const,
			},
		}
		const content = makeContent('[link](/src/docs/docs/sub/page.html)')
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[link](/docs/sub/page.html)')
	})

	it('maps to https:// URLs via repoRootRelativePaths', () => {
		const options = {
			repoRootRelativePath: '/src/docs/docs/intro.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/src/docs/docs': 'https://docs.example.com' as const,
				'/src/docs': '/' as const,
			},
		}
		const content = makeContent('[link](/src/docs/docs/guide.html)')
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[link](https://docs.example.com/guide.html)')
	})

	it('handles link with trailing slash in path', () => {
		const options = {
			repoRootRelativePath: '/src/docs/docs/intro.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/src/docs': '/' as const,
			},
		}
		const content = makeContent('[link](/src/docs/docs/)')
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[link](/docs/)')
	})

	it('handles deeply nested source file paths', () => {
		const options = {
			repoRootRelativePath: '/src/docs/docs/api/v2/endpoints.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/src/docs': '/' as const,
			},
		}
		const content = makeContent('[up](../../page.html)')
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[up](/docs/page.html)')
	})

	it('preserves link text while only rewriting the URL', () => {
		const content = makeContent('[Click here for details](/src/docs/details.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[Click here for details](/details.html)')
	})

	it('handles link at the very end of content without newline', () => {
		const content = makeContent('Text [link](/src/docs/page.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('Text [link](/page.html)')
	})

	it('handles link at the very start of content', () => {
		const content = makeContent('[link](/src/docs/page.html) text')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/page.html) text')
	})

	it('preserves contentType as MARKDOWN', () => {
		const content = makeContent('[link](/src/docs/page.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.contentType).toBe(ContentType.MARKDOWN)
	})

	// --- Block quotes should still have URLs rewritten ---

	it('rewrites URLs in blockquotes', () => {
		const content = makeContent('> [link](/src/docs/page.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('> [link](/page.html)')
	})

	// --- Multiple consecutive relative segments ---

	it('handles multiple ../ in relative paths', () => {
		const options = {
			repoRootRelativePath: '/src/docs/a/b/c.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/src/docs': '/' as const,
				'/src': '/' as const,
			},
		}
		const content = makeContent('[link](../../../root.html)')
		const result = rewriteMarkdownURLs(content, options)
		// ../../../root.html from /src/docs/a/b/ resolves to /src/root.html
		// which matches /src -> /root.html

		expect(result.markdown).toBe('[link](/root.html)')
	})

	// --- Query parameters ---

	it('preserves query parameters in URLs', () => {
		const content = makeContent('[link](/src/docs/page.html?foo=bar&baz=1)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/page.html?foo=bar&baz=1)')
	})

	// --- Images in code blocks ---

	it('does not rewrite image URLs in code blocks', () => {
		const content = makeContent(['```', '![image](/src/docs/img.png)', '```'].join('\n'))
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(['```', '![image](/src/docs/img.png)', '```'].join('\n'))
	})

	// --- HTML-like links should also be handled if applicable ---

	it('handles links with escaped characters in text', () => {
		const content = makeContent('[link \\& more](/src/docs/page.html)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link \\& more](/page.html)')
	})

	// Reference-style links
	it('does not modify reference link definitions (url only)', () => {
		const content = makeContent('[link][ref]\n\n[ref]: /src/docs/page.html')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link][ref]\n\n[ref]: /page.html')
	})

	it('throws for URLs with empty segments (double slashes)', () => {
		const content = makeContent('[link](foo//bar.html)')

		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow(
			'Invalid URL segment in path resolution',
		)
	})

	it('throws for URLs with trailing double slash creating empty segment', () => {
		const content = makeContent('[link](foo/bar//)')

		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow(
			'Invalid URL segment in path resolution',
		)
	})

	it('throws when relative path tries to go outside the repository root', () => {
		// From /src/docs/docs/intro.md:
		// src Dir: src/pages/docs (3 levels deep)
		// ../../../../ would be 4 pops from 3 levels = goes outside repo
		const content = makeContent('[link](../../../../outside.html)')

		expect(() => rewriteMarkdownURLs(content, defaultOptions)).toThrow(
			'tries to go outside the repository root',
		)
	})

	it('allows relative path that goes exactly to the repo root', () => {
		// From /src/docs/docs/intro.md:
		// source dir: src/pages/docs (3 levels deep)
		// ../../../ is 3 pops = goes to root
		// Result: /page.html which needs /src/docs or /public prefix
		// This shouldn't throw at resolution time, but will fail at prefix matching
		const rootPrefix = '/' as `/${string}`
		const options = {
			repoRootRelativePath: '/src/docs/docs/intro.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				[rootPrefix]: '/' as const, // Root prefix to make it valid
			},
		}
		const content = makeContent('[link](../../../page.html)')
		// ../../../ resolves to /page.html
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[link](/page.html)')
	})

	it('handles mixed ../ and regular segments correctly at depth boundary', () => {
		// From /a/b/c/d/nested.md (4 levels deep), go up 3 then down 2
		const options = {
			repoRootRelativePath: '/a/b/c/d/nested.md' as const,
			repoRootPagesDir: '/src/pages/' as const,
			repoRootRelativePaths: {
				'/a': '/' as const,
			},
		}
		const content = makeContent('[link](../../../x/y.html)')
		// Source dir: a/b/c/d (4 levels)
		// ../../../ = pop 3 times = a (1 level remaining)
		// x/y.html = push x, push y.html
		// Result: /a/x/y.html -> /x/y.html with prefix /a -> /
		const result = rewriteMarkdownURLs(content, options)

		expect(result.markdown).toBe('[link](/x/y.html)')
	})

	// --- Protocol-relative URLs ---

	it('does not rewrite protocol-relative URLs (//)', () => {
		const content = makeContent('[link](//example.com/page)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](//example.com/page)')
	})

	// --- Links with single-quoted titles ---

	it('handles links with single-quoted titles', () => {
		const content = makeContent("[guide](/src/docs/docs/guide.html 'The Guide')")
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe("[guide](/docs/guide.html 'The Guide')")
	})

	// --- Multiple nested inline code blocks ---

	it('preserves multiple inline code segments on the same line', () => {
		const content = makeContent(
			'Use `[code1](/src/docs/a.html)` and `[code2](/src/docs/b.html)` here',
		)
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(
			'Use `[code1](/src/docs/a.html)` and `[code2](/src/docs/b.html)` here',
		)
	})

	// --- Links in list items ---

	it('rewrites links in list items', () => {
		const content = makeContent(
			['- Item with [link](/src/docs/page1.html)', '- Another [link](/src/docs/page2.html)'].join(
				'\n',
			),
		)
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(
			['- Item with [link](/page1.html)', '- Another [link](/page2.html)'].join('\n'),
		)
	})

	// --- Links in nested fenced code blocks ---

	it('handles nested code blocks with different fence lengths', () => {
		const content = makeContent(
			[
				'',
				' ```',
				'[outer link](/src/docs/page.html)',
				'````',
				'[inner](/src/docs/inner.html)',
				'````',
				' ```',
				'',
				' [real](/src/docs/real.html)',
			].join('\n'),
		)
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe(
			[
				'',
				' ```',
				'[outer link](/src/docs/page.html)',
				'````',
				'[inner](/src/docs/inner.html)',
				'````',
				' ```',
				'',
				' [real](/real.html)',
			].join('\n'),
		)
	})

	// --- Bracket-style links: [text](<url>) ---

	it('rewrites bracket-style links with parentheses in URL', () => {
		const content = makeContent(
			'[Gateways](<https://en.wikipedia.org/wiki/Gateway_(telecommunications)>)',
		)
		const result = rewriteMarkdownURLs(content, defaultOptions)

		// https:// URLs are not rewritten
		expect(result.markdown).toBe(
			'[Gateways](<https://en.wikipedia.org/wiki/Gateway_(telecommunications)>)',
		)
	})

	it('rewrites bracket-style links with local paths', () => {
		const content = makeContent('[link](</src/docs/docs/page.html>)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('[link](/docs/page.html)')
	})

	it('rewrites bracket-style image links', () => {
		const content = makeContent('![img](</src/docs/assets/img.png>)')
		const result = rewriteMarkdownURLs(content, defaultOptions)

		expect(result.markdown).toBe('![img](/assets/img.png)')
	})
})

describe('extractMarkdownLinks', () => {
	it('extracts standard links', () => {
		const links = extractMarkdownLinks('[link](https://example.com)')

		expect(links).toEqual([{ text: 'link', url: 'https://example.com', line: 1, isImage: false }])
	})

	it('extracts bracket-style links with parentheses in URL', () => {
		const links = extractMarkdownLinks(
			'[Gateways](<https://en.wikipedia.org/wiki/Gateway_(telecommunications)>)',
		)

		expect(links).toEqual([
			{
				text: 'Gateways',
				url: 'https://en.wikipedia.org/wiki/Gateway_(telecommunications)',
				line: 1,
				isImage: false,
			},
		])
	})

	it('extracts bracket-style image links', () => {
		const links = extractMarkdownLinks('![img](<https://example.com/img.png>)')

		expect(links).toEqual([
			{ text: 'img', url: 'https://example.com/img.png', line: 1, isImage: true },
		])
	})

	it('extracts both standard and bracket-style links on same line', () => {
		const links = extractMarkdownLinks(
			'[a](https://example.com) and [b](<https://en.wikipedia.org/wiki/Gateway_(telecommunications)>)',
		)

		expect(links).toEqual([
			{ text: 'a', url: 'https://example.com', line: 1, isImage: false },
			{
				text: 'b',
				url: 'https://en.wikipedia.org/wiki/Gateway_(telecommunications)',
				line: 1,
				isImage: false,
			},
		])
	})

	it('skips bracket-style links inside code blocks', () => {
		const links = extractMarkdownLinks('```\n[link](<https://example.com/path(foo)>)\n```')

		expect(links).toEqual([])
	})

	it('skips bracket-style links inside inline code', () => {
		const links = extractMarkdownLinks('Use `[link](<https://example.com/path(foo)>)` here')

		expect(links).toEqual([])
	})
})

describe('parseFrontmatterLine - quote handling', () => {
	it('strips surrounding single quotes', () => {
		const md = `---
title: 'It's a test'
description: 'A description'
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe("It's a test")
		expect(result.frontmatter.description).toBe('A description')
	})

	it('strips surrounding double quotes', () => {
		const md = `---
title: "He said hi"
description: "A description"
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe('He said hi')
		expect(result.frontmatter.description).toBe('A description')
	})

	it('un-escapes single-quoted escaped single quote (YAML double single-quote)', () => {
		// YAML: title: 'It''s a test' → value is It's a test
		const md = `---
title: 'It''s a test'
description: 'A description'
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe("It's a test")
	})

	it('un-escapes double-quoted escaped double quote (YAML backslash-quote)', () => {
		// YAML: title: "He said \"hi\"" → value is He said "hi"
		const md = `---
title: "He said \\"hi\\""
description: A description
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe('He said "hi"')
	})

	it('un-escapes double-quoted backslash (YAML double backslash)', () => {
		// YAML: title: "back\\slash" → value is back\slash
		const md = `---
title: "back\\\\slash"
description: A description
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe('back\\slash')
	})

	it('leaves unquoted values untouched', () => {
		const md = `---
title: no quotes
description: a description
---
# Test`

		const result = parseMarkdownWithFrontmatter(md, { title: true, description: true })

		expect(result.frontmatter.title).toBe('no quotes')
		expect(result.frontmatter.description).toBe('a description')
	})
})
