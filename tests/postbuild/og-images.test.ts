import * as fs from 'node:fs'
import * as path from 'node:path'

import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'

import { getBaseUrl } from '@/base-url'
import { eipSupportPie } from '@/components/eip-support-pie'
import { variants } from '@/constants/variants'
import { eips } from '@/data/eips'
import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { ratedSoftwareWallets, softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWalletsBySlug,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { ratingToColor } from '@/schema/attributes'
import { EipSupportStatus, ratedWalletEipSupportByStatus } from '@/schema/eip-support'
import { eipShortLabel } from '@/schema/eips'
import { getVariants, type Variant } from '@/schema/variants'
import { setItems } from '@/types/utils/non-empty'
import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'
import { resolveCssColor } from '@/utils/css-color-resolver'
import { eipOgImageSvg } from '@/utils/eip-og-image'
import { fittingFontSize, fonts, textOutline } from '@/utils/og-image'
import { getWalletStageAndLadder } from '@/utils/stage'
import { walletOgImageSvg } from '@/utils/wallet-og-image'

const distDir = path.join(getRepositoryRoot(), 'dist')
// The build's base path is independent of Vitest's own Vite base.
const buildBasePath = `${(process.env.BASE_URL ?? '/').replace(/\/+$/, '')}/`

/** Content of the `<meta>` tag with the given `property` or `name`, if any. */
const metaContent = (html: string, key: string): string | undefined =>
	new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1]

