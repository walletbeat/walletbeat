import { describe, expect, it } from 'vitest'

import { walletPageProse } from './utils/wallet-page-prose'

describe('wallet page prose extraction', () => {
	it('extracts custom evaluation details and news together across markup boundaries', () => {
		const prose = walletPageProse(`
			<html><body>
				<nav>gate ship</nav>
				<main id="wallet-page"><article>
					<section class="attribute-content"><p>gate</p><p><strong>gated</strong></p></section>
					<section class="security-news"><p>gating &amp; access</p></section>
				</article><aside>ship</aside></main>
			</body></html>
		`)

		expect(prose).toBe('gate gated gating & access')
	})

	it('keeps link labels and inline prose while excluding code and non-prose content', () => {
		const prose = walletPageProse(`
			<html><body><main id="wallet-page"><article>
				<p><a href="https://example.com/gate/ship">Wallet</a> <em>fund</em>ing</p>
				<p><code>ship gate</code><span>details</span></p>
				<pre>gate ship</pre><script>gate ship</script><style>gate ship</style>
				<svg><title>gate ship</title></svg><template>gate ship</template>
			</article></main></body></html>
		`)

		expect(prose).toBe('Wallet funding details')
	})

	it('rejects missing reports instead of treating them as empty prose', () => {
		expect(() => walletPageProse('<html><body><article>Wallet</article></body></html>')).toThrow(
			'Wallet page has no report article',
		)
	})
})
