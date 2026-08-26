import { describe, expect, it } from 'vitest'

import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from '@/data/wallets'
import { getUrl } from '@/schema/url'
import { variantEnum } from '@/schema/variants'
import { setItems } from '@/types/utils/non-empty'
import { getWalletStageAndLadder } from '@/utils/stage'
import { ratedWalletJsonExport, stageToExportString } from '@/utils/wallet-json-export'

import { RatedWalletExportValidator } from './utils/assert-valid-json'

const payloadForWallet = (wallet: (typeof allRatedWallets)[keyof typeof allRatedWallets]) =>
	isSoftwareRatedWallet(wallet)
		? ratedWalletJsonExport(softwareWalletAttributeTree, wallet)
		: isHardwareRatedWallet(wallet)
			? ratedWalletJsonExport(hardwareWalletAttributeTree, wallet)
			: isEmbeddedRatedWallet(wallet)
				? ratedWalletJsonExport(embeddedWalletAttributeTree, wallet)
				: (() => {
						throw new Error('Wallet has no recognized type')
					})()

describe('ratedWalletJsonExport', () => {
	it('renders custom scam-prevention details instead of the generic fallback', () => {
		const payload = payloadForWallet(allRatedWallets.metamask)
		const evaluation = payload.overall.security?.scamPrevention?.evaluation
		const details = evaluation?.details

		expect(details).not.toBe('See full details on the wallet page.')
		expect(details).toContain('**MetaMask** helps you stay safe when sending funds by:')
		expect(details).toContain(
			'Warning you when sending funds to an address you have not sent or received funds from in the past',
		)
		expect(details).toContain(
			'**MetaMask** helps you stay safe when doing onchain transactions by:',
		)
		expect(details).toContain(
			'**MetaMask** does not warn you when granting unlimited token approvals.',
		)
		expect(evaluation?.structuredDetails).toMatchObject({
			type: 'scamPrevention',
			warnings: [
				{
					kind: 'sendTransaction',
					description: 'MetaMask helps you stay safe when sending funds by:',
					items: [
						'Warning you when sending funds to an address you have not sent or received funds from in the past',
						'Allowing you to build a contact book and warning you when sending funds to addresses not in it',
					],
				},
				{ kind: 'contractTransaction' },
				{ kind: 'scamUrl' },
				{ kind: 'unlimitedApproval' },
			],
		})
	})

	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const payload = payloadForWallet(wallet)

			it('produces schema-valid JSON', () => {
				const validator = new RatedWalletExportValidator()

				expect(() => validator.assert(JSON.stringify(payload))).not.toThrow()
			})

			it('export top-level fields match source wallet', () => {
				const { stage } = getWalletStageAndLadder(wallet)

				expect(payload.walletId).toBe(wallet.metadata.id)
				expect(payload.displayName).toBe(wallet.metadata.displayName)
				expect(payload.lastUpdated).toBe(wallet.metadata.lastUpdated)
				expect(payload.types.sort()).toEqual(setItems(wallet.types).sort())
				expect(payload.stage).toBe(stageToExportString(stage))
			})

			it('stageBreakdown is null when stage is null or NOT_APPLICABLE, matches ladder length, and passedCount <= totalCount per item', () => {
				const { ladderEvaluation } = getWalletStageAndLadder(wallet)

				if (payload.stage === null || payload.stage === 'NOT_APPLICABLE') {
					expect(payload.stageBreakdown).toBeNull()
				}

				if (payload.stageBreakdown !== null) {
					expect(payload.stageBreakdown.length).toBe(ladderEvaluation?.ladder.stages.length ?? 0)

					for (const item of payload.stageBreakdown) {
						expect(item.passedCount).toBeLessThanOrEqual(item.totalCount)
					}
				}
			})

			it('payload.variants matches variant keys in payload.perVariant', () => {
				const perVariantKeys = Object.keys(payload.perVariant).filter(k => variantEnum.is(k))

				expect(perVariantKeys.sort()).toEqual([...payload.variants].sort())
			})

			it('each perVariant block has attributes and features', () => {
				const overallGroups = Object.keys(payload.overall).sort()

				for (const v of payload.variants) {
					const variantBlock = payload.perVariant[v]

					expect(variantBlock).toBeDefined()

					if (variantBlock !== undefined) {
						expect(variantBlock.attributes).toBeDefined()
						expect(Object.keys(variantBlock.attributes).sort()).toEqual(overallGroups)

						expect(variantBlock.features).toBeDefined()
						expect(typeof variantBlock.features).toBe('object')
						expect(variantBlock.features).not.toBeNull()
					}
				}
			})
		})
	}

	it('includes website and repository in export when present in wallet metadata', () => {
		for (const wallet of Object.values(allRatedWallets)) {
			const payload = payloadForWallet(wallet)
			const websites = wallet.metadata.urls?.websites
			const repositories = wallet.metadata.urls?.repositories

			if (websites?.[0] !== undefined) {
				expect(payload.website).toBe(getUrl(websites[0]))
			}

			if (repositories?.[0] !== undefined) {
				expect(payload.repository).toBe(getUrl(repositories[0]))
			}
		}
	})
})
