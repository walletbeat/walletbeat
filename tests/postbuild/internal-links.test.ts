import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
	checkInternalLinks,
	resolveInternalLink,
	validateInternalLinkFormat,
} from './internal-links'

let fixtureDir: string

function writeFixture(relativePath: string, contents = ''): void {
	const filePath = path.join(fixtureDir, relativePath)

	fs.mkdirSync(path.dirname(filePath), { recursive: true })
	fs.writeFileSync(filePath, contents)
}

beforeEach(() => {
	fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletbeat-internal-links-'))
})

afterEach(() => {
	fs.rmSync(fixtureDir, { recursive: true, force: true })
})

describe('internal link formatting', () => {
	it.each(['/', '/guide/', '/assets/app.js', '/guide/?view=compact#top', ' /guide/ '])(
		'accepts %s without requiring a target to exist',
		url => {
			expect(validateInternalLinkFormat(url, '/docs/')).toEqual([])
		},
	)

	it.each([
		'',
		'#section',
		'https://example.com/',
		'http://example.com/',
		'mailto:a@b.com',
		'tel:+123',
		'data:image/png;base64,AA==',
	])('ignores %s', url => {
		expect(validateInternalLinkFormat(url, '/')).toEqual([])
	})

	it('rejects protocol-relative URLs', () => {
		expect(validateInternalLinkFormat('//example.com/', '/')).toEqual([
			'Protocol-relative URLs are not allowed.',
		])
	})

	it('rejects page-relative URLs', () => {
		expect(validateInternalLinkFormat('../../faq/', '/docs/reference/')).toEqual([
			'Internal site URLs must be root-relative.',
		])
	})

	it('checks trailing slashes on the pathname without queries or fragments', () => {
		expect(validateInternalLinkFormat('/guide?view=compact#top', '/')).toEqual([
			'Links to directory routes must end in a slash.',
		])
	})

	it('reports both formatting violations for a relative page without a slash', () => {
		expect(validateInternalLinkFormat('../faq', '/docs/')).toEqual([
			'Internal site URLs must be root-relative.',
			'Links to directory routes must end in a slash.',
		])
	})
})

describe('internal link resolution', () => {
	it.each([
		['/', '/'],
		['/guide/', '/guide/'],
		['/guide', '/guide'],
		['../../guide/?view=compact#top', '/guide/'],
		['./diagram.svg?v=2#icon', '/docs/reference/diagram.svg'],
		[' /assets/my%20icon.svg ', '/assets/my icon.svg'],
	])('resolves %s independently of format policy', (url, resolvedTarget) => {
		writeFixture('index.html')
		writeFixture('guide/index.html')
		writeFixture('docs/reference/diagram.svg')
		writeFixture('assets/my icon.svg')

		expect(resolveInternalLink(url, '/docs/reference/', fixtureDir)).toEqual({
			resolvedTarget,
			exists: true,
		})
	})

	it.each([
		'',
		'#section',
		'//example.com/',
		'https://example.com/',
		'mailto:a@b.com',
		'data:image/png;base64,AA==',
	])('skips %s', url => {
		expect(resolveInternalLink(url, '/', fixtureDir)).toBeNull()
	})

	it('reports the resolved target when missing', () => {
		expect(resolveInternalLink('../missing/?q=1#top', '/docs/', fixtureDir)).toEqual({
			resolvedTarget: '/missing/',
			exists: false,
		})
	})

	it('requires index.html for directory targets', () => {
		writeFixture('empty/placeholder.txt')

		expect(resolveInternalLink('/empty/', '/', fixtureDir)).toEqual({
			resolvedTarget: '/empty/',
			exists: false,
		})
	})

	it('does not accept a file URL with an added slash', () => {
		writeFixture('assets/app.js')

		expect(resolveInternalLink('/assets/app.js/', '/', fixtureDir)).toEqual({
			resolvedTarget: '/assets/app.js/',
			exists: false,
		})
	})

	it('rejects decoded paths escaping the build output', () => {
		writeFixture('outside.txt')
		const distDir = path.join(fixtureDir, 'dist')

		fs.mkdirSync(distDir)

		expect(resolveInternalLink(`/${encodeURIComponent('../outside.txt')}`, '/', distDir)).toEqual({
			resolvedTarget: '/../outside.txt',
			exists: false,
		})
	})
})

