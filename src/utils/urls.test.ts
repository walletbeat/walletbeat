import { describe, expect, it } from 'vitest'

import { Variant } from '@/schema/variants'

import { getWalletUrl } from './urls'

describe('wallet report selection URLs', () => {
	const wallet = { metadata: { id: 'ledger' } }

	it.each([
		[undefined, '/ledger/'],
		[{ variant: Variant.HARDWARE }, '/ledger/?variant=HARDWARE'],
		[{ attributeAnchor: 'security-audits' }, '/ledger/#security-audits'],
		[{ model: 'ledger-stax' }, '/ledger/?model=ledger-stax'],
		[
			{ variant: Variant.HARDWARE, model: 'ledger-stax', attributeAnchor: 'security-audits' },
			'/ledger/?variant=HARDWARE&model=ledger-stax#security-audits',
		],
		[{ variant: null, model: null, attributeAnchor: null }, '/ledger/'],
	] as const)('preserves report context for %j', (options, expected) => {
		expect(getWalletUrl(wallet, options)).toBe(expected)
	})
	it('encodes model identifiers without creating additional query fields or changing the fragment', () => {
		const model = 'device.rev+one &two'
		const url = new URL(
			getWalletUrl(wallet, {
				variant: Variant.HARDWARE,
				model,
				attributeAnchor: 'security-audits',
			}),
			'https://walletbeat.example',
		)

		expect(url.searchParams.get('model')).toBe(model)
		expect([...url.searchParams.keys()]).toEqual(['variant', 'model'])
		expect(url.searchParams.get('variant')).toBe(Variant.HARDWARE)
		expect(url.hash).toBe('#security-audits')
	})
})
