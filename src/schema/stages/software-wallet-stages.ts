import { sentence } from '@/types/content'
import { setContains } from '@/types/utils/non-empty'

import { privateTransfers } from '../attributes/privacy/private-transfers'
import { chainVerification } from '../attributes/security/chain-verification'
import { securityAudits } from '../attributes/security/security-audits'
import { accountPortability } from '../attributes/self-sovereignty/account-portability'
import { openSource } from '../attributes/transparency/open-source'
import { sourceVisibility } from '../attributes/transparency/source-visibility'
import { RpcEndpointConfiguration } from '../features/self-sovereignty/chain-configurability'
import { isSupported } from '../features/support'
import {
	type StageCriterionEvaluation,
	stageCriterionEvaluationPerVariant,
	StageCriterionRating,
	type StageEvaluatableWallet,
	variantsMustPassAttribute,
	type WalletLadder,
	type WalletStage,
} from '../stages'
import { WalletType, walletTypeToVariants } from '../wallet-types'

export const softwareWalletVariants = walletTypeToVariants(WalletType.SOFTWARE)

export const softwareWalletStageZero: WalletStage = {
	id: 'software_stage_0',
	description: sentence('The basic stage for Walletbeat to evaluate any software wallet.'),
	criteriaGroups: [
		{
			id: 'reviewability',
			description: sentence('Check that the wallet can be reviewed by Walletbeat.'),
			criteria: [
				{
					id: 'source_available',
					description: sentence("The wallet's source code is publicly available."),
					rationale: sentence(
						'The source code must be publicly available so that it can be reviewed by Walletbeat.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, sourceVisibility),
				},
			],
		},
	],
}

export const softwareWalletStageOne: WalletStage = {
	id: 'software_stage_1',
	description: sentence(
		'The wallet has made a minimal but significant commitment to Ethereum values.',
	),
	criteriaGroups: [
		{
			id: 'security',
			description: sentence('The wallet provides a basic level of security.'),
			criteria: [
				{
					id: 'security_audit_1y',
					description: sentence('The wallet has passed a security audit within the last year.'),
					rationale: sentence(
						'This provides a level of assurance about the software security practices of the wallet developer.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, securityAudits),
				},
				{
					id: 'hardware_wallet_subset',
					description: sentence(
						'The wallet supports hardware wallets from at least three manufacturers.',
					),
					rationale: sentence(`
            By letting you offload your private key to a separate hardware
            device, the wallet developer demonstrates that they are serious
            about ensuring the security of your private key.
          `),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(variantWallet): StageCriterionEvaluation => {
							if (variantWallet.features.security.hardwareWalletSupport === null) {
								return { rating: StageCriterionRating.UNRATED }
							}

							const numSupportedWallets = Object.values(
								variantWallet.features.security.hardwareWalletSupport.supportedWallets,
							).filter(isSupported).length

							if (numSupportedWallets < 3) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence(
										'{{WALLET_NAME}} supports fewer than three hardware wallet manufacturers.',
									),
								}
							}

							return {
								rating: StageCriterionRating.PASS,
								explanation: sentence(
									'{{WALLET_NAME}} supports three or more hardware wallet manufacturers.',
								),
							}
						},
					),
				},
				{
					id: 'chain_verification',
					description: sentence('The wallet verifies the integrity of the L1 chain.'),
					rationale: sentence(`
            Much like browsers use HTTPS to provide integrity when doing online purchases,
            wallets should verify the integrity of the L1 chain when performing transactions.
          `),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, chainVerification),
				},
				// TODO: Add "Private key access security" to this list.
				// See https://github.com/walletbeat/walletbeat/issues/218
			],
		},
		{
			id: 'privacy',
			description: sentence('The wallet offers a minimal level of privacy to its users.'),
			criteria: [
				{
					id: 'private_transfers',
					description: sentence('Token transfers and balances are private by default.'),
					rationale: sentence(`
            Without private token transfers, the user's Ethereum activity will be
            publicly and forever stored for the world to see.
            This would be the equivalent of a financial panopticon.
          `),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, privateTransfers),
				},
			],
		},
		{
			id: 'self_sovereignty',
			description: sentence(
				'The wallet does not lock the user in and lets the user remain in full control of their account.',
			),
			criteria: [
				{
					id: 'account_portability',
					description: sentence('The user can freely export their account to another wallet.'),
					rationale: sentence(`
            To avoid wallet lock-in, users must be able to export their
            account information and import it in another wallet.
          `),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, accountPortability),
				},
				{
					id: 'support_own_node',
					description: sentence(
						'The wallet allows the user to use their own node when interacting with a chain.',
					),
					rationale: sentence(`
            Blockchains' censorship resistance properties relies on
            disintermediation.
            Without the ability to use their own Ethereum nodes, users are
            forced to rely on intermediaries for interacting with the chain.
          `),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(variantWallet): StageCriterionEvaluation => {
							if (variantWallet.features.chainConfigurability === null) {
								return { rating: StageCriterionRating.UNRATED }
							}

							switch (variantWallet.features.chainConfigurability.l1RpcEndpoint) {
								case RpcEndpointConfiguration.NO:
									return {
										rating: StageCriterionRating.FAIL,
										explanation: sentence(
											'{{WALLET_NAME}} does not allow users to use their own Ethereum node.',
										),
									}
								case RpcEndpointConfiguration.NEVER_USED:
									return {
										rating: StageCriterionRating.PASS,
										explanation: sentence(
											'{{WALLET_NAME}} does not interact with Ethereum L1, so it does not rely on an Ethereum node.',
										),
									}
								case RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS:
								// Fallthrough.
								case RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST:
									return {
										rating: StageCriterionRating.PASS,
										explanation: sentence(
											'{{WALLET_NAME}} allows users to use their own Ethereum node.',
										),
									}
							}
						},
					),
				},
			],
		},
		{
			id: 'transparency',
			description: sentence(
				"The wallet's development process and internal workings are transparent to the user.",
			),
			criteria: [
				{
					id: 'foss',
					description: sentence(
						'The wallet is licensed under a Free and Open Source Software (FOSS) license.',
					),
					rationale: sentence(
						'Free and Open Source Software (FOSS) licensing allows better collaboration, more transparency into the software development practices that go into the project, and allows security researchers to more easily identify and report security vulnerabilities.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, openSource),
				},
			],
		},
		{
			id: 'ecosystem',
			description: sentence('Ethereum ecosystem alignment'),
			criteria: [
				{
					id: 'foss',
					description: sentence(
						'The wallet is licensed under a Free and Open Source Software (FOSS) license.',
					),
					rationale: sentence(
						'Free and Open Source Software (FOSS) licensing allows better collaboration, more transparency into the software development practices that go into the project, and allows security researchers to more easily identify and report security vulnerabilities.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, openSource),
				},
			],
		},
	],
}

/**
 * Ladder for software wallets.
 */
export const softwareWalletLadder: WalletLadder = {
	stages: [softwareWalletStageZero, softwareWalletStageOne],
	applicableTo: (wallet: StageEvaluatableWallet): boolean => {
		return setContains<WalletType>(wallet.types, WalletType.SOFTWARE)
	},
}
