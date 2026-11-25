import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'

import {
	MARKDOWN_ASTRO_COLLECTIONS,
	type MarkdownAstroCollection,
} from './constants/rendered-collections.ts'
import { type WBIconID, wbiconsIDs } from './styles/wbicons.ts'
import { remap } from './types/utils/remap.ts'

const docSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	listTitle: z.string().optional(),
	shortTitle: z.string().optional(),
	icon: z
		.custom<WBIconID>(value => typeof value === 'string' && (wbiconsIDs as Set<string>).has(value))
		.optional(),
	order: z.number().optional(),
})

export const collections = remap(
	MARKDOWN_ASTRO_COLLECTIONS,
	(_, { repoDir }: MarkdownAstroCollection) =>
		defineCollection({
			loader: glob({
				base: `.${repoDir}`,
				pattern: '**/*.md',
				generateId: ({ entry }) => entry.slice(0, -3),
				retainBody: false,
			}),
			schema: docSchema,
		}),
)
