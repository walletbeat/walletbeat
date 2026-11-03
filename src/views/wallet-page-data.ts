import type { AttributeTree, EvaluationTree } from '@/schema/attribute-groups'
import { attributeTree } from '@/schema/attribute-tree'
import type { EvaluatedAttribute, Evaluation, OutcomeMetadata } from '@/schema/attributes'
import { allWalletLadders, WalletLadderType } from '@/schema/ladders'
import type { WalletLadderEvaluation, WalletStage } from '@/schema/stages'
import type { AtLeastOneVariant, Variant } from '@/schema/variants'
import type { RatedWallet, ResolvedWallet } from '@/schema/wallet'
import { nonEmptyRemap } from '@/types/utils/non-empty'
import { remap } from '@/types/utils/remap'

type PageEvaluations = Record<string, Record<string, number>>
type PageVariant = Pick<ResolvedWallet<string>, 'features'> & { attributes: PageEvaluations }
type PageStage = Pick<WalletStage<string>, 'id'>
type PageLadder = {
	stage: Exclude<WalletLadderEvaluation<string>['stage'], WalletStage<string>> | PageStage
	highestClearedStage: PageStage | null
}

/** Evaluated facts; executable definitions remain owned by the schema. */
export type WalletPageData = Omit<RatedWallet<string>, 'overall' | 'variants' | 'ladders'> & {
	evaluations: Evaluation<OutcomeMetadata>[]
	overall: PageEvaluations
	variants: AtLeastOneVariant<PageVariant>
	ladders: Partial<Record<WalletLadderType, PageLadder>>
}

export function walletPageData(wallet: RatedWallet<string>): WalletPageData {
	const pool: Evaluation<OutcomeMetadata>[] = []
	const indices = new Map<Evaluation<OutcomeMetadata>, number>()
	const intern = (evaluation: Evaluation<OutcomeMetadata>): number => {
		const existing = indices.get(evaluation)

		if (existing !== undefined) {
			return existing
		}

		const index = pool.length

		indices.set(evaluation, index)
		pool.push(evaluation)

		return index
	}
	const evaluations = (tree: EvaluationTree<string>): PageEvaluations =>
		remap(tree, (_group: string, entries: EvaluationTree<string>[string]) =>
			remap(entries, (_id: string, entry: EvaluatedAttribute<OutcomeMetadata>) =>
				intern(entry.evaluation),
			),
		)

	return {
		metadata: wallet.metadata,
		types: wallet.types,
		variantSpecificity: wallet.variantSpecificity,
		overrides: wallet.overrides,
		evaluations: pool,
		overall: evaluations(wallet.overall),
		variants: nonEmptyRemap(
			wallet.variants,
			(_variant: Variant, resolved: ResolvedWallet<string>) => ({
				features: resolved.features,
				attributes: evaluations(resolved.attributes),
			}),
		),
		ladders: Object.fromEntries(
			Object.values(WalletLadderType).flatMap(type => {
				const value = wallet.ladders[type]

				return value === undefined
					? []
					: [
							[
								type,
								{
									stage: typeof value.stage === 'string' ? value.stage : { id: value.stage.id },
									highestClearedStage: value.highestClearedStage && {
										id: value.highestClearedStage.id,
									},
								},
							] as const,
						]
			}),
		),
	}
}

export function walletPageAttributeTree(data: WalletPageData): AttributeTree<string> {
	const hasGroup = (id: string): id is keyof typeof attributeTree =>
		Object.hasOwn(attributeTree, id)

	return Object.fromEntries(
		Object.keys(data.overall).map(id => {
			if (!hasGroup(id)) {
				throw new Error(`Unknown attribute group: ${id}`)
			}

			return [id, attributeTree[id]]
		}),
	)
}

/** Reattach canonical definitions without re-evaluating wallet features. */
export function restoreWalletPageData(data: WalletPageData): RatedWallet<string> {
	const tree = walletPageAttributeTree(data)
	const evaluations = (values: PageEvaluations): EvaluationTree<string> =>
		remap(values, (groupId: string, entries: PageEvaluations[string]) =>
			remap(entries, (id: string, index: number) => {
				const evaluation = data.evaluations[index]

				if (!evaluation) {
					throw new Error(`Unknown evaluation: ${index}`)
				}

				const attribute = tree[groupId].attributes.find(
					entry => entry.attribute.id === id,
				)?.attribute

				if (!attribute) {
					throw new Error(`Unknown attribute: ${groupId}.${id}`)
				}

				return { attribute, evaluation }
			}),
		)

	const { evaluations: _evaluations, ...facts } = data

	return {
		...facts,
		overall: evaluations(data.overall),
		variants: nonEmptyRemap(data.variants, (variant: Variant, resolved: PageVariant) => ({
			metadata: data.metadata,
			variant,
			features: resolved.features,
			attributes: evaluations(resolved.attributes),
		})),
		ladders: Object.fromEntries(
			Object.values(WalletLadderType).flatMap(type => {
				const value = data.ladders[type]

				if (!value) {
					return []
				}

				const ladder = allWalletLadders[type]
				const stage = (value: PageStage) => {
					const result = ladder.stages.find(stage => stage.id === value.id)

					if (!result) {
						throw new Error(`Unknown stage: ${type}.${value.id}`)
					}

					return result
				}

				return [
					[
						type,
						{
							ladder,
							stage: typeof value.stage === 'string' ? value.stage : stage(value.stage),
							highestClearedStage: value.highestClearedStage && stage(value.highestClearedStage),
						},
					],
				]
			}),
		),
	}
}
