import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import {
	type AccountType,
	type AccountType7702,
	type AccountTypeEoa,
	type AccountTypeMpc,
	type AccountTypeMutableMultifactor,
	type AccountTypeSafe,
	isAccountTypeSupported,
} from '@/schema/features/account-support'
import { markdown, mdParagraph, mdSentence, sentence } from '@/types/content'

import { eipMarkdownLink, eipMarkdownLinkAndTitle } from '../../eips'
import { pickWorstRating, unrated } from '../common'

function supportsErc4337AndEip7702(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'erc4337_and_eip7702_ready',
			rating: Rating.PASS,
			displayName: 'Account Abstraction ready',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports Account Abstraction via ERC-4337 and EIP-7702.',
			),
		},
		details: markdown(
			`{{WALLET_NAME}} supports Account Abstraction via ${eipMarkdownLinkAndTitle(erc4337)} and ${eipMarkdownLinkAndTitle(eip7702)}.`,
		),
	})
}

function supportsErc4337(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'erc4337_ready',
			rating: Rating.PASS,
			displayName: 'Account Abstraction ready',
			shortExplanation: sentence('{{WALLET_NAME}} supports Account Abstraction via ERC-4337.'),
		},
		details: markdown(
			`{{WALLET_NAME}} supports Account Abstraction via ${eipMarkdownLinkAndTitle(erc4337)}.`,
		),
	})
}

function supportsEip7702(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'eip7702_ready',
			rating: Rating.PASS,
			displayName: 'Account Abstraction ready',
			shortExplanation: sentence('{{WALLET_NAME}} supports Account Abstraction via EIP-7702.'),
		},
		details: markdown(
			`{{WALLET_NAME}} supports Account Abstraction via ${eipMarkdownLinkAndTitle(eip7702)}.`,
		),
	})
}

function supportsEoaAndMpc(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'eoa_and_mpc_only',
			rating: Rating.FAIL,
			displayName: 'EOA & MPC only',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports EOA and MPC accounts only, with no Account Abstraction support.',
			),
		},
		details: markdown(
			'{{WALLET_NAME}} supports EOA and MPC accounts only, with no Account Abstraction support.',
		),
		impact: mdParagraph(
			`Users cannot use Account Abstraction features. However, EOA created in this wallet can be imported in other wallets that do support ${eipMarkdownLink(eip7702)}.`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement support for Account Abstraction features, such as ${eipMarkdownLinkAndTitle(eip7702)}.`,
		),
	})
}

function supportsMpcOnly(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'mpc_only',
			rating: Rating.FAIL,
			displayName: 'MPC only',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports MPC accounts only, with no Account Abstraction support.',
			),
		},
		details: markdown(
			'{{WALLET_NAME}} supports MPC accounts only, with no Account Abstraction support.',
		),
		impact: mdParagraph(
			`Users cannot use Account Abstraction features. However, accounts created in this wallet can be imported in other wallets that do support ${eipMarkdownLink(eip7702)}.`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement support for Account Abstraction features, such as ${eipMarkdownLinkAndTitle(eip7702)}.`,
		),
	})
}

function supportsRawEoaOnly(ctx: EvaluationContext): Evaluation {
	return ctx.build({
		value: {
			id: 'eoa_only',
			rating: Rating.FAIL,
			displayName: 'EOA only',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports EOAs only, with no Account Abstraction support.',
			),
		},
		details: markdown('{{WALLET_NAME}} supports EOAs only, with no Account Abstraction support.'),
		impact: mdParagraph(
			`Users cannot use Account Abstraction features. However, accounts created in this wallet can be imported in other wallets that do support ${eipMarkdownLink(eip7702)}.`,
		),
		howToImprove: markdown(
			`{{WALLET_NAME}} should implement support for Account Abstraction features, such as ${eipMarkdownLinkAndTitle(eip7702)}.`,
		),
	})
}

