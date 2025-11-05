<script lang="ts">
	// Types/constants
	import type { L1BroadcastSupport, TransactionInclusionValue } from '@/schema/attributes/self-sovereignty/transaction-inclusion'
	import type { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	// eslint-disable-next-line svelte/no-unused-props -- Consistent prop types for all content components.
	const {
		wallet,
		supportsL1Broadcast,
		supportAnyL2Transactions = [],
		supportForceWithdrawal = [],
		unsupportedL2s = [],
	}: {
		wallet: RatedWallet
		value: TransactionInclusionValue
		supportsL1Broadcast?: L1BroadcastSupport
		supportAnyL2Transactions?: TransactionSubmissionL2Type[]
		supportForceWithdrawal?: TransactionSubmissionL2Type[]
		unsupportedL2s?: TransactionSubmissionL2Type[]
	} = $props()


	// Functions
	import { transactionSubmissionL2TypeName } from '@/schema/features/self-sovereignty/transaction-submission'


	// Components
	import Typography from '@/components/Typography.svelte'
</script>


{#if supportAnyL2Transactions.length || supportForceWithdrawal.length || unsupportedL2s.length}
	{@const allSupportedForceWithdrawals = [
			...supportAnyL2Transactions,
			...supportForceWithdrawal,
		].toSorted()}

	{#if allSupportedForceWithdrawals.length}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: `**{{WALLET_NAME}}** supports L2 force-inclusion withdrawal transactions on **${allSupportedForceWithdrawals.map(l2Type => transactionSubmissionL2TypeName(l2Type)).join(', ')}** L2s.\n\nThis means users may withdraw funds from these L2s without relying on intermediaries.`,
			}}
			strings={{ WALLET_NAME: wallet.metadata.displayName }}
		/>
	{/if}

	{#if unsupportedL2s.length}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: `${allSupportedForceWithdrawals.length ? 'However, it' : '**{{WALLET_NAME}}**'} does not support L2 force-inclusion withdrawal transactions on **${unsupportedL2s.map(transactionSubmissionL2TypeName).join(' or ')}** L2s.\n\nThis means users rely on intermediaries in order to withdraw their funds from these L2s.`,
			}}
			strings={{ WALLET_NAME: wallet.metadata.displayName }}
		/>
	{/if}
{/if}
<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: (
			supportsL1Broadcast === 'NO' ?
				'**{{WALLET_NAME}}** does not support Ethereum peer-to-peer gossiping nor connecting to a user\'s self-hosted Ethereum node.\n\nTherefore, L1 transactions are subject to censorship by intermediaries.'
			: supportsL1Broadcast === 'OWN_NODE' ?
				'**{{WALLET_NAME}}** supports connecting to a user\'s self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries.'
			: supportsL1Broadcast === 'SELF_GOSSIP' ?
				'**{{WALLET_NAME}}** supports directly gossipping over Ethereum\'s peer-to-peer network, allowing L1 transactions to be reliably included without trusting intermediaries.'
			:
				''
		),
	}}
	strings={{ WALLET_NAME: wallet.metadata.displayName }}
/>
