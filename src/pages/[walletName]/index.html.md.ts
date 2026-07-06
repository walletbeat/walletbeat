import type { APIRoute, GetStaticPaths } from 'astro'

import { getBaseUrl } from '@/base-url'
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
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

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

	return new Response(
		isSoftwareRatedWallet(wallet)
			? walletPageMarkdown(softwareWalletAttributeTree, wallet, getBaseUrl())
			: isHardwareRatedWallet(wallet)
				? walletPageMarkdown(hardwareWalletAttributeTree, wallet, getBaseUrl())
				: isEmbeddedRatedWallet(wallet)
					? walletPageMarkdown(embeddedWalletAttributeTree, wallet, getBaseUrl())
					: (() => {
							throw new Error('Wallet has no recognized type')
						})(),
		{
			headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
		},
	)
}