export const accountAbstraction: Attribute = {
	id: 'accountAbstraction',
	icon: '\u{1f4bc}', // Briefcase
	displayName: 'Account Abstraction',
	wording: {
		midSentenceName: 'account abstraction support',
	},
	question: sentence('Is the wallet Account Abstraction ready?'),
	why: markdown(`
		User experience on Ethereum has historically suffered from the limitations of Externally-Owned Accounts (EOAs), which is the type of account most Ethereum users use today. By contrast, smart wallet accounts offer many UX and security improvements, such as the ability to:

		* Batch multiple transactions, removing the need for separate "token approval" transactions before every other token operation.
		* Pay gas fees in other tokens than Ether, or support sponsored transaction fees (with ${eipMarkdownLink(erc4337)})
		* Delegate some operation to trusted provider, such as allowing onchain games to withdraw small amounts of tokens without signing pop-ups for each and every transaction.
		* Change transaction authorization logic, enabling the use of Passkeys (and cellphone authentication methods) for signing transactions.
		* Update the set of keys used to control the wallet, enabling the switch to quantum-resistant encryption algorithms in the future.
		* Define account recovery rules, reducing the risk of losing access to your account when losing a private key or a device.

		However, smart wallet accounts have historically been an all-or-nothing, wallet-specific proposition for users. There was no transition path to such wallets.

		As part of the [Pectra upgrade](https://eips.ethereum.org/EIPS/eip-7600),
		${eipMarkdownLink(eip7702)} fixes this problem. It create a clean path for
		existing EOAs to obtain all the UX benefits of smart wallet accounts
		and account abstraction, without the need for users to switch to a
		different account address.
		This represents a large User Experience upgrade for all Ethereum EOA users.
	`),
	methodology: markdown(`
		Wallets are rated based on whether they make use of
		${eipMarkdownLink(eip7702)} transactions (for EOA or MPC wallets),
		or if they support ${eipMarkdownLink(erc4337)} transactions
		(for smart contract wallets).

		The user experience benefits of these enhancements are still in-flight
		and are expected to develop as these standards mature and are built on
		top of. As such, Walletbeat does not currently consider *which*
		improvements wallets provide for their users as a result of these new
		capabilities. However, it is expected that a future version of this
		attribute would look at such improvements. For example: to verify
		that users are able to update the signing authority of their wallets
		to a quantum-safe signature scheme.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: false,
		pass: [
			exampleRating(
				mdSentence(
					`The wallet supports EOA accounts and can use Account Abstraction features via ${eipMarkdownLinkAndTitle(eip7702)}.`,
				),
				supportsEip7702(EvaluationContext.forTest(() => accountAbstraction)),
			),
			exampleRating(
				mdSentence(
					`The wallet supports smart wallet accounts using ${eipMarkdownLinkAndTitle(erc4337)}.`,
				),
				supportsErc4337(EvaluationContext.forTest(() => accountAbstraction)),
			),
		],
		partial: [],
		fail: [
			exampleRating(
				mdSentence('The wallet only supports plain EOAs without Account Abstraction features.'),
				supportsRawEoaOnly(EvaluationContext.forTest(() => accountAbstraction)),
			),
			exampleRating(
				mdSentence('The wallet only supports MPC wallets without Account Abstraction features.'),
				supportsMpcOnly(EvaluationContext.forTest(() => accountAbstraction)),
			),
		],
	},
	evaluate: (ctx: EvaluationContext): Evaluation => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Self-testable.

		if (ctx.features.accountSupport === null) {
			return unrated(ctx, null)
		}

		const supported: Record<AccountType, boolean> = {
			eoa: isAccountTypeSupported<AccountTypeEoa>(ctx.features.accountSupport.eoa),
			mpc: isAccountTypeSupported<AccountTypeMpc>(ctx.features.accountSupport.mpc),
			safe: isAccountTypeSupported<AccountTypeSafe>(ctx.features.accountSupport.safe),
			rawErc4337: isAccountTypeSupported<AccountTypeMutableMultifactor>(
				ctx.features.accountSupport.rawErc4337,
			),
			eip7702: isAccountTypeSupported<AccountType7702>(ctx.features.accountSupport.eip7702),
		}

		ctx.addRef(
			ctx.features.accountSupport.eoa,
			ctx.features.accountSupport.mpc,
			ctx.features.accountSupport.rawErc4337,
			ctx.features.accountSupport.eip7702,
		)

		if (supported.rawErc4337 && supported.eip7702) {
			return supportsErc4337AndEip7702(ctx)
		}

		if (supported.rawErc4337) {
			return supportsErc4337(ctx)
		}

		if (supported.eip7702) {
			return supportsEip7702(ctx)
		}

		if (supported.eoa && supported.mpc) {
			return supportsEoaAndMpc(ctx)
		}

		if (supported.mpc) {
			return supportsMpcOnly(ctx)
		}

		if (supported.eoa) {
			return supportsRawEoaOnly(ctx)
		}

		throw new Error('Wallet supports no account type')
	},
	aggregate: pickWorstRating,
}
