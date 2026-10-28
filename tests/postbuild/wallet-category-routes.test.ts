import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { defaultNavigationItems } from '@/constants/navigation'
import { attributeTreeForWallet, representativeWalletForType } from '@/data/wallets'
import { getAttributeGroupById } from '@/schema/attribute-groups'
import { displayedAttributeIdsForWalletType } from '@/schema/wallet-navigation'
import { WalletType, walletTypes, walletTypeToUrlSlug } from '@/schema/wallet-types'
import { getRepositoryRoot } from '@/utils/codebase'

const distDir = join(getRepositoryRoot(), 'dist')

const familyMetadata = {
	[WalletType.SOFTWARE]: { title: 'Ethereum Wallets', table: 'SoftwareWalletTable' },
	[WalletType.HARDWARE]: { title: 'Ethereum Hardware Wallets', table: 'HardwareWalletTable' },
	[WalletType.EMBEDDED]: { title: 'Ethereum Embedded Wallets', table: 'EmbeddedWalletTable' },
}

describe('compiled wallet category routes', () => {
	for (const walletType of walletTypes.items) {
		const slug = walletTypeToUrlSlug(walletType)
		const groups = displayedAttributeIdsForWalletType(walletType)
		const representative = representativeWalletForType(walletType)
		const family = familyMetadata[walletType]

		it(`${slug} emits exactly the supported categories alongside its specialized routes`, () => {
			const children = readdirSync(join(distDir, slug), { withFileTypes: true })
				.filter(entry => entry.isDirectory() && !['eip', '7702'].includes(entry.name))
				.map(entry => entry.name)

			expect(children.sort()).toEqual(['summary', ...groups].sort())
		})

		for (const groupId of ['summary', ...groups]) {
			it(`${slug}/${groupId} preserves family metadata and a server-rendered hydratable table`, () => {
				const html = readFileSync(join(distDir, slug, groupId, 'index.html'), 'utf8')
				const group =
					groupId === 'summary'
						? null
						: getAttributeGroupById(
								groupId,
								attributeTreeForWallet(representative),
								representative.overall,
							)

				if (groupId !== 'summary') {
					expect(group).not.toBeNull()
				}

				const title =
					group === null
						? walletType === WalletType.EMBEDDED
							? 'Walletbeat'
							: `${family.title} - Walletbeat`
						: `${family.title} ${group.displayName} - Walletbeat`

				expect(html).toContain(`<title>${title}</title>`)
				expect(html).toContain(`content="${title}"`)

				if (group !== null) {
					expect(html).toContain(
						`content="Learn how ${group.displayName} impacts your wallet experience."`,
					)
				}

				const island = new RegExp(
					`<astro-island[^>]*component-url="[^"]*/${family.table}\\.[^"]+"[^>]*>[\\s\\S]*?</astro-island>`,
				).exec(html)?.[0]

				expect(island).toBeDefined()
				expect(island).toContain('client="visible"')
				expect(island).toMatch(
					new RegExp(`<h[1-6][^>]*>${family.table.replace('WalletTable', ' Wallets')}</h[1-6]>`),
				)

				for (const item of defaultNavigationItems) {
					if ('href' in item) {
						expect(html).toContain(`href="${item.href}"`)
					}
				}
			})
		}
	}
})
