import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findBrokenInternalLinks, findInternalLinkFormatViolations } from './internal-links'

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

describe('internal build links', () => {
	it('accepts exact files and directory routes backed by index.html', () => {
		writeFixture(
			'index.html',
			'<a href="/">Home</a><a href="/guide/">Guide</a>' + "<script src='/assets/app.js'></script>",
		)
		writeFixture('guide/index.html')
		writeFixture('assets/app.js')

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([])
	})

	it('resolves page-relative links while reporting their invalid format', () => {
		writeFixture(
			'docs/reference/index.html',
			'<a href="../../faq/">FAQ</a><img src="./diagram.svg">',
		)
		writeFixture('faq/index.html')
		writeFixture('docs/reference/diagram.svg')

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([])
		expect(findInternalLinkFormatViolations(fixtureDir)).toEqual([
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

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([])
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

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([])
		expect(findInternalLinkFormatViolations(fixtureDir)).toEqual([])
	})

	it('rejects protocol-relative URLs and directory routes without trailing slashes', () => {
		writeFixture(
			'index.html',
			'<a href="//example.com/missing">Protocol-relative</a>' + '<a href="/guide">Guide</a>',
		)
		writeFixture('guide/index.html')

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([])
		expect(findInternalLinkFormatViolations(fixtureDir)).toEqual([
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

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([
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

		expect(findBrokenInternalLinks(fixtureDir)).toEqual([
			{
				originalUrl: '/empty/',
				resolvedTarget: '/empty/',
				sourceHtmlFile: 'index.html',
			},
		])
	})
})