describe('internal build links', () => {
	it('accepts exact files and directory routes backed by index.html', () => {
		writeFixture(
			'index.html',
			'<a href="/">Home</a><a href="/guide/">Guide</a>' + "<script src='/assets/app.js'></script>",
		)
		writeFixture('guide/index.html')
		writeFixture('assets/app.js')

		const { brokenLinks } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([])
	})

	it('resolves page-relative links while reporting their invalid format', () => {
		writeFixture(
			'docs/reference/index.html',
			'<a href="../../faq/">FAQ</a><img src="./diagram.svg">',
		)
		writeFixture('faq/index.html')
		writeFixture('docs/reference/diagram.svg')

		const { brokenLinks, formatViolations } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([])
		expect(formatViolations).toEqual([
			{
				originalUrl: '../../faq/',
				reason: 'Internal site URLs must be root-relative.',
				sourceHtmlFile: 'docs/reference/index.html',
			},
			{
				originalUrl: './diagram.svg',
				reason: 'Internal site URLs must be root-relative.',
				sourceHtmlFile: 'docs/reference/index.html',
			},
		])
	})

	it('strips queries and fragments before checking targets', () => {
		writeFixture(
			'index.html',
			'<a href="/guide/?view=compact&amp;sort=name#top">Guide</a>' +
				'<img src="/assets/icon.svg?v=2#icon">',
		)
		writeFixture('guide/index.html')
		writeFixture('assets/icon.svg')

		const { brokenLinks } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([])
	})

	it('ignores external, protocol, data, and fragment-only URLs', () => {
		writeFixture(
			'index.html',
			[
				'<a href="https://example.com/missing">HTTPS</a>',
				'<a href="http://example.com/missing">HTTP</a>',
				'<a href="mailto:hello@example.com">Email</a>',
				'<a href="tel:+123456789">Telephone</a>',
				'<img src="data:image/svg+xml;base64,PHN2Zy8+">',
				'<a href="#section">Section</a>',
				'<div data-href="/missing/">Lazy target</div>',
			].join(''),
		)

		const { brokenLinks, formatViolations } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([])
		expect(formatViolations).toEqual([])
	})

	it('rejects protocol-relative URLs and directory routes without trailing slashes', () => {
		writeFixture(
			'index.html',
			'<a href="//example.com/missing">Protocol-relative</a>' + '<a href="/guide">Guide</a>',
		)
		writeFixture('guide/index.html')

		const { brokenLinks, formatViolations } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([])
		expect(formatViolations).toEqual([
			{
				originalUrl: '//example.com/missing',
				reason: 'Protocol-relative URLs are not allowed.',
				sourceHtmlFile: 'index.html',
			},
			{
				originalUrl: '/guide',
				reason: 'Links to directory routes must end in a slash.',
				sourceHtmlFile: 'index.html',
			},
		])
	})

	it('reports source files, original URLs, and resolved missing targets', () => {
		writeFixture(
			'guides/setup/index.html',
			'<a href="../../missing/?mode=short#top">Missing page</a>' +
				"<img src='/images/missing.png?v=1'>",
		)

		const { brokenLinks } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([
			{
				originalUrl: '../../missing/?mode=short#top',
				resolvedTarget: '/missing/',
				sourceHtmlFile: 'guides/setup/index.html',
			},
			{
				originalUrl: '/images/missing.png?v=1',
				resolvedTarget: '/images/missing.png',
				sourceHtmlFile: 'guides/setup/index.html',
			},
		])
	})

	it('rejects directory targets that do not contain index.html', () => {
		writeFixture('index.html', '<a href="/empty/">Empty directory</a>')
		writeFixture('empty/placeholder.txt')

		const { brokenLinks } = checkInternalLinks(fixtureDir)

		expect(brokenLinks).toEqual([
			{
				originalUrl: '/empty/',
				resolvedTarget: '/empty/',
				sourceHtmlFile: 'index.html',
			},
		])
	})
})
