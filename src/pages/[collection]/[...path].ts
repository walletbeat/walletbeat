import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

import type { APIRoute, InferGetStaticPropsType } from 'astro'

import { MARKDOWN_ASTRO_COLLECTIONS, NON_SERVED_EXTENSIONS } from '@/constants/rendered-collections'
import { assertStringHasPrefix } from '@/types/utils/text'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'

const CONTENT_TYPES = new Map<string, string>(
	Object.entries({
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
		'.ico': 'image/x-icon',
		'.mp4': 'video/mp4',
		'.webm': 'video/webm',
		'.pdf': 'application/pdf',
		'.sty': 'text/plain',
		'.tsv': 'text/tab-separated-values',
		'.txt': 'text/plain',
	} as const satisfies Record<`.${string}`, string>),
)

export const getStaticPaths = () => {
	const root = getAstroBuildTimeRepositoryRoot()

	return Object.entries(MARKDOWN_ASTRO_COLLECTIONS).flatMap(([collection, { repoDir }]) => {
		const directory = join(root, repoDir)

		return readdirSync(directory, { recursive: true, withFileTypes: true })
			.filter(entry => entry.isFile())
			.flatMap(entry => {
				const filePath = join(entry.parentPath, entry.name)
				const ext = extname(entry.name).toLowerCase()

				if (!ext || ext === '.md' || NON_SERVED_EXTENSIONS.has(assertStringHasPrefix(ext, '.'))) {
					return []
				}

				const contentType = CONTENT_TYPES.get(ext)

				if (contentType === undefined) {
					throw new Error(`Cannot determine content type for '${filePath}'`)
				}

				return [
					{
						params: {
							collection,
							path: relative(directory, filePath).split(sep).join('/'),
						},
						props: { filePath, contentType },
					},
				]
			})
	})
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>

export const GET: APIRoute<Props> = ({ props: { filePath, contentType } }) =>
	new Response(readFileSync(filePath), {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	})
