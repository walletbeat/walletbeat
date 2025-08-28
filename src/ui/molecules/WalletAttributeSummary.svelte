<script lang="ts">
	// Types/constants
	import { type EvaluatedAttribute, ratingIcons } from '@/schema/attributes'
	import { attributeVariantSpecificity, VariantSpecificity, type RatedWallet } from '@/schema/wallet'
	import type { Variant } from '@/schema/variants'


	// Props
	let {
		wallet,
		attribute,
		variant,
	}: {
		wallet: RatedWallet
		attribute: EvaluatedAttribute<any>
		variant?: Variant
	} = $props()


	// Functions
	import { slugifyCamelCase } from '@/types/utils/text'
	import { variantToName, variantUrlQuery } from '@/components/variants'


	// Components
	import Typography from '../atoms/Typography.svelte'
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
</script>


<div>
	<h4>
		<span>{attribute.evaluation.value.icon ?? attribute.attribute.icon}</span>
		{attribute.attribute.displayName}
	</h4>

	<p>
		{ratingIcons[attribute.evaluation.value.rating]}

		<Typography
			content={attribute.evaluation.value.shortExplanation}
			strings={{
				WALLET_NAME: wallet.metadata.displayName,
				WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
				WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
			}}
		/>

		{#if variant && wallet.variants[variant]}
			{@const specificity = attributeVariantSpecificity(wallet, variant, attribute.attribute)}

			{#if specificity === VariantSpecificity.NOT_UNIVERSAL}
				This is the case on the {variantToName(variant, false)} version.
			{:else if specificity === VariantSpecificity.UNIQUE_TO_VARIANT}
				This is only the case on the {variantToName(variant, false)} version.
			{/if}
		{/if}
	</p>

	<div>
		<a 
			href="/{wallet.metadata.id}/{variantUrlQuery(wallet.variants, variant ?? null)}#{slugifyCamelCase(attribute.attribute.id)}"
		>
			<span>{@html InfoIcon}</span>
			Learn more
		</a>
	</div>
</div>


<style>
	div {
		font-size: smaller;

		display: grid;
		gap: 1em;
		line-height: 1.4;
	}
</style>
