<script lang="ts">
	// Types/constants
	import type { ChainVerificationValue } from '@/schema/attributes/security/chain-verification'
	import type { EthereumL1LightClient } from '@/schema/features/security/light-client'
	import { ethereumL1LightClientUrl } from '@/schema/features/security/light-client'
	import type { FullyQualifiedReference } from '@/schema/reference'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import type { NonEmptyArray } from '@/types/utils/non-empty'
	import { commaListPrefix } from '@/types/utils/text'


	// Props
	// eslint-disable-next-line svelte/no-unused-props -- Consistent prop types for all content components.
		const {
		wallet,
		lightClients,
		refs,
	}: {
		wallet: RatedWallet
		value: ChainVerificationValue
		lightClients?: NonEmptyArray<EthereumL1LightClient>
		refs?: FullyQualifiedReference[]
	} = $props()


	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: (
			!lightClients || lightClients.length === 0 ?
				'**{{WALLET_NAME}}** does not perform L1 chain state verification.'
			:
				`**{{WALLET_NAME}}** performs L1 chain state verification using ${lightClients.map((client: EthereumL1LightClient, i: number) => {
					const clientUrl = ethereumL1LightClientUrl(client)

					return `${commaListPrefix(i, lightClients.length)}[${client}](${typeof clientUrl === 'string' ? clientUrl : clientUrl.url})`
				}).join('')}${lightClients.length === 1 ? ' light client.' : ' light clients.'}`
		)
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

{#if refs && refs.length > 0}
	<hr>

	<ReferenceLinks references={refs} />
{/if}
