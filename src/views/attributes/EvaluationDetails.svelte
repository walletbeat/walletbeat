<script lang="ts">
	// Types/constants
	import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
	import { toFullyQualified } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType, isTypographicContent } from '@/types/content'
	import { evaluationDetailRenderData } from '@/types/content/evaluation-details'


	// Props
	const {
		wallet,
		evaluation,
	}: {
		wallet: RatedWallet<string>
		evaluation: Evaluation<OutcomeMetadata>
	} = $props()


	// Components
	import Typography from '@/components/Typography.svelte'
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
</script>


{#if isTypographicContent(evaluation.details)}
	<Typography
		content={evaluation.details}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>

{:else if evaluation.details.contentType === ContentType.COMPONENT}
	{@const renderData = evaluationDetailRenderData(evaluation.details.component, evaluation.outcome)}
	{@const references = evaluation.references && toFullyQualified(evaluation.references)}

	<div data-column>
		{#if renderData.component === 'AddressCorrelationDetails'}
			<AddressCorrelationDetails {...renderData.componentProps} {wallet} />
		{:else if renderData.component === 'PrivateTransfersDetails'}
			<PrivateTransfersDetails {...renderData.componentProps} {wallet} />
		{:else if renderData.component === 'ChainVerificationDetails'}
			<ChainVerificationDetails {...renderData.componentProps} {wallet} refs={references} />
		{:else if renderData.component === 'ScamAlertDetails'}
			<ScamAlertDetails {...renderData.componentProps} {wallet} outcome={renderData.outcome} />
		{:else if renderData.component === 'SecurityAuditsDetails'}
			<SecurityAuditsDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
		{:else if renderData.component === 'TransactionInclusionDetails'}
			<TransactionInclusionDetails {...renderData.componentProps} {wallet} />
		{:else if renderData.component === 'FundingDetails'}
			<FundingDetails {...renderData.componentProps} {wallet} />
		{:else if renderData.component === 'AccountRecoveryDetails'}
			<AccountRecoveryDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
		{:else if renderData.component === 'AccountUnruggabilityDetails'}
			<AccountUnruggabilityDetails {...renderData.componentProps} {wallet} metadata={renderData.outcome.metadata} />
		{:else if renderData.component === 'UnratedAttribute'}
			<UnratedAttribute {...renderData.componentProps} {wallet} />
		{/if}
	</div>
{/if}
