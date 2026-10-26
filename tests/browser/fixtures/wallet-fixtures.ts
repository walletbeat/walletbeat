import coinspectReport from '@/data/coinspect/current-reports/metamask-browser/metamask-browser.json'
import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { unratedEmbeddedTemplate } from '@/data/embedded-wallets/unrated.tmpl'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import { metamask } from '@/data/software-wallets/metamask'
import { unratedTemplate } from '@/data/software-wallets/unrated.tmpl'
import { allRatedWalletsBySlug, attributeTreeForWallet } from '@/data/wallets'
import { attributeTreeForIds } from '@/schema/attribute-tree'
import { Rating } from '@/schema/attributes'
import { coinspectRef } from '@/schema/data-sources'
import { allWalletLadders, embeddedLadders } from '@/schema/ladders'
import { Variant } from '@/schema/variants'
import { type RatedWallet, rateWallet } from '@/schema/wallet'

const shortAttributeTree = attributeTreeForIds([])

export const walletFixtures = {
	nonSquare: () => allRatedWalletsBySlug.metamask,
	software: () => allRatedWalletsBySlug.metamask,
	credits: () => {
		const wallet: RatedWallet<string> = allRatedWalletsBySlug.metamask
		const [groupId, group] = Object.entries(wallet.overall)[0] ?? []
		const [attributeId, evaluated] = Object.entries(group ?? {})[0] ?? []
		const check = coinspectReport.scores.categories[0]?.checkResults[0]

		if (!groupId || !group || !attributeId || !evaluated || !check) {
			throw new Error(
				'The credits fixture requires an existing evaluated attribute and report check',
			)
		}

		const reference = coinspectRef({
			report: coinspectReport,
			check: check.checkUID,
			note: 'Coinspect report attribution.',
		})

		return {
			...wallet,
			overall: {
				...wallet.overall,
				[groupId]: {
					...group,
					[attributeId]: {
						...evaluated,
						evaluation: {
							...evaluated.evaluation,
							references: [...(evaluated.evaluation.references ?? []), reference],
						},
					},
				},
			},
		} satisfies RatedWallet<string>
	},
	exemptGroup: () => {
		const wallet: RatedWallet<string> = allRatedWalletsBySlug.metamask
		const group = Object.values(attributeTreeForWallet(wallet))[0]

		if (!group) {
			throw new Error('The mixed visibility fixture requires an attribute group')
		}

		return {
			...wallet,
			overall: {
				...wallet.overall,
				[group.id]: Object.fromEntries(
					Object.entries(wallet.overall[group.id]).map(([id, evaluated]) => [
						id,
						{
							...evaluated,
							evaluation: {
								...evaluated.evaluation,
								outcome: { ...evaluated.evaluation.outcome, rating: Rating.EXEMPT },
							},
						},
					]),
				),
			},
		}
	},
	hardware: () => allRatedWalletsBySlug.trezor,
	embedded: () =>
		rateWallet(embeddedWalletAttributeTree, embeddedLadders, {
			...unratedEmbeddedTemplate,
			metadata: {
				...unratedEmbeddedTemplate.metadata,
				id: 'ambire',
				displayName: 'Embedded fixture',
			},
		}),
	short: () =>
		rateWallet(shortAttributeTree, embeddedLadders, {
			features: unratedEmbeddedTemplate.features,
			variants: unratedEmbeddedTemplate.variants,
			metadata: {
				...unratedEmbeddedTemplate.metadata,
				id: 'ambire',
				displayName: 'Short page fixture',
			},
		}),
	unknown: () =>
		rateWallet(softwareWalletAttributeTree, allWalletLadders, {
			...unratedTemplate,
			metadata: {
				...unratedTemplate.metadata,
				id: 'ambire',
				displayName: 'Unknown criteria fixture',
			},
		}),
	longName: () =>
		rateWallet(softwareWalletAttributeTree, allWalletLadders, {
			...metamask,
			metadata: {
				...metamask.metadata,
				displayName:
					'A wallet with a deliberately long name that must wrap without losing its controls',
			},
		}),
	multipleTypes: () =>
		rateWallet(softwareWalletAttributeTree, allWalletLadders, {
			...unratedTemplate,
			metadata: {
				...unratedTemplate.metadata,
				id: 'ambire',
				displayName: 'Multiple wallet types fixture',
			},
			variants: { [Variant.BROWSER]: true, [Variant.HARDWARE]: true },
		}),
} satisfies Record<string, () => RatedWallet<string>>

export function isWalletFixture(name: string): name is keyof typeof walletFixtures {
	return Object.hasOwn(walletFixtures, name)
}

export function walletFixtureAttributeTree(
	name: keyof typeof walletFixtures,
	wallet: RatedWallet<string>,
) {
	return name === 'short' ? shortAttributeTree : attributeTreeForWallet(wallet)
}
