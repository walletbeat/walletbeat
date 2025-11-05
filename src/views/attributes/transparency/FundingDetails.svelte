<script lang="ts">
	// Types/constants
	import type { FundingValue } from '@/schema/attributes/transparency/funding'
	import {
		type Monetization,
		monetizationStrategies,
		monetizationStrategyName
	} from '@/schema/features/transparency/monetization'
	import { refs } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	// eslint-disable-next-line svelte/no-unused-props -- Consistent prop types for all content components.
	const {
		wallet,
		monetization,
	}: {
		wallet: RatedWallet
		value: FundingValue
		monetization: Monetization | undefined
	} = $props()


	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: (
			monetization ?
				(() => {
					const strategies = monetizationStrategies(monetization)
						.filter(({ value }) => value === true)
						.map(({ strategy }) => strategy)
					const strategiesText = strategies.length === 0 ? 'unknown sources' : strategies.map(strategy => monetizationStrategyName(strategy)).join(', ')

					return `**{{WALLET_NAME}}** is funded by **${strategiesText}**.`
				})()
			:
				'**{{WALLET_NAME}}** is funded by **unknown sources**.'
		)
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

{#if monetization}
	{@const references = refs(monetization)}
	{#if references.length > 0}
		<hr>

		<ReferenceLinks references={references} />
	{/if}
{/if}
