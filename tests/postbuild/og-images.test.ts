import * as fs from 'node:fs'
import * as path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { getBaseUrl, withBasePath } from '@/base-url'
import { eips } from '@/data/eips'
import { allRatedWalletsBySlug } from '@/data/wallets'
import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')

/** Content of the `<meta>` tag with the given `property` or `name`, if any. */
const metaContent = (html: string, key: string): string | undefined =>
	new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1]

describe('Open Graph images', () => {
	it('wallet and EIP pages use their own generated preview', () => {
		const pages = [
			...Object.values(allRatedWalletsBySlug).map(
				(wallet): { page: string; image: `/${string}` } => ({
					page: `${wallet.metadata.id}/index.html`,
					image: `/${wallet.metadata.id}/og.png`,
				}),
			),
			...Object.values(eips).map((eip): { page: string; image: `/${string}` } => ({
				page:
					eip.number === '7702' ? 'wallet/7702/index.html' : `wallet/eip/${eip.number}/index.html`,
				image: `/wallet/eip/${eip.number}/og.png`,
			})),
		]

		for (const { page, image } of pages) {
			const html = fs.readFileSync(path.join(distDir, page), 'utf8')

			expect(new URL(metaContent(html, 'og:image')!).pathname, page).toBe(withBasePath(image))
			expect(metaContent(html, 'og:image:width'), page).toBe('1200')
			expect(metaContent(html, 'og:image:height'), page).toBe('630')
		}
	})

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

			const url = new URL(imageUrl)
			const basePath = withBasePath('/')

			if (url.origin !== new URL(getBaseUrl()).origin || !url.pathname.startsWith(basePath)) {
				violations.push(
					`${relativePath}: image URL does not match the configured site origin/base path`,
				)
				continue
			}

			if (
				metaContent(html, 'og:image:type') !== 'image/png' ||
				!metaContent(html, 'og:image:alt') ||
				metaContent(html, 'twitter:image:alt') !== metaContent(html, 'og:image:alt')
			) {
				violations.push(`${relativePath}: missing MIME type or matching nonempty alternative text`)
			}

			const imagePath = path.join(distDir, url.pathname.slice(basePath.length))

			if (!fs.existsSync(imagePath)) {
				violations.push(`${relativePath}: og:image ${imageUrl} is not in the build output`)
				continue
			}

			if (
				!fs
					.readFileSync(imagePath)
					.subarray(0, 8)
					.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
			) {
				violations.push(`${relativePath}: preview is not a PNG`)
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
