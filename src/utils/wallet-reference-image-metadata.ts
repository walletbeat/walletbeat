import { getNewsForWallet } from '@/data/news'
import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import { type FullyQualifiedReference, refs, toFullyQualified } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import { isTypographicContent } from '@/types/content'
import { evaluationDetailRenderData } from '@/types/content/evaluation-details'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'

function evaluationReferences(evaluation: Evaluation<OutcomeMetadata>): FullyQualifiedReference[] {
	const { details, outcome, references } = evaluation

	if (details && !isTypographicContent(details)) {
		const renderData = evaluationDetailRenderData(details.component, outcome)

		switch (renderData.component) {
			case 'SecurityAuditsDetails':
				return renderData.outcome.metadata.securityAudits.flatMap(audit =>
					toFullyQualified(audit.ref),
				)
			case 'ScamAlertDetails': {
				const { metadata } = renderData.outcome

				return metadata.scamAlerts
					? [
							metadata.sendTransactionWarning,
							metadata.contractTransactionWarning,
							metadata.scamUrlWarning,
							metadata.unlimitedApprovalWarning,
						]
							.filter(warning => warning.required)
							.flatMap(refs)
					: []
			}
			case 'FundingDetails':
				return renderData.componentProps.monetization
					? refs(renderData.componentProps.monetization)
					: []
		}
	}

	return toFullyQualified(references)
}

/** Derive image metadata from the evaluations and news rendered on a wallet page. */
export function walletReferenceImageDimensions(wallet: RatedWallet<string>) {
	const evaluations = [
		wallet.overall,
		...Object.values(wallet.variants)
			.filter((variant): variant is NonNullable<typeof variant> => variant != null)
			.map(variant => variant.attributes),
	]

	return referenceImageDimensions([
		...evaluations.flatMap(tree =>
			Object.values(tree).flatMap(group =>
				Object.values(group).flatMap(attribute => evaluationReferences(attribute.evaluation)),
			),
		),
		...getNewsForWallet(wallet.metadata.id).flatMap(refs),
	])
}
