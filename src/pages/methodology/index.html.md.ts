import type { APIRoute } from 'astro'

import { getBaseUrl } from '@/base-url'
import { methodologyPageMarkdown } from '@/utils/methodology-markdown'

export const prerender = true

export const GET: APIRoute = () =>
	new Response(methodologyPageMarkdown(getBaseUrl()), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	})
