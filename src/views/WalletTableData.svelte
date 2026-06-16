<script lang="ts">
	import type { Snippet } from 'svelte'
	import { onMount } from 'svelte'

	import WalletTable, { SummaryVisualization } from '@/views/WalletTable.svelte'
	import type { WalletTablePayload } from '@/utils/wallet-table-data'

	let {
		children,
		tableDataId,
		tableId,
		title,
		summaryVisualization,
	}: {
		children?: Snippet
		tableDataId: string
		tableId?: string
		title?: string
		summaryVisualization?: SummaryVisualization
	} = $props()

	let payload = $state<WalletTablePayload | null>(null)
	let error = $state<string | null>(null)

	onMount(() => {
		const abortController = new AbortController()

		void (async () => {
			try {
				const response = await fetch(`/table-data/${tableDataId}.json`, {
					signal: abortController.signal,
				})

				if (!response.ok) {
					throw new Error(`Failed to load table data: ${response.status}`)
				}

				const data = await response.json() as WalletTablePayload
				const attributes = Object.fromEntries(
					Object.values(data.attributeTree)
						.flatMap(group => group.attributes)
						.map(({ attribute }) => [attribute.id, attribute]),
				)

				payload = {
					...data,
					wallets: data.wallets.map(wallet => ({
						...wallet,
						metadata: {
							...wallet.metadata,
							tableName: wallet.metadata.displayName,
						},
						overrides: { attributes: {} },
						overall: Object.fromEntries(
							Object.entries(wallet.overall).map(([groupId, group]) => [
								groupId,
								Object.fromEntries(
									Object.entries(group).map(([attributeId, evaluated]) => [
										attributeId,
										{
											...evaluated,
											attribute: attributes[attributeId],
										},
									]),
								),
							]),
						),
						variantSpecificity: Object.fromEntries(
							Object.entries(wallet.variantSpecificity).map(([variant, specificity]) => [
								variant,
								new Map(Object.entries(specificity)),
							]),
						),
					})),
				}
			} catch (caught) {
				if (abortController.signal.aborted) {
					return
				}

				error = caught instanceof Error ? caught.message : 'Failed to load table data'
			}
		})()

		return () => abortController.abort()
	})
</script>

{#if payload}
	<WalletTable
		{tableId}
		{title}
		wallets={payload.wallets}
		attributeTree={payload.attributeTree}
		{summaryVisualization}
	/>
{:else if error}
	<section data-card='padding-5 radius-4' data-column='gap-2' hidden={Boolean(children)}>
		<h2>{title}</h2>
		<p>{error}</p>
	</section>
{:else if children}
	{@render children()}
{:else}
	<section data-card='padding-5 radius-4' data-column='gap-2' aria-busy='true'>
		<h2>{title}</h2>
		<p>Loading...</p>
	</section>
{/if}
