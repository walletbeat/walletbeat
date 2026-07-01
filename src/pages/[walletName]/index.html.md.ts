import type { APIRoute, GetStaticPaths } from 'astro'

import { getBaseUrl } from '@/base-url'
import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
	isValidWalletName,
} from '@/data/wallets'
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	nonEmptyMap(nonEmptyKeys(allRatedWallets), walletName => ({ params: { walletName } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletName(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWallets[walletName]

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
