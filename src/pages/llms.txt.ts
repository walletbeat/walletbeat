import type { APIRoute } from 'astro'

import { getBaseUrl } from '@/base-url'
import { llmsTxtBody } from '@/utils/llms-txt'

export const prerender = true

export const GET: APIRoute = () => {
	const body = llmsTxtBody(getBaseUrl())

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	})
}
