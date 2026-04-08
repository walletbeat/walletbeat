import type { APIRoute, GetStaticPaths } from 'astro'

import { attributeGroupById } from '@/data/attribute-groups'
import { allRatedWallets, isValidWalletSlug } from '@/data/wallets'
import { nonEmptyKeys, nonEmptyMap } from '@/types/utils/non-empty'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'

export const prerender = true

// TODO: https://github.com/walletbeat/walletbeat/issues/547
export const getStaticPaths: GetStaticPaths = () =>
	nonEmptyMap(nonEmptyKeys(allRatedWallets), walletName => ({ params: { walletName } }))

export const GET: APIRoute = ({ params }) => {
	const { walletName } = params

	if (walletName === undefined || !isValidWalletSlug(walletName)) {
		return new Response('Not found', { status: 404 })
	}

	const wallet = allRatedWallets[walletName]
	const payload = ratedWalletJsonExport(attributeGroupById, wallet)

	return new Response(JSON.stringify(payload), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	})
}
