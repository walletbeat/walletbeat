import type { APIRoute } from 'astro'

import { getBaseUrl } from '@/base-url'
import { attributeGroupById } from '@/data/attribute-groups'
import { methodologyPageMarkdown } from '@/utils/methodology-markdown'

export const prerender = true

export const GET: APIRoute = () =>
	new Response(methodologyPageMarkdown(attributeGroupById, getBaseUrl()), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	})
