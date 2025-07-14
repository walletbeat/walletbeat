<script lang="ts">
	// Types/constants
	import type { AttributeGroup } from '@/schema/attributes'
	import type { RatedWallet } from '@/schema/wallet'


	// Props
	let {
		wallet,
		attributeGroup,
	}: {
		wallet: RatedWallet
		attributeGroup: AttributeGroup<any>
	} = $props()


	// Components
	import Typography from '../atoms/Typography.svelte'
</script>


<div>
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
</div>


<style>
	div {
		font-size: smaller;

		display: grid;
		gap: 1em;
		line-height: 1.4;
	}
</style>
