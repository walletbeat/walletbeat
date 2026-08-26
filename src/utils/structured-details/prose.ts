import { transactionSubmissionL2TypeName } from '@/schema/features/self-sovereignty/transaction-submission'
import {
	forceInclusionCapableL2s,
	forceInclusionIncapableL2s,
	type TransactionInclusionDetails,
} from '@/types/content/details/transaction-inclusion'

/**
 * Shared prose derived from canonical detail models.
 *
 * Wording lives here once so the web view and the Markdown adapter cannot
 * drift. Sentences use `{{WALLET_NAME}}` placeholders and light Markdown
 * emphasis, which every visual adapter already renders; the canonical models
 * themselves stay free of any markup.
 */

/** Sentences describing transaction inclusion, one per rendered block. */
export function transactionInclusionProse(details: TransactionInclusionDetails): string[] {
	const capable = forceInclusionCapableL2s(details).toSorted()
	const incapable = forceInclusionIncapableL2s(details).toSorted()
	const blocks: string[] = []

	if (capable.length > 0) {
		blocks.push(
			`**{{WALLET_NAME}}** supports L2 force-inclusion withdrawal transactions on **${capable
				.map(transactionSubmissionL2TypeName)
				.join(', ')}** L2s.\n\nThis means users may withdraw funds from these L2s without relying on intermediaries.`,
		)
	}

	if (incapable.length > 0) {
		blocks.push(
			`${capable.length > 0 ? 'However, it' : '**{{WALLET_NAME}}**'} does not support L2 force-inclusion withdrawal transactions on **${incapable
				.map(transactionSubmissionL2TypeName)
				.join(' or ')}** L2s.\n\nThis means users rely on intermediaries in order to withdraw their funds from these L2s.`,
		)
	}

	switch (details.l1Broadcast) {
		case 'NO':
			blocks.push(
				"**{{WALLET_NAME}}** does not support Ethereum peer-to-peer gossiping nor connecting to a user's self-hosted Ethereum node.\n\nTherefore, L1 transactions are subject to censorship by intermediaries.",
			)
			break
		case 'OWN_NODE':
			blocks.push(
				"**{{WALLET_NAME}}** supports connecting to a user's self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries.",
			)
			break
		case 'SELF_GOSSIP':
			blocks.push(
				"**{{WALLET_NAME}}** supports directly gossipping over Ethereum's peer-to-peer network, allowing L1 transactions to be reliably included without trusting intermediaries.",
			)
	}

	return blocks
}
