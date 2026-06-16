import { ratedEmbeddedWallets, embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { ratedHardwareWallets, hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { ratedSoftwareWallets, softwareWalletAttributeTree } from '@/data/software-wallets'
import type { AttributeGroup, AttributeTree } from '@/schema/attribute-groups'
import type { Rating } from '@/schema/attributes'
import type { Support } from '@/schema/features/support'
import { getEvaluateFunctionAttributeId, type StageCriterionRating } from '@/schema/stages'
import type { RatedWallet } from '@/schema/wallet'

type WalletTableSource = {
	wallets: RatedWallet<string>[]
	attributeTree: AttributeTree<string>
}

type AccountSupportStatus = Record<string, { support: string }>

type CompactAttributeTree = Record<
	string,
	Omit<AttributeGroup<string>, 'attributes'> & {
		attributes: Array<{
			attribute: {
				id: string
				icon: string
				displayName: string
			}
			weight: number
		}>
	}
>

type CompactWallet = {
	metadata: Pick<
		RatedWallet<string>['metadata'],
		| 'id'
		| 'displayName'
		| 'iconExtension'
		| 'hardwareWalletManufactureType'
		| 'blurb'
		| 'urls'
	>
	types: RatedWallet<string>['types']
	variants: Record<string, { features: { accountSupport: AccountSupportStatus | null } }>
	variantSpecificity: Record<string, Record<string, unknown>>
	overall: Record<
		string,
		Record<
			string,
			{
				evaluation: {
					outcome: {
						rating: Rating
						shortExplanation?: unknown
					}
				}
			}
		>
	>
	ladders: Record<
		string,
		{
			stage:
				| 'NOT_APPLICABLE'
				| 'QUALIFIED_FOR_NO_STAGES'
				| {
						id: string
						label: string
						description: unknown
						criteriaGroups: Array<{
							criteria: Array<{
								id: string
								description: unknown
								attributeId: string | null
							}>
						}>
					}
			ladder: {
				stages: Array<{
					id: string
					label: string
					description: unknown
					criteriaGroups: Array<{
						criteria: Array<{
							id: string
							description: unknown
							attributeId: string | null
						}>
					}>
				}>
			}
		}
	>
	stageEvaluations?: Record<string, Record<string, Record<string, StageCriterionRating>>>
}

export type WalletTablePayload = {
	wallets: CompactWallet[]
	attributeTree: CompactAttributeTree
}

export const walletTableDataIds = [
	'home-software',
	'home-hardware',
	'embedded-summary',
	'hww-summary',
	'wallet-summary',
] as const

export type WalletTableDataId = (typeof walletTableDataIds)[number]

const compactCriterion = (criterion: { id: string; description: unknown; evaluate: unknown }) => ({
	id: criterion.id,
	description: criterion.description,
	attributeId:
		typeof criterion.evaluate === 'function'
			? getEvaluateFunctionAttributeId(criterion.evaluate)
			: null,
})

const compactStage = (stage: {
	id: string
	label: string
	description: unknown
	criteriaGroups: Array<{ criteria: Array<{ id: string; description: unknown; evaluate: unknown }> }>
}) => ({
	id: stage.id,
	label: stage.label,
	description: stage.description,
	criteriaGroups: stage.criteriaGroups.map(criteriaGroup => ({
		criteria: criteriaGroup.criteria.map(compactCriterion),
	})),
})

const compactAttributeTree = (attributeTree: AttributeTree<string>): CompactAttributeTree =>
	Object.fromEntries(
		Object.entries(attributeTree).map(([groupId, group]) => [
			groupId,
			{
				id: group.id,
				icon: group.icon,
				displayName: group.displayName,
				perWalletQuestion: group.perWalletQuestion,
				attributes: group.attributes.map(({ attribute, weight }) => ({
					attribute: {
						id: attribute.id,
						icon: attribute.icon,
						displayName: attribute.displayName,
					},
					weight,
				})),
			},
		]),
	)

const compactAccountSupport = (
	accountSupport: Support<Record<string, unknown>> | null,
): AccountSupportStatus | null =>
	accountSupport === null ?
		null
	:
		Object.fromEntries(
			Object.entries(accountSupport).map(([accountType, support]) => [
				accountType,
				{ support: support.support },
			]),
		)

const compactWallet = (wallet: RatedWallet<string>): CompactWallet => {
	const stageEvaluations = Object.fromEntries(
		Object.entries(wallet.ladders)
			.filter(([, evaluation]) => evaluation.stage !== 'NOT_APPLICABLE')
			.map(([ladderType, evaluation]) => [
				ladderType,
				Object.fromEntries(
					evaluation.ladder.stages.map(stage => [
						stage.id,
						Object.fromEntries(
							stage.criteriaGroups.flatMap(criteriaGroup =>
								criteriaGroup.criteria.map(criterion => [
									criterion.id,
									criterion.evaluate({
										types: wallet.types,
										variants: wallet.variants,
										variantSpecificity: wallet.variantSpecificity,
										overall: wallet.overall,
										overrides: wallet.overrides,
									}).rating,
								]),
							),
						),
					]),
				),
			]),
	)

	return {
		metadata: {
			id: wallet.metadata.id,
			displayName: wallet.metadata.displayName,
			iconExtension: wallet.metadata.iconExtension,
			hardwareWalletManufactureType: wallet.metadata.hardwareWalletManufactureType,
			blurb: wallet.metadata.blurb,
			urls: wallet.metadata.urls,
		},
		types: wallet.types,
		variants: Object.fromEntries(
			Object.entries(wallet.variants).map(([variant, resolvedWallet]) => [
				variant,
				{
					features: {
						accountSupport: compactAccountSupport(resolvedWallet.features.accountSupport),
					},
				},
			]),
		),
		variantSpecificity: Object.fromEntries(
			Object.entries(wallet.variantSpecificity).map(([variant, specificity]) => [
				variant,
				Object.fromEntries(specificity),
			]),
		),
		overall: Object.fromEntries(
			Object.entries(wallet.overall).map(([groupId, group]) => [
				groupId,
				Object.fromEntries(
					Object.entries(group).map(([attributeId, evaluated]) => [
						attributeId,
						{
							evaluation: {
								outcome: {
									rating: evaluated.evaluation.outcome.rating,
									shortExplanation: evaluated.evaluation.outcome.shortExplanation,
								},
							},
						},
					]),
				),
			]),
		),
		ladders: Object.fromEntries(
			Object.entries(wallet.ladders).map(([ladderType, evaluation]) => [
				ladderType,
				{
					stage: typeof evaluation.stage === 'object' ? compactStage(evaluation.stage) : evaluation.stage,
					ladder: {
						stages: evaluation.ladder.stages.map(compactStage),
					},
				},
			]),
		),
		...(Object.keys(stageEvaluations).length === 0 ? {} : { stageEvaluations }),
	}
}

const sourceById = (id: WalletTableDataId): WalletTableSource => {
	if (id === 'home-software' || id === 'wallet-summary') {
		return {
			wallets: Object.values(ratedSoftwareWallets),
			attributeTree: softwareWalletAttributeTree,
		}
	}

	if (id === 'home-hardware' || id === 'hww-summary') {
		return {
			wallets: Object.values(ratedHardwareWallets),
			attributeTree: hardwareWalletAttributeTree,
		}
	}

	if (id === 'embedded-summary') {
		return {
			wallets: Object.values(ratedEmbeddedWallets),
			attributeTree: embeddedWalletAttributeTree,
		}
	}

	return {
		wallets: Object.values(ratedEmbeddedWallets),
		attributeTree: embeddedWalletAttributeTree,
	}
}

export const isWalletTableDataId = (id: string): id is WalletTableDataId =>
	(walletTableDataIds as readonly string[]).includes(id)

export const getWalletTableData = (id: WalletTableDataId): WalletTablePayload => {
	const source = sourceById(id)

	return {
		wallets: source.wallets.map(compactWallet),
		attributeTree: compactAttributeTree(source.attributeTree),
	}
}
