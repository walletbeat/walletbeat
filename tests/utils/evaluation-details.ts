import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import type { Root } from 'mdast'
import { remark } from 'remark'
import { render } from 'svelte/server'

import Typography from '@/components/Typography.svelte'
import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import { type FullyQualifiedReference, toFullyQualified } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import { isTypographicContent } from '@/types/content'
import {
	type EvaluationDetailRenderData,
	evaluationDetailRenderData,
} from '@/types/content/evaluation-details'
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
 * Server-render a custom details component with the props `WalletPage.svelte` passes it.
 * The switch is exhaustive, so a new component type must be handled here to compile.
 */
function renderCustomDetailsHtml(
	renderData: EvaluationDetailRenderData,
	wallet: RatedWallet<string>,
	references: FullyQualifiedReference[] | undefined,
): string {
	switch (renderData.component) {
		case 'AddressCorrelationDetails':
			return render(AddressCorrelationDetails, {
				props: { ...renderData.componentProps, wallet },
			}).body
		case 'PrivateTransfersDetails':
			return render(PrivateTransfersDetails, {
				props: { ...renderData.componentProps, wallet },
			}).body
		case 'ChainVerificationDetails':
			return render(ChainVerificationDetails, {
				props: { ...renderData.componentProps, wallet, refs: references },
			}).body
		case 'ScamAlertDetails':
			return render(ScamAlertDetails, {
				props: { ...renderData.componentProps, wallet, outcome: renderData.outcome },
			}).body
		case 'SecurityAuditsDetails':
			return render(SecurityAuditsDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			}).body
		case 'TransactionInclusionDetails':
			return render(TransactionInclusionDetails, {
				props: { ...renderData.componentProps, wallet },
			}).body
		case 'FundingDetails':
			return render(FundingDetails, {
				props: { ...renderData.componentProps, wallet },
			}).body
		case 'AccountRecoveryDetails':
			return render(AccountRecoveryDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			}).body
		case 'AccountUnruggabilityDetails':
			return render(AccountUnruggabilityDetails, {
				props: { ...renderData.componentProps, wallet, metadata: renderData.outcome.metadata },
			}).body
		case 'UnratedAttribute':
			return render(UnratedAttribute, {
				props: { ...renderData.componentProps, wallet },
			}).body
	}
}

/** Server-render the details of a wallet's evaluation as the wallet page displays them. */
export function renderEvaluationDetailsHtml<_OutcomeMetadata extends OutcomeMetadata>(
	wallet: RatedWallet<string>,
	evaluation: Evaluation<_OutcomeMetadata>,
): string {
	const { details, outcome, references } = evaluation

	if (isTypographicContent(details)) {
		return render(Typography, {
			props: { content: details, strings: { WALLET_NAME: wallet.metadata.displayName } },
		}).body
	}

	return renderCustomDetailsHtml(
		evaluationDetailRenderData(details.component, outcome),
		wallet,
		references === undefined ? undefined : toFullyQualified(references),
	)
}

/**
 * Convert server-rendered HTML to Markdown that keeps the visible text and its
 * structure (headings, lists, emphasis, links). Svelte hydration comments are dropped.
 */
export function renderedHtmlToMarkdown(html: string): string {
	const mdast = toMdast(fromHtml(html, { fragment: true }), {
		nodeHandlers: { comment: () => undefined },
	})
	const root: Root = mdast.type === 'root' ? mdast : { type: 'root', children: [mdast] }

	return remark().stringify(root)
}
