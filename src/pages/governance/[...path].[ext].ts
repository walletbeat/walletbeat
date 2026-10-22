import type { APIRoute } from 'astro'

import { RENDERED_MARKDOWN_COLLECTIONS } from '@/constants/rendered-collections'
import { staticDataGet, staticPagesDataPaths } from '@/utils/static-pages-endpoint'

const { repoDir } = RENDERED_MARKDOWN_COLLECTIONS.governance

export const getStaticPaths = () => staticPagesDataPaths(repoDir)

export const GET: APIRoute = staticDataGet(repoDir)
