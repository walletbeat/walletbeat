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
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	Object.values(allRatedWalletsBySlug).map(wallet => ({
		params: { walletName: wallet.metadata.id },
	}))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletSlug(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWalletsBySlug[walletName]
	const payload = isSoftwareRatedWallet(wallet)
		? ratedWalletJsonExport(softwareWalletAttributeTree, wallet)
		: isHardwareRatedWallet(wallet)
			? ratedWalletJsonExport(hardwareWalletAttributeTree, wallet)
			: isEmbeddedRatedWallet(wallet)
				? ratedWalletJsonExport(embeddedWalletAttributeTree, wallet)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}
