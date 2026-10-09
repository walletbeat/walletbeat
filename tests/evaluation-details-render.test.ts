import fs from 'node:fs'
import path from 'node:path'

import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import Typography from '@/components/Typography.svelte'
import { variantToName } from '@/constants/variants'
import { allRatedWallets, attributeTreeForWallet } from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import type { EvaluatedAttribute, OutcomeMetadata } from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import { type ComponentAndProps, isTypographicContent } from '@/types/content'
import {
	type EvaluationDetailRenderData,
	evaluationDetailRenderData,
} from '@/types/content/evaluation-details'
import { getRepositoryRoot } from '@/utils/codebase'
import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
import AccountRecoveryDetails from '@/views/attributes/security/AccountRecoveryDetails.svelte'
import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'
import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
import AccountUnruggabilityDetails from '@/views/attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'
import UnratedAttribute from '@/views/attributes/UnratedAttribute.svelte'

/**
 * Server-render the details of an evaluation the same way `WalletPage.svelte`
 * does, and return the resulting HTML.
 */
function renderDetailsHtml(
	wallet: RatedWallet<string>,
	evalAttr: EvaluatedAttribute<OutcomeMetadata>,
): string {
	const { details, outcome } = evalAttr.evaluation

	if (isTypographicContent(details)) {
		return render(Typography, {
			props: { content: details, strings: { WALLET_NAME: wallet.metadata.displayName } },
		}).body
	}

	const renderData = evaluationDetailRenderData(details.component, outcome)
	const references =
		evalAttr.evaluation.references && toFullyQualified(evalAttr.evaluation.references)

	return renderCustomDetails(renderData, wallet, references).body
}

/**
 * Mirrors the custom-component dispatch in `WalletPage.svelte`.
 * The switch is exhaustive, so adding a new component type without handling it
 * here is a type error.
 */
function renderCustomDetails(
	renderData: EvaluationDetailRenderData,
	wallet: RatedWallet<string>,
	references: ReturnType<typeof toFullyQualified> | undefined,
): { body: string } {
	switch (renderData.component) {
		case 'AddressCorrelationDetails':
			return render(AddressCorrelationDetails, {
				props: { ...renderData.componentProps, wallet },
			})
		case 'PrivateTransfersDetails':
			return render(PrivateTransfersDetails, {
				props: { ...renderData.componentProps, wallet },
			})
		case 'ChainVerificationDetails':
			return render(ChainVerificationDetails, {
				props: { ...renderData.componentProps, wallet, refs: references },
			})
		case 'ScamAlertDetails':
			return render(ScamAlertDetails, {
				props: { ...renderData.componentProps, wallet, outcome: renderData.outcome },
			})
		case 'SecurityAuditsDetails':
			return render(SecurityAuditsDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			})
		case 'TransactionInclusionDetails':
			return render(TransactionInclusionDetails, {
				props: { ...renderData.componentProps, wallet },
			})
		case 'FundingDetails':
			return render(FundingDetails, {
				props: { ...renderData.componentProps, wallet },
			})
		case 'AccountRecoveryDetails':
			return render(AccountRecoveryDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			})
		case 'AccountUnruggabilityDetails':
			return render(AccountUnruggabilityDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			})
		case 'UnratedAttribute':
			return render(UnratedAttribute, {
				props: { ...renderData.componentProps, wallet },
			})
	}
}

/** Reduce rendered HTML to the text a visitor would see. */
function visibleText(html: string): string {
	return html
		.replace(/<!--[\s\S]*?-->/gu, '')
		.replace(/<(script|style)\b[\s\S]*?<\/\1>/giu, '')
		.replace(/<[^>]*>/gu, ' ')
		.replace(/&nbsp;|&#160;/gu, ' ')
		.replace(/\s+/gu, ' ')
		.trim()
}

// Every custom details component. `satisfies` makes this fail to compile when a
// component type is added to `ComponentAndProps` but not listed here.
const customDetailsComponents = Object.keys({
	AccountRecoveryDetails: true,
	AccountUnruggabilityDetails: true,
	AddressCorrelationDetails: true,
	ChainVerificationDetails: true,
	FundingDetails: true,
	PrivateTransfersDetails: true,
	ScamAlertDetails: true,
	SecurityAuditsDetails: true,
	TransactionInclusionDetails: true,
	UnratedAttribute: true,
} as const satisfies Record<ComponentAndProps['component'], true>)

describe('wallet page evaluation details', () => {
	it('WalletPage.svelte renders every custom details component', () => {
		const walletPageSource = fs.readFileSync(
			path.join(getRepositoryRoot(), 'src', 'views', 'WalletPage.svelte'),
			'utf8',
		)
		const handledComponents = new Set(
			Array.from(
				walletPageSource.matchAll(/renderData\.component === '(?<component>\w+)'/gu),
				match => match.groups?.component,
			),
		)

		for (const component of customDetailsComponents) {
			expect(handledComponents, `WalletPage.svelte does not render ${component}`).toContain(
				component,
			)
		}
	})

	for (const ratedWallet of Object.values(allRatedWallets)) {
		describe(ratedWallet.metadata.displayName, () => {
			for (const { evalTree, variantName } of [
				{ evalTree: ratedWallet.overall, variantName: 'overall' },
				...Object.values(ratedWallet.variants)
					.filter((w): w is NonNullable<typeof w> => w != null)
					.map(resolvedWallet => ({
						evalTree: resolvedWallet.attributes,
						variantName: variantToName(resolvedWallet.variant, false),
					})),
			]) {
				it(`renders non-empty details for every attribute (${variantName})`, () => {
					mapNonExemptAttributeGroupsInTree(
						attributeTreeForWallet(ratedWallet),
						evalTree,
						(_, evalGroup) => {
							mapNonExemptGroupAttributes(evalGroup, evalAttr => {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all attribute type parameters extend OutcomeMetadata.
								const genericEvalAttr = evalAttr as unknown as EvaluatedAttribute<OutcomeMetadata>
								const { details } = genericEvalAttr.evaluation
								const label = `${genericEvalAttr.attribute.displayName} (${
									isTypographicContent(details) ? 'text' : details.component.component
								})`

								expect(
									visibleText(renderDetailsHtml(ratedWallet, genericEvalAttr)),
									`${label} details rendered empty`,
								).not.toBe('')
							})
						},
					)
				})
			}
		})
	}
})
