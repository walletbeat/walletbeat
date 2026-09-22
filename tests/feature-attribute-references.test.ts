import { describe, expect, it } from 'vitest'

import { allRatedWallets, attributeTreeForWallet } from '@/data/wallets'
import { evaluateAttributes, mapAttributesGetter } from '@/schema/attribute-groups'
import { Rating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { hasRefs, toFullyQualified } from '@/schema/reference'

const markerUrlPrefix = 'https://walletbeat.test/reference/'

interface MarkedFeatures {
	features: ResolvedFeatures
	markerPathByUrl: Map<string, string>
	populatedPaths: Set<string>
}

interface EvaluationIdentity {
	attributeId: string
	outcomeId: string
}

interface EvaluationObservation extends EvaluationIdentity {
	walletVariant: string
	populatedPaths: Set<string>
	preservedPaths: Set<string>
}

interface PropagationDifferenceIdentity extends EvaluationIdentity {
	path: string
}

function evaluationCohortKey({ attributeId, outcomeId }: EvaluationIdentity): string {
	return JSON.stringify([attributeId, outcomeId])
}

function propagationDifferenceKey({
	attributeId,
	outcomeId,
	path,
}: PropagationDifferenceIdentity): string {
	return JSON.stringify([attributeId, outcomeId, path])
}

const intentionalPropagationDifferences = new Set([
	// Account portability deliberately cites supported account types only. Rabby's EIP-7702
	// reference documents non-support, while the preserving wallets support EIP-7702.
	propagationDifferenceKey({
		attributeId: 'accountPortability',
		outcomeId: 'standard_eoa_exportable',
		path: 'accountSupport.eip7702.ref',
	}),
])

function markFeatureReferences(features: ResolvedFeatures): MarkedFeatures {
	const markedFeatures = structuredClone(features)
	const markerPathByUrl = new Map<string, string>()
	const populatedPaths = new Set<string>()
	const visited = new WeakSet<object>()
	let markerIndex = 0

	const visit = (value: unknown, path: string): void => {
		if (value === null || value === undefined || typeof value !== 'object') {
			return
		}

		if (visited.has(value)) {
			return
		}

		visited.add(value)

		if (Array.isArray(value)) {
			for (const item of value) {
				visit(item, `${path}[]`)
			}

			return
		}

		if (hasRefs(value) && toFullyQualified(value.ref).length > 0) {
			const markerUrl = `${markerUrlPrefix}${markerIndex}`
			const refPath = path === '' ? 'ref' : `${path}.ref`

			markerIndex++
			value.ref = markerUrl
			markerPathByUrl.set(markerUrl, refPath)
			populatedPaths.add(refPath)
		}

		for (const [key, child] of Object.entries(value)) {
			if (key === 'ref') {
				continue
			}

			visit(child, path === '' ? key : `${path}.${key}`)
		}
	}

	visit(markedFeatures, '')

	return { features: markedFeatures, markerPathByUrl, populatedPaths }
}

function preservedMarkerPaths(
	references: Parameters<typeof toFullyQualified>[0],
	markerPathByUrl: ReadonlyMap<string, string>,
): Set<string> {
	const preservedPaths = new Set<string>()

	for (const reference of toFullyQualified(references)) {
		for (const { url } of reference.urls) {
			const path = markerPathByUrl.get(url)

			if (path !== undefined) {
				preservedPaths.add(path)
			}
		}
	}

	return preservedPaths
}

describe('feature reference propagation', () => {
	it('is consistent across comparable wallet attribute evaluations', () => {
		const observations: EvaluationObservation[] = []
		const controlFailures: string[] = []
		let markedReferenceCount = 0
		let ratedEvaluationCount = 0

		for (const ratedWallet of Object.values(allRatedWallets)) {
			const attributeTree = attributeTreeForWallet(ratedWallet)

			for (const resolvedWallet of Object.values(ratedWallet.variants).filter(
				(wallet): wallet is NonNullable<typeof wallet> => wallet !== null && wallet !== undefined,
			)) {
				const { features, markerPathByUrl, populatedPaths } = markFeatureReferences(
					resolvedWallet.features,
				)
				const markedEvaluations = evaluateAttributes(attributeTree, features, ratedWallet.metadata)
				const walletVariant = `${ratedWallet.metadata.id}/${resolvedWallet.variant}`

				markedReferenceCount += markerPathByUrl.size

				mapAttributesGetter(markedEvaluations, getter => {
					const baseline = getter(resolvedWallet.attributes)
					const marked = getter(markedEvaluations)

					if (baseline === undefined || marked === undefined) {
						throw new Error(`Incomplete evaluation tree for ${walletVariant}`)
					}

					const baselineOutcome = baseline.evaluation.outcome
					const markedOutcome = marked.evaluation.outcome

					if (
						baselineOutcome.id !== markedOutcome.id ||
						baselineOutcome.rating !== markedOutcome.rating
					) {
						controlFailures.push(
							`${walletVariant} ${baseline.attribute.id}: ` +
								`baseline=${baselineOutcome.id}/${baselineOutcome.rating}, ` +
								`marked=${markedOutcome.id}/${markedOutcome.rating}`,
						)

						return
					}

					if (
						baselineOutcome.rating === Rating.EXEMPT ||
						baselineOutcome.rating === Rating.UNRATED
					) {
						return
					}

					ratedEvaluationCount++
					observations.push({
						walletVariant,
						attributeId: baseline.attribute.id,
						outcomeId: baselineOutcome.id,
						populatedPaths,
						preservedPaths: preservedMarkerPaths(marked.evaluation.references, markerPathByUrl),
					})
				})
			}
		}

		expect(controlFailures, 'Reference markers changed evaluation outcomes').toEqual([])
		expect(markedReferenceCount, 'No populated feature references were marked').toBeGreaterThan(0)
		expect(ratedEvaluationCount, 'No rated attribute evaluations were inspected').toBeGreaterThan(0)

		const cohorts = new Map<string, EvaluationObservation[]>()

		for (const observation of observations) {
			const cohortKey = evaluationCohortKey(observation)
			const cohort = cohorts.get(cohortKey) ?? []

			cohort.push(observation)
			cohorts.set(cohortKey, cohort)
		}

		const inconsistencies: string[] = []
		let comparisonCount = 0
		let inferredExpectationCount = 0

		for (const cohort of cohorts.values()) {
			const populatedPaths = new Set(cohort.flatMap(observation => [...observation.populatedPaths]))

			for (const path of populatedPaths) {
				const eligible = cohort.filter(observation => observation.populatedPaths.has(path))

				if (eligible.length < 2) {
					continue
				}

				comparisonCount++

				const preserving = eligible.filter(observation => observation.preservedPaths.has(path))

				if (preserving.length === 0) {
					continue
				}

				const { attributeId, outcomeId } = eligible[0]
				const differenceKey = propagationDifferenceKey({ attributeId, outcomeId, path })

				if (intentionalPropagationDifferences.has(differenceKey)) {
					continue
				}

				inferredExpectationCount++

				if (preserving.length === eligible.length) {
					continue
				}

				const notPreserving = eligible.filter(observation => !observation.preservedPaths.has(path))

				inconsistencies.push(
					[
						`${attributeId}/${outcomeId} at ${path}`,
						`  preserving: ${preserving
							.map(({ walletVariant }) => walletVariant)
							.sort()
							.join(', ')}`,
						`  not preserving: ${notPreserving
							.map(({ walletVariant }) => walletVariant)
							.sort()
							.join(', ')}`,
					].join('\n'),
				)
			}
		}

		expect(
			comparisonCount,
			'No populated reference paths had comparable evaluations',
		).toBeGreaterThan(0)
		expect(
			inferredExpectationCount,
			'No feature reference propagation expectations were inferred',
		).toBeGreaterThan(0)
		expect(inconsistencies.sort(), 'Inconsistent feature reference propagation').toEqual([])
	})
})
