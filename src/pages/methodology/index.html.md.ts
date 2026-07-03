import type { APIRoute } from 'astro'

import { getBaseUrl } from '@/base-url'
import { attributeTree } from '@/schema/attribute-tree'
import { methodologyPageMarkdown } from '@/utils/methodology-markdown'

export const prerender = true

export const GET: APIRoute = () =>
	new Response(methodologyPageMarkdown(attributeTree, getBaseUrl()), {
		headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
	})
