<script lang="ts">
	// Types/constants
	import type { EthereumL1LightClient, EthereumL1LightClientVerifiedData } from '@/schema/features/security/light-client'
	import { ethereumL1LightClientName, ethereumL1LightClientUrl, ethereumL1LightClientVerifiedDataName, unverifiedEthereumL1Data } from '@/schema/features/security/light-client'
	import type { FullyQualifiedReference } from '@/schema/reference'
	import type { WalletMetadata } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import type { NonEmptyArray } from '@/types/utils/non-empty'
	import { commaListFormat, commaListPrefix } from '@/types/utils/text'


	// Props
	const {
		wallet,
		lightClients,
		enabledByDefault,
		verifiedData,
		refs,
	}: {
		wallet: { metadata: WalletMetadata }
		lightClients?: NonEmptyArray<EthereumL1LightClient>
		enabledByDefault?: boolean
		verifiedData?: EthereumL1LightClientVerifiedData
		refs?: FullyQualifiedReference[]
	} = $props()

	const unverifiedDataNames = $derived(
		verifiedData ? unverifiedEthereumL1Data(verifiedData).map(dataKind => ethereumL1LightClientVerifiedDataName[dataKind]) : []
	)

	const coverageLimitations = $derived([
		...(enabledByDefault === false ? ['Verification is opt-in: users must enable it in the settings.'] : []),
		...(unverifiedDataNames.length > 0 ? [`The light client does not verify ${commaListFormat(unverifiedDataNames)}, so this data still relies on the RPC provider.`] : []),
	])


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

					return `${commaListPrefix(i, lightClients.length)}[${ethereumL1LightClientName(client)}](${typeof clientUrl === 'string' ? clientUrl : clientUrl.url})`
				}).join('')}${lightClients.length === 1 ? ' light client.' : ' light clients.'}${coverageLimitations.map(limitation => `\n\n${limitation}`).join('')}`
		)
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>

{#if refs && refs.length > 0}
	<ReferenceLinks references={refs} />
{/if}
