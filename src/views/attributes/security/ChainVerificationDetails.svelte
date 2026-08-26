<script lang="ts">
	// Types/constants
	import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client'
	import { ContentType } from '@/types/content'
	import type { ChainVerificationDetails } from '@/types/content/details/chain-verification'
	import { commaListPrefix } from '@/types/utils/text'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<ChainVerificationDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'

	const { lightClients } = $derived(details)

	const clientList = $derived(
		lightClients
			.map((client, index) => {
				const { url, label } = ethereumL1LightClientUrl(client)

				return `${commaListPrefix(index, lightClients.length)}[${label}](${url})`
			})
			.join(''),
	)
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: `**{{WALLET_NAME}}** performs L1 chain state verification using ${clientList} light client${lightClients.length === 1 ? '' : 's'}.`
	}}
	strings={context.strings}
/>
