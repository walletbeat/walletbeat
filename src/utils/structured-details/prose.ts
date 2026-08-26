import { transactionSubmissionL2TypeName } from '@/schema/features/self-sovereignty/transaction-submission'
import { getUrl, isUrl } from '@/schema/url'
import {
	type AddressCorrelationDetails,
	type AddressCorrelationLeak,
	correlatedInfoNames,
} from '@/types/content/details/address-correlation'
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

/** Introduction shared by every address-correlation rendering. */
export const addressCorrelationIntro =
	'By default, **{{WALLET_NAME}}** allows your wallet address to be correlated with your personal information:'

/** Comma-separated list ending in "and", as used in correlation sentences. */
function joinedList(items: string[]): string {
	if (items.length <= 1) {
		return items.join('')
	}

	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The bullet describing what one source can correlate. */
export function addressCorrelationLeakSentence(leak: AddressCorrelationLeak): string {
	const info = `**${joinedList(correlatedInfoNames(leak))}**`

	if (leak.source.kind === 'onchain') {
		return `An onchain record permanently associates your ${info} with your wallet address.`
	}

	const { entity } = leak.source
	const privacyPolicy = isUrl(entity.privacyPolicy)
		? ` ([Privacy policy](${getUrl(entity.privacyPolicy)}))`
		: ''

	return `**${entity.name}**${privacyPolicy} may link your wallet address to your ${info}.`
}

/** Every address-correlation bullet, in canonical order. */
export function addressCorrelationSentences(details: AddressCorrelationDetails): string[] {
	return details.leaks.map(addressCorrelationLeakSentence)
}

/**
 * One rendered transaction-inclusion block, tagged with the claim it makes so
 * adapters can attach the right references to it.
 */
export interface TransactionInclusionBlock {
	claim: 'l1' | 'l2'
	text: string
}

/** Sentences describing transaction inclusion, one per rendered block. */
export function transactionInclusionProse(
	details: TransactionInclusionDetails,
): TransactionInclusionBlock[] {
	const capable = forceInclusionCapableL2s(details).toSorted()
	const incapable = forceInclusionIncapableL2s(details).toSorted()
	const blocks: TransactionInclusionBlock[] = []

	if (capable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `**{{WALLET_NAME}}** supports L2 force-inclusion withdrawal transactions on **${capable
				.map(transactionSubmissionL2TypeName)
				.join(
					', ',
				)}** L2s.\n\nThis means users may withdraw funds from these L2s without relying on intermediaries.`,
		})
	}

	if (incapable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `${capable.length > 0 ? 'However, it' : '**{{WALLET_NAME}}**'} does not support L2 force-inclusion withdrawal transactions on **${incapable
				.map(transactionSubmissionL2TypeName)
				.join(
					' or ',
				)}** L2s.\n\nThis means users rely on intermediaries in order to withdraw their funds from these L2s.`,
		})
	}

	switch (details.l1Broadcast) {
		case 'NO':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** does not support Ethereum peer-to-peer gossiping nor connecting to a user's self-hosted Ethereum node.\n\nTherefore, L1 transactions are subject to censorship by intermediaries.",
			})
			break
		case 'OWN_NODE':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports connecting to a user's self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries.",
			})
			break
		case 'SELF_GOSSIP':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports directly gossipping over Ethereum's peer-to-peer network, allowing L1 transactions to be reliably included without trusting intermediaries.",
			})
	}

	return blocks
}
