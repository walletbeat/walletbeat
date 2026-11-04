import { DOMParser } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import WalletEipList from '@/components/WalletEipList.svelte'
import { eips } from '@/data/eips'
import { unratedSoftwareWallet } from '@/data/software-wallets'
import { EipSupportStatus, ratedWalletEipSupportByStatus } from '@/schema/eip-support'
import { featureSupported, notSupported, supported } from '@/schema/features/support'
import { refs } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { getVariantResolvedWallet } from '@/schema/wallet'
import { eipImplementers } from '@/utils/eip-directory'
import EipDetails from '@/views/EipDetails.svelte'
import EipStatusSupportCards from '@/views/EipStatusSupportCards.svelte'
import EipSupportPie from '@/views/EipSupportPie.svelte'

const browser = getVariantResolvedWallet(unratedSoftwareWallet, Variant.BROWSER)

if (browser === null) {
	throw new Error('Expected a browser variant in the software template')
}

const mixedWallet: typeof unratedSoftwareWallet = {
	...unratedSoftwareWallet,
	variants: {
		[Variant.BROWSER]: {
			...browser,
			features: {
				...browser.features,
				walletCall: supported({
					atomicMultiTransactions: featureSupported,
					ref: { url: 'https://example.com/batching' },
				}),
			},
		},
		[Variant.MOBILE]: {
			...browser,
			variant: Variant.MOBILE,
			features: { ...browser.features, variant: Variant.MOBILE, walletCall: notSupported },
		},
		[Variant.DESKTOP]: {
			...browser,
			variant: Variant.DESKTOP,
			features: { ...browser.features, variant: Variant.DESKTOP, walletCall: null },
		},
	},
}

describe('EIP support presentation', () => {
	it('qualifies directory support without losing the other platform statuses', () => {
		const groups = ratedWalletEipSupportByStatus(mixedWallet, '5792')

		expect(groups.SUPPORTED?.variants).toEqual([Variant.BROWSER])
		expect(groups.NOT_SUPPORTED?.variants).toEqual([Variant.MOBILE])
		expect(groups.UNKNOWN?.variants).toEqual([Variant.DESKTOP])
		const implementers = eipImplementers(eips['5792'], [mixedWallet])

		expect(implementers[0].variants).toEqual([Variant.BROWSER])
		const { body } = render(WalletEipList, { props: { eips: [{ ...eips['5792'], implementers }] } })

		expect(body).toContain('Browser extension')
		expect(body).not.toContain('Mobile app')
		expect(body).not.toContain('Desktop app')
	})

	it('does not equate unassessed support with verified lack of support', () => {
		const implementers = eipImplementers(eips['5792'], [unratedSoftwareWallet])

		expect(implementers).toEqual([])
		const { body } = render(WalletEipList, { props: { eips: [{ ...eips['5792'], implementers }] } })

		expect(body).toContain('no verified support')
		expect(body).toContain('Support may be unknown')
	})

	it('places sources beneath the wallet heading and respects EIP caller context', () => {
		const references = refs({
			ref: { url: 'https://example.com/evidence', lastRetrieved: '2026-10-01' },
		})

		for (const headingLevel of [1, 2, 3] as const) {
			const { body } = render(EipStatusSupportCards, {
				props: {
					title: 'Software wallets',
					headingLevel,
					cards: [
						{
							id: 'mixed',
							displayName: 'Mixed wallet',
							iconExtension: 'svg',
							url: '/wallet/mixed/',
							status: EipSupportStatus.SUPPORTED,
							variants: [Variant.BROWSER],
							references,
						},
					],
				},
			})

			expect([...body.matchAll(/<h([1-6])(?:\s|>)/g)].map(match => Number(match[1]))).toEqual([
				headingLevel,
				headingLevel + 1,
				headingLevel + 2,
				headingLevel + 3,
			])
		}

		for (const headingLevel of [1, 2] as const) {
			const details = render(EipDetails, { props: { eip: eips['7702'], headingLevel } }).body
			const levels = [...details.matchAll(/<h([1-6])(?:\s|>)/g)].map(match => Number(match[1]))

			expect(levels[0]).toBe(headingLevel)
			expect(levels.slice(1).every(level => level === headingLevel + 1)).toBe(true)
			const document = new DOMParser().parseFromString(`<html>${details}</html>`, 'text/html')
			const formalTitle = Array.from(document.getElementsByTagName('p')).find(element =>
				element.getAttribute('class')?.split(/\s+/).includes('formal-title'),
			)

			expect(formalTitle?.textContent?.trim()).toBe(eips['7702'].formalTitle)
			expect(
				Array.from(document.getElementsByTagName(`h${headingLevel + 1}`)).every(
					element => element.textContent?.trim() !== eips['7702'].formalTitle,
				),
			).toBe(true)
		}
	})

	it('distinguishes status entry counts from wallets and links each status', () => {
		const cards = [EipSupportStatus.SUPPORTED, EipSupportStatus.UNKNOWN].map(status => ({
			id: 'mixed',
			displayName: 'Mixed wallet',
			iconExtension: 'svg',
			url: '/wallet/mixed/',
			status,
			variants: [status === EipSupportStatus.SUPPORTED ? Variant.BROWSER : Variant.MOBILE],
			references: [],
		}))
		const { body } = render(EipSupportPie, {
			props: {
				cards,
				listId: 'software-wallets',
				walletTypeLabel: 'software wallets',
				eipLabel: 'EIP-5792',
			},
		})

		expect(body).toContain('1 of 1 distinct software wallets')
		expect(body).toContain('on at least one platform')

		for (const status of ['supported', 'unknown']) {
			expect(body).toContain(`1 platform-qualified status entries: ${status}`)
			expect(body).toContain(`href="#software-wallets-${status}"`)
		}
	})
})
