import type { APIRoute, GetStaticPaths } from 'astro'

import { eips } from '@/data/eips'
import { renderEipOgImage } from '@/utils/eip-og-image'

export const prerender = true
export const getStaticPaths: GetStaticPaths = () =>
	Object.values(eips).map(eip => ({ params: { eip: eip.number }, props: { eip } }))
export const GET: APIRoute = async ({ params }) => {
	const eip = Object.values(eips).find(candidate => candidate.number === params.eip)

	if (eip === undefined) {
		return new Response('Not found', { status: 404 })
	}

	return new Response(new Uint8Array(await renderEipOgImage(eip)), {
		headers: { 'Content-Type': 'image/png' },
	})
}
