import type { APIRoute, GetStaticPaths } from 'astro'

import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWalletsBySlug,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
	isValidWalletSlug,
} from '@/data/wallets'
import { renderWalletOgImage } from '@/utils/wallet-og-image'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	Object.values(allRatedWalletsBySlug).map(wallet => ({
		params: { walletName: wallet.metadata.id },
	}))

export const GET: APIRoute = async ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletSlug(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWalletsBySlug[walletName]
	const png = isSoftwareRatedWallet(wallet)
		? await renderWalletOgImage(softwareWalletAttributeTree, wallet)
		: isHardwareRatedWallet(wallet)
			? await renderWalletOgImage(hardwareWalletAttributeTree, wallet)
			: isEmbeddedRatedWallet(wallet)
				? await renderWalletOgImage(embeddedWalletAttributeTree, wallet)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

	return new Response(new Uint8Array(png), {
		headers: { 'Content-Type': 'image/png' },
	})
}
