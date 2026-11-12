import * as fs from 'node:fs'
import * as path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')

/** Content of the `<meta>` tag with the given `property` or `name`, if any. */
const metaContent = (html: string, key: string): string | undefined =>
	new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1]

describe('Open Graph images', () => {
	it('every page declares a preview image that exists at its declared size', async () => {
		const htmlFiles: string[] = []

		await crawlCodebase({
			root: distDir,
			ignore: [],
			baseTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE && entry.path.endsWith('.html')) {
					htmlFiles.push(entry.path)
				}
			},
		})

		const imageSizes = new Map<string, Promise<{ width?: number; height?: number }>>()
		const violations: string[] = []

		for (const relativePath of htmlFiles) {
			const html = fs.readFileSync(path.join(distDir, relativePath), 'utf8')
			const imageUrl = metaContent(html, 'og:image')

			if (imageUrl === undefined) {
				if (html.includes('<meta property="og:')) {
					violations.push(`${relativePath}: has Open Graph metadata but no og:image`)
				}

				continue
			}

			if (metaContent(html, 'twitter:image') !== imageUrl) {
				violations.push(`${relativePath}: twitter:image does not match og:image ${imageUrl}`)
			}

			const imagePath = path.join(distDir, new URL(imageUrl).pathname)

			if (!fs.existsSync(imagePath)) {
				violations.push(`${relativePath}: og:image ${imageUrl} is not in the build output`)
				continue
			}

			const imageSize = imageSizes.get(imagePath) ?? sharp(imagePath).metadata()

			imageSizes.set(imagePath, imageSize)

			const { width, height } = await imageSize
			const declaredSize = `${metaContent(html, 'og:image:width')}x${metaContent(html, 'og:image:height')}`

			if (declaredSize !== `${width}x${height}`) {
				violations.push(
					`${relativePath}: og:image ${imageUrl} is ${width}x${height}, but declared as ${declaredSize}`,
				)
			}
		}

		expect(htmlFiles.length, 'Found no HTML pages in the build output').toBeGreaterThan(0)
		expect(
			violations,
			`Found ${violations.length} page(s) with a broken preview image:\n\n${violations.join('\n')}`,
		).toEqual([])
	})
})
