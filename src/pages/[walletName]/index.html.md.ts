import type { APIRoute, GetStaticPaths } from 'astro'

import { getBaseUrl } from '@/base-url'
import { allRatedWalletsBySlug, allWallets, isValidWalletSlug } from '@/data/wallets'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	Object.values(allWallets).map(wallet => ({ params: { walletName: wallet.metadata.id } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletSlug(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWalletsBySlug[walletName]

	return new Response(walletPageMarkdown(wallet, getBaseUrl()), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	})
}
