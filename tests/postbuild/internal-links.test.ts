import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { checkInternalLinks } from './internal-links'

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
	it('accepts valid links', () => {
		writeFixture(
			'index.html',
			'<a href="/">Home</a><a href="/guide/?view=compact#top">Guide</a>' +
				"<script src='/assets/app.js'></script>",
		)
		writeFixture('guide/index.html')
		writeFixture('assets/app.js')

		expect(checkInternalLinks(fixtureDir)).toEqual({ brokenLinks: [], formatViolations: [] })
	})

	it('reports malformed links even when their internal targets exist', () => {
		writeFixture(
			'index.html',
			'<a href="/guide">Missing slash</a><a href="guide/">Relative</a>' +
				'<a href="//example.com/">Protocol-relative</a>',
		)
		writeFixture('guide/index.html')

		expect(checkInternalLinks(fixtureDir)).toEqual({
			brokenLinks: [],
			formatViolations: [
				{
					originalUrl: '//example.com/',
					reason: 'Protocol-relative URLs are not allowed.',
					sourceHtmlFile: 'index.html',
				},
				{
					originalUrl: '/guide',
					reason: 'Links to directory routes must end in a slash.',
					sourceHtmlFile: 'index.html',
				},
				{
					originalUrl: 'guide/',
					reason: 'Internal site URLs must be root-relative.',
					sourceHtmlFile: 'index.html',
				},
			],
		})
	})

	it('reports missing targets for correctly formatted links', () => {
		writeFixture(
			'guides/setup/index.html',
			'<a href="/missing/?mode=short#top">Missing page</a>' + "<img src='/images/missing.png?v=1'>",
		)

		expect(checkInternalLinks(fixtureDir)).toEqual({
			brokenLinks: [
				{
					originalUrl: '/images/missing.png?v=1',
					resolvedTarget: '/images/missing.png',
					sourceHtmlFile: 'guides/setup/index.html',
				},
				{
					originalUrl: '/missing/?mode=short#top',
					resolvedTarget: '/missing/',
					sourceHtmlFile: 'guides/setup/index.html',
				},
			],
			formatViolations: [],
		})
	})
})
