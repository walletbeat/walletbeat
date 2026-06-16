import type { APIRoute, GetStaticPaths } from 'astro'

import { allRatedWalletsBySlug, allWallets, isValidWalletSlug } from '@/data/wallets'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	Object.values(allWallets).map(wallet => ({ params: { walletName: wallet.metadata.id } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletSlug(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWalletsBySlug[walletName]
	const payload = ratedWalletJsonExport(wallet)

	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}