describe('Open Graph images', () => {
	afterAll(() => {
		const output = process.env.SOCIAL_PREVIEW_FACTS_OUTPUT

		if (!output) {
			return
		}

		const wallets = Object.values(allRatedWalletsBySlug).map(wallet => {
			const { stage } = getWalletStageAndLadder(wallet)

			return {
				id: wallet.metadata.id,
				name: wallet.metadata.displayName,
				variants: setItems<Variant>(getVariants(wallet.variants)).map(
					variant => variants[variant].label,
				),
				stage: stage !== null && typeof stage === 'object' ? stage.label : null,
			}
		})
		const eipFacts = Object.values(eips).map(eip => {
			const entries = Object.values(ratedSoftwareWallets).map(wallet =>
				ratedWalletEipSupportByStatus(wallet, eip.number),
			)

			return {
				number: eip.number,
				name: eip.friendlyName,
				total: entries.filter(statuses =>
					Object.values(statuses).some(value => value !== undefined),
				).length,
				supported: entries.filter(statuses => statuses[EipSupportStatus.SUPPORTED] !== undefined)
					.length,
				statuses: Object.fromEntries(
					Object.values(EipSupportStatus).map(status => [
						status,
						entries.filter(statuses => statuses[status] !== undefined).length,
					]),
				),
				unknown: entries.filter(statuses => statuses[EipSupportStatus.UNKNOWN] !== undefined)
					.length,
			}
		})

		fs.writeFileSync(
			output,
			JSON.stringify(
				{
					sourceStateSHA256: process.env.SOCIAL_PREVIEW_SOURCE_STATE,
					phase: process.env.SOCIAL_PREVIEW_PHASE,
					wallets,
					eips: eipFacts,
					softwareWalletNames: Object.values(ratedSoftwareWallets).map(
						wallet => wallet.metadata.displayName,
					),
				},
				null,
				2,
			),
		)
	})

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

			expect(new URL(metaContent(html, 'og:image')!).pathname, page).toBe(
				`${buildBasePath}${image.slice(1)}`,
			)
			expect(metaContent(html, 'og:image:width'), page).toBe('1200')
			expect(metaContent(html, 'og:image:height'), page).toBe('630')
		}
	})

	// Text is outlined for portable rasterization; assert its actual drawing paths.
	const expectText = (svg: string, value: string, size: number, width: number, heavy = false) => {
		const font = heavy ? fonts().heavy : fonts().roman

		expect(svg, value).toContain(
			`d="${textOutline(font, value, fittingFontSize(font, value, size, width)).pathData}"`,
		)
	}

	const expectExport = async (svg: string, relativePath: string) => {
		const expected = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer()
		const actual = await sharp(path.join(distDir, relativePath)).ensureAlpha().raw().toBuffer()

		expect(actual.equals(expected), relativePath).toBe(true)
	}

	it('all wallet exports preserve production names, variants, stages and rating fills', async () => {
		for (const wallet of Object.values(allRatedWalletsBySlug)) {
			const tree = isSoftwareRatedWallet(wallet)
				? softwareWalletAttributeTree
				: isHardwareRatedWallet(wallet)
					? hardwareWalletAttributeTree
					: isEmbeddedRatedWallet(wallet)
						? embeddedWalletAttributeTree
						: null

			if (tree === null) {
				throw new Error('Wallet has no recognized type')
			}

			const svg = walletOgImageSvg(tree, wallet)

			expect(svg).not.toBe('')
			const width = 1200 - 3 * 72 - 2 * (630 / 2 - 40)

			expectText(svg, wallet.metadata.displayName, 80, width, true)
			expectText(
				svg,
				setItems<Variant>(getVariants(wallet.variants))
					.map(variant => variants[variant].label)
					.join('  ·  '),
				28,
				width,
			)
			const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

			if (stage !== null && typeof stage === 'object' && ladderEvaluation !== null) {
				expectText(svg, stage.label, 28, Infinity, true)
			}

			// Each icon follows its own slice's foreground path in traversal order.
			const drawnSlices = [
				...svg.matchAll(/<path d="[^"]*" fill="([^"]*)" \/><image href="([^"]*)"/g),
			]
			const iconPayload = (icon: string) =>
				`data:image/svg+xml;base64,${fs.readFileSync(path.join(getRepositoryRoot(), 'resources/files/wbicons/wbicons-simple', `${icon}.svg`)).toString('base64')}`
			const walletMime = { jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' }[
				wallet.metadata.iconExtension
			]
			const walletPayload = fs
				.readFileSync(
					path.join(
						getRepositoryRoot(),
						'public/images/wallets',
						`${wallet.metadata.id}.${wallet.metadata.iconExtension}`,
					),
				)
				.toString('base64')

			expect(svg).toContain(
				`<image href="data:${walletMime};base64,${walletPayload}" x="72" y="148"`,
			)
			let sliceIndex = 0

			mapNonExemptAttributeGroupsInTree(tree, wallet.overall, (group, evaluated) => {
				expect(drawnSlices[sliceIndex]?.[2], `${wallet.metadata.id}/${group.id} icon`).toBe(
					iconPayload(group.icon),
				)
				sliceIndex += 1
				mapNonExemptGroupAttributes(evaluated, attribute => {
					expect(
						drawnSlices[sliceIndex]?.[2],
						`${wallet.metadata.id}/${attribute.attribute.id} icon`,
					).toBe(iconPayload(attribute.attribute.icon))
					expect(
						drawnSlices[sliceIndex]?.[1],
						`${wallet.metadata.id}/${attribute.attribute.id}`,
					).toBe(resolveCssColor(ratingToColor(attribute.evaluation.outcome.rating)))
					sliceIndex += 1
				})
			})
			expect(drawnSlices).toHaveLength(sliceIndex)
			await expectExport(svg, `${wallet.metadata.id}/og.png`)
		}
	})

	it('all EIP exports retain distinct wallet totals and platform-qualified statuses including unknowns', async () => {
		for (const eip of Object.values(eips)) {
			const svg = eipOgImageSvg(eip)
			const entries = Object.values(ratedSoftwareWallets).map(wallet =>
				ratedWalletEipSupportByStatus(wallet, eip.number),
			)
			const cards = Object.values(ratedSoftwareWallets).flatMap((wallet, index) =>
				Object.values(EipSupportStatus)
					.filter(status => entries[index][status] !== undefined)
					.map(status => ({ id: wallet.metadata.id, status })),
			)
			const liveSummary = eipSupportPie(cards, 'software-wallets')
			const total = entries.filter(statuses =>
				Object.values(statuses).some(value => value !== undefined),
			).length
			const supported = entries.filter(
				statuses => statuses[EipSupportStatus.SUPPORTED] !== undefined,
			).length

			expect(liveSummary.walletCount).toBe(total)
			expect(liveSummary.supportedWalletCount).toBe(supported)
			const lines: string[] = []

			for (const word of eip.friendlyName.split(/\s+/)) {
				const previous = lines.at(-1)

				if (
					previous !== undefined &&
					textOutline(fonts().heavy, `${previous} ${word}`, 38).width <= 520
				) {
					lines[lines.length - 1] = `${previous} ${word}`
				} else {
					lines.push(word)
				}
			}

			for (const line of lines) {
				expectText(svg, line, Math.min(38, 138 / lines.length), 520, true)
			}
			expectText(svg, eipShortLabel(eip), 72, 520, true)
			expectText(svg, `${supported} of ${total} distinct wallets`, 32, 520, true)
			expectText(svg, `${supported}/${total}`, 40, 126, true)

			for (const [status, label] of [
				[EipSupportStatus.SUPPORTED, 'supported'],
				[EipSupportStatus.NOT_SUPPORTED, 'not supported'],
				[EipSupportStatus.UNKNOWN, 'unknown'],
			] as const) {
				const count = entries.filter(statuses => statuses[status] !== undefined).length

				expect(liveSummary.slices.find(slice => slice.id === status)?.weight ?? 0).toBe(count)

				if (count > 0) {
					expectText(svg, `${count} ${label}`, 22, 420)
				}
			}
			expectText(svg, 'Slices: platform-qualified status entries', 22, 550)
			expectText(svg, 'A wallet may have more than one status.', 20, 550)
			await expectExport(svg, `wallet/eip/${eip.number}/og.png`)
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
			const basePath = buildBasePath

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
