import { existsSync } from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	mapWalletTypes,
	urlSlugToWalletType,
	WalletType,
	walletTypeToUrlSlug,
} from '@/schema/wallet-types'
import { getRepositoryRoot } from '@/utils/codebase'

import astroConfig from '../astro.config.mjs'

const pagesDir = path.join(getRepositoryRoot(), 'src', 'pages')

describe('wallet type routes', () => {
	for (const walletType of Object.values(mapWalletTypes(walletType => walletType))) {
		const slug = walletTypeToUrlSlug(walletType)

		describe(walletType, () => {
			it('has a summary page and per-group pages under its URL slug', () => {
				expect(existsSync(path.join(pagesDir, slug, 'summary.astro'))).toBe(true)
				expect(existsSync(path.join(pagesDir, slug, '[attrGroupId].astro'))).toBe(true)
			})

			it('maps its URL slug back to the wallet type', () => {
				expect(urlSlugToWalletType(slug)).toBe(walletType)
			})
		})
	}

	describe.each([
		['hww', WalletType.HARDWARE],
		['embedded', WalletType.EMBEDDED],
	])('legacy /%s/ URLs', (legacySlug, walletType) => {
		const slug = walletTypeToUrlSlug(walletType)

		it('redirect to the current pages', () => {
			expect(astroConfig.redirects).toMatchObject({
				[`/${legacySlug}/summary`]: `/${slug}/summary`,
				[`/${legacySlug}/[attrGroupId]`]: `/${slug}/[attrGroupId]`,
			})
		})

		it('have no page of their own', () => {
			expect(existsSync(path.join(pagesDir, legacySlug))).toBe(false)
		})
	})
})
