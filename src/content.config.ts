import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'

import { RENDERED_MARKDOWN_COLLECTIONS } from './constants/rendered-collections.ts'
import { assertStringHasPrefix } from './types/utils/text.ts'

const docSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
})

function repoDirToGlobBase(repoDir: `/${string}`): string {
	return assertStringHasPrefix(repoDir, '/').slice(1)
}

const docs = defineCollection({
	loader: glob({
		base: `./${repoDirToGlobBase(RENDERED_MARKDOWN_COLLECTIONS.docs.repoDir)}`,
		pattern: '**/*.md',
	}),
	schema: docSchema,
})

const governance = defineCollection({
	loader: glob({
		base: `./${repoDirToGlobBase(RENDERED_MARKDOWN_COLLECTIONS.governance.repoDir)}`,
		pattern: '**/*.md',
	}),
	schema: docSchema,
})

export const collections = { docs, governance }
