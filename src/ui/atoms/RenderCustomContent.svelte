<script
	lang="ts"
	generics="CustomContent extends _CustomContent"
>
	// Types/constants
	import type { CustomContent as _CustomContent } from '@/types/content'


	// Props
	let {
		content,
		...otherProps
	}: {
		content: CustomContent
	} & CustomContent['component']['componentProps'] = $props()

	const { component: componentName, componentProps } = content.component


	// Components
	import AddressCorrelationDetails from '../molecules/attributes/privacy/AddressCorrelationDetails.svelte'
	import ChainVerificationDetails from '../molecules/attributes/security/ChainVerificationDetails.svelte'
	import ScamAlertDetails from '../molecules/attributes/security/ScamAlertDetails.svelte'
	import SecurityAuditsDetails from '../molecules/attributes/security/SecurityAuditsDetails.svelte'
	import TransactionInclusionDetails from '../molecules/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
	import FundingDetails from '../molecules/attributes/transparency/FundingDetails.svelte'
	import LicenseDetails from '../molecules/attributes/transparency/LicenseDetails.svelte'
	import SourceVisibilityDetails from '../molecules/attributes/transparency/SourceVisibilityDetails.svelte'
	import UnratedAttribute from '../molecules/attributes/UnratedAttribute.svelte'
</script>


{#if componentName === 'AddressCorrelationDetails'}
	<AddressCorrelationDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'ChainVerificationDetails'}
	<ChainVerificationDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'ScamAlertDetails'}
	<ScamAlertDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'SecurityAuditsDetails'}
	<SecurityAuditsDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'TransactionInclusionDetails'}
	<TransactionInclusionDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'FundingDetails'}
	<FundingDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'LicenseDetails'}
	<LicenseDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'SourceVisibilityDetails'}
	<SourceVisibilityDetails
		{...componentProps}
		{...otherProps}
	/>
{:else if componentName === 'UnratedAttribute'}
	<UnratedAttribute
		{...componentProps}
		{...otherProps}
	/>
{/if}
