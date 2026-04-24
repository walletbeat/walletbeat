<script lang="ts">
	// Types/constants
	import type { WalletNameStrings } from '@/schema/attributes'
	import { PrivateTransferTechnology } from '@/schema/features/privacy/transaction-privacy'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType, type MarkdownParagraph } from '@/types/content'

	const technologyNames: Record<PrivateTransferTechnology, string> = {
		[PrivateTransferTechnology.STEALTH_ADDRESSES]: 'ERC-5564 Stealth Addresses',
		[PrivateTransferTechnology.TORNADO_CASH_NOVA]: 'Tornado Cash Nova',
		[PrivateTransferTechnology.PRIVACY_POOLS]: 'Privacy Pools',
		[PrivateTransferTechnology.RAILGUN]: 'Railgun',
	}


	// Props
	const {
		wallet,
		privateTransferDetails,
	}: {
		wallet: RatedWallet
		privateTransferDetails: Map<PrivateTransferTechnology, {
			sendingDetails: MarkdownParagraph<WalletNameStrings>
			receivingDetails: MarkdownParagraph<WalletNameStrings>
			spendingDetails: MarkdownParagraph<WalletNameStrings>
			extraNotes: MarkdownParagraph<WalletNameStrings>[]
		}>
	} = $props()


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


{#if privateTransferDetails.size === 0}
	<Typography
		content={{
			contentType: ContentType.TEXT,
			text: 'No private transfer technology details available.',
		}}
	/>
{:else}
	{@const technologies = Array.from(privateTransferDetails.entries())}

	{#each technologies as [technology, details] (technology)}
		<section data-column="gap-4">
			<h4>{technologyNames[technology]}</h4>

			<div data-column="gap-3">
				<div>
					<strong>Sending:</strong>
					<Typography
						content={details.sendingDetails}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>

				<div>
					<strong>Receiving:</strong>
					<Typography
						content={details.receivingDetails}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>

				<div>
					<strong>Spending:</strong>
					<Typography
						content={details.spendingDetails}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>

				{#if details.extraNotes.length > 0}
					<div data-column="gap-2">
						{#each details.extraNotes as note, index (index)}
							<Typography
								content={note}
								strings={{ WALLET_NAME: wallet.metadata.displayName }}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	{/each}
{/if}
