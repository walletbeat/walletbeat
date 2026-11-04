import { render } from 'svelte/server'

import { getNewsForWallet } from '@/data/news'
import { allWallets } from '@/data/wallets'
import type { EvaluationTree } from '@/schema/attribute-groups'
import { collectWalletRefs, refs } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import NativeWalletContent from '@/tests/browser/fixtures/NativeWalletContent.svelte'
import { codeSnippetsForWallet } from '@/utils/code-snippet-store'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'

/** Keep native contexts intact while selecting the evaluation tree consumed by detail renderers. */
export async function nativeWalletRenderer(wallet: RatedWallet<string>) {
	const entry = Object.entries(allWallets).find(
		([, data]) => data.metadata.id === wallet.metadata.id,
	)

	if (!entry) {
		throw new Error(`Wallet data missing: ${wallet.metadata.id}`)
	}

	const [name, data] = entry
	const imageDimensions = await referenceImageDimensions([
		...collectWalletRefs(name, data).flatMap(ref => ref.fullyQualifiedRefs),
		...getNewsForWallet(wallet.metadata.id).flatMap(refs),
	])
	const codeSnippets = codeSnippetsForWallet(name, data)

	return (overall: EvaluationTree<string> = wallet.overall): string =>
		render(NativeWalletContent, {
			props: { wallet: { ...wallet, overall }, imageDimensions, codeSnippets },
		}).body
}
