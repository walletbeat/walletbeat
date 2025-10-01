<script lang="ts">
	// Types/constants
	import { type EvaluatedAttribute, ratingIcons, ratingToColor } from '@/schema/attributes'
	import { attributeVariantSpecificity, VariantSpecificity, type RatedWallet } from '@/schema/wallet'
	import type { Variant } from '@/schema/variants'


	// Props
	let {
		wallet,
		attribute,
		variant,
		showRating = false,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		attribute: EvaluatedAttribute<any>
		variant?: Variant
		showRating?: boolean
		isInTooltip?: boolean
	} = $props()


	// Functions
	import { slugifyCamelCase } from '@/types/utils/text'
	import { variantToName, variantUrlQuery } from '@/components/variants'


	// Components
	import Typography from '../atoms/Typography.svelte'
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
</script>


<div 
	class="attribute-summary"
	data-in-tooltip={isInTooltip ? '' : undefined}
	style:--accent={ratingToColor(attribute.evaluation.value.rating)}
>
	<header>
		<h4>
			<span>{attribute.evaluation.value.icon ?? attribute.attribute.icon}</span>
			{attribute.attribute.displayName}
		</h4>

		{#if showRating}
			<data
				class="badge"
				data-badge-size="small"
				value={attribute.evaluation.value.rating}
			>{attribute.evaluation.value.rating}</data>
		{/if}
	</header>

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
	.attribute-summary {
		font-size: smaller;
		display: grid;
		gap: 1em;
		line-height: 1.4;

		&[data-in-tooltip] {
			padding: 0.75rem;
			border-radius: 0.5rem;
			border: 2px solid var(--accent);
			background-color: var(--background-primary);
		}

		header {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: 0.5em 0.75em;

			h4 {
				font-weight: 600;
				display: flex;
				align-items: center;
				gap: 0.33em;
			}
		}

		p :global(.markdown) {
			display: inline;
		}
	}
</style>
