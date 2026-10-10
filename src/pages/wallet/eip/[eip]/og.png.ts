import type { APIRoute, GetStaticPaths } from 'astro'

import { eips } from '@/data/eips'
import { ratedSoftwareWallets, softwareWalletAttributeTree } from '@/data/software-wallets'
import type { Eip } from '@/schema/eips'
import { renderEipOgImage } from '@/utils/eip-og-image'
import { eipStatusSupportCards } from '@/utils/eip-support-cards'

export const prerender = true

export const getStaticPaths: GetStaticPaths = () =>
	Object.values(eips)
		// EIP-7702 has its own richer tracker page at /wallet/7702/.
		.filter(eip => eip.number !== '7702')
		.map(eip => ({ params: { eip: eip.number }, props: { eip } }))

export const GET: APIRoute<{ eip: Eip }> = async ({ props }) => {
	const { eip } = props
	const png = await renderEipOgImage(
		eip,
		eipStatusSupportCards(
			eip.number,
			softwareWalletAttributeTree,
			Object.values(ratedSoftwareWallets),
		),
	)

	return new Response(new Uint8Array(png), {
		headers: { 'Content-Type': 'image/png' },
	})
}
