<script lang="ts">
	// Types/constants
	import { type AttributeGroup, type EvaluatedGroup, type EvaluatedAttribute, Rating, ratingToIcon } from '@/schema/attributes'
	import { attributeVariantSpecificity, VariantSpecificity, type RatedWallet } from '@/schema/wallet'
	import type { Variant } from '@/schema/variants'


	// Props
	let {
		wallet,
		attributeGroup,
		evaluatedAttribute,
		selectedVariant,
	}: {
		wallet: RatedWallet
		attributeGroup?: AttributeGroup<any>
		evaluatedAttribute?: EvaluatedAttribute<any>
		selectedVariant?: Variant
	} = $props()


	// Functions
	import { slugifyCamelCase } from '@/types/utils/text'
	import { variantToName, variantUrlQuery } from '@/components/variants'


	// Components
	import Typography from '../atoms/Typography.svelte'
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
</script>


<div>
	{#if attributeGroup && !evaluatedAttribute?.evaluation?.value}
		<!-- Attribute group -->
		<h3>
			<span>{attributeGroup.icon}</span> {attributeGroup.displayName}
		</h3>

		<p>
			<Typography
				content={attributeGroup.perWalletQuestion}
				strings={{
					WALLET_NAME: wallet.metadata.displayName,
				}}
			/>
		</p>

	{:else}
		<!-- Attribute -->
		<h4>
			<span>{evaluatedAttribute.evaluation.value.icon ?? evaluatedAttribute.attribute.icon}</span>
			{evaluatedAttribute.attribute.displayName}
		</h4>

		<p>
			{ratingToIcon(evaluatedAttribute.evaluation.value.rating)}

			<Typography
				content={evaluatedAttribute.evaluation.value.shortExplanation}
				strings={{
					WALLET_NAME: wallet.metadata.displayName,
					WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
					WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
				}}
			/>

			{#if selectedVariant && wallet.variants[selectedVariant]}
				{@const specificity = attributeVariantSpecificity(wallet, selectedVariant, evaluatedAttribute.attribute)}

				{#if specificity === VariantSpecificity.NOT_UNIVERSAL}
					This is the case on the {variantToName(selectedVariant, false)} version.
				{:else if specificity === VariantSpecificity.UNIQUE_TO_VARIANT}
					This is only the case on the {variantToName(selectedVariant, false)} version.
				{/if}
			{/if}
		</p>

		<div>
			<a 
				href="/{wallet.metadata.id}/{variantUrlQuery(wallet.variants, selectedVariant)}#{slugifyCamelCase(evaluatedAttribute.attribute.id)}"
			>
				<span>{@html InfoIcon}</span>
				Learn more
			</a>
		</div>
	{/if}
</div>


<style>
	div {
		display: grid;
		gap: 0.5em;
		line-height: 1.4;
	}
</style>
