<script lang="ts">
	// Types/constants
	import { type EvaluatedAttribute, ratingIcons, ratingToColor, type Value } from '@/schema/attributes'
	import type { Variant } from '@/schema/variants'
	import { attributeVariantSpecificity, type RatedWallet,VariantSpecificity } from '@/schema/wallet'


	// Props
	let {
		wallet,
		attribute,
		variant,
		showRating = false,
		isInTooltip = false,
	}: {
		wallet: RatedWallet
		attribute: EvaluatedAttribute<Value>
		variant?: Variant
		showRating?: boolean
		isInTooltip?: boolean
	} = $props()


	// Functions
	import { variantToName } from '@/constants/variants'
	import { slugifyCamelCase } from '@/types/utils/text'


	// Components
	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import Typography from '../components/Typography.svelte'
</script>


<div
	class="attribute-summary"
	data-card={isInTooltip ? 'radius p-sm border-accent' : undefined}
	data-column
	style:--accent={ratingToColor(attribute.evaluation.value.rating)}
>
	<header data-row="center gap-3 wrap">
		<h4 data-row="gap-2">
			<span>{attribute.evaluation.value.icon ?? attribute.attribute.icon}</span>
			{attribute.attribute.displayName}
		</h4>

		{#if showRating}
			<data
				data-badge="small"
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
			href="/{wallet.metadata.id}/{variant ? `?variant=${variant}` : ''}#{slugifyCamelCase(attribute.attribute.id)}"
		>
			<span>{@html InfoIcon}</span>
			Learn more
		</a>
	</div>
</div>


<style>
	.attribute-summary {
		font-size: smaller;
		line-height: 1.4;

		header {
			row-gap: 0.5em;

			h4 {
				font-weight: 600;
			}
		}

		p :global(.markdown) {
			display: inline;
		}
	}
</style>
