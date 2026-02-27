import { describe, expect, it } from 'vitest'

import { ratedHardwareWallets } from '@/data/hardware-wallets'
import { ratedSoftwareWallets } from '@/data/software-wallets'
import { llmsTxtBody } from '@/utils/llms-txt'

import { assertValidMarkdown } from './utils/assertValidMarkdown'
import { grammarLint, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

const SITE_URL = 'http://localhost:4321'

describe('llms.txt', () => {
	it('includes title, blockquote, and rating-system paragraph', () => {
		const body = llmsTxtBody(SITE_URL)

		expect(body).toContain('# Walletbeat')
		expect(body).toContain(
			'> Walletbeat is an independent rating platform for Ethereum wallets, evaluating them across security, privacy, self-sovereignty, transparency, ecosystem, and maintenance categories.',
		)
		expect(body).toContain('`PASS` / `PARTIAL` / `FAIL` / `UNRATED` / `EXEMPT`')
		expect(body).toContain(`Full wallet list and ratings: ${SITE_URL}`)
	})

	it('includes Software Wallets and Hardware Wallets sections', () => {
		const body = llmsTxtBody(SITE_URL)

		expect(body).toContain('## Software Wallets')
		expect(body).toContain('## Hardware Wallets')
	})

	it('lists all software wallets under Software Wallets', () => {
		const body = llmsTxtBody(SITE_URL)

		const softwareSectionMatch = body.match(/## Software Wallets\n\n([\s\S]*?)(?=\n## |$)/)

		expect(softwareSectionMatch).not.toBeNull()
		const softwareSection = softwareSectionMatch![1] ?? ''

		for (const wallet of Object.values(ratedSoftwareWallets)) {
			const link = `${SITE_URL}/${wallet.metadata.id}/index.html.md`

			expect(softwareSection).toContain(link)
		}
	})

	it('lists all hardware wallets under Hardware Wallets', () => {
		const body = llmsTxtBody(SITE_URL)

		const hardwareSectionMatch = body.match(/## Hardware Wallets\n\n([\s\S]*?)(?=\n## |$)/)

		expect(hardwareSectionMatch).not.toBeNull()
		const hardwareSection = hardwareSectionMatch![1] ?? ''

		for (const wallet of Object.values(ratedHardwareWallets)) {
			const link = `${SITE_URL}/${wallet.metadata.id}/index.html.md`

			expect(hardwareSection).toContain(link)
		}
	})

	it('has correct grammar', async () => {
		const body = llmsTxtBody(SITE_URL)

		await grammarLint(body, { language: 'markdown' })
	})

	it('produces valid markdown', async () => {
		const body = llmsTxtBody(SITE_URL)

		await assertValidMarkdown(body)
	})

	it('no wallet link appears twice in the body', () => {
		const body = llmsTxtBody(SITE_URL)

		const linkPattern = new RegExp(`${SITE_URL.replace(/\./g, '\\.')}/[^/]+/index\\.html\\.md`, 'g')
		const links = body.match(linkPattern) ?? []

		const seen = new Set<string>()

		for (const link of links) {
			expect(seen.has(link)).toBe(false)
			seen.add(link)
		}
	})
})
