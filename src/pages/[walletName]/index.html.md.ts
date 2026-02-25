import type { APIRoute, GetStaticPaths } from 'astro'

import { getBaseUrl } from '@/base-url'
import { allRatedWallets, isValidWalletName } from '@/data/wallets'
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

export const prerender = true

// TODO: https://github.com/walletbeat/walletbeat/issues/547
export const getStaticPaths: GetStaticPaths = () =>
	nonEmptyMap(nonEmptyKeys(allRatedWallets), walletName => ({ params: { walletName } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletName(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWallets[walletName]

	return new Response(walletPageMarkdown(wallet, getBaseUrl()), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	})
}
