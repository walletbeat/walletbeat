import { render } from 'svelte/server'
import { expect, it } from 'vitest'

import { fixtureImageDimensions } from './browser/fixtures/fixture-image-dimensions'
import { walletFixtures } from './browser/fixtures/wallet-fixtures'
import WalletFixture from './browser/fixtures/WalletFixture.svelte'

for (const name of Object.keys(walletFixtures)) {
	it(`provides strict reference image metadata for fixture ${name}`, async () => {
		const wallet = walletFixtures[name]()
		const imageDimensions = await fixtureImageDimensions(wallet)
		const { body } = render(WalletFixture, {
			props: {
				name,
				imageDimensions,
				codeSnippets: {},
				walletIcon: { src: '/fixture.svg', width: 64, height: 64, format: 'svg' },
			},
		})

		expect(body).toContain(wallet.metadata.displayName)

		for (const dimensions of Object.values(imageDimensions)) {
			expect(dimensions.width).toBeGreaterThan(0)
			expect(dimensions.height).toBeGreaterThan(0)
		}
	})
}
