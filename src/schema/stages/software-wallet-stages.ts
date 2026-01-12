import { sentence } from '@/types/content'
import { nonEmptySet, setContains } from '@/types/utils/non-empty'

import { accountAbstraction } from '../attributes/ecosystem/account-abstraction'
import { addressResolution } from '../attributes/ecosystem/address-resolution'
import { browserIntegration } from '../attributes/ecosystem/browser-integration'
import { transactionBatching } from '../attributes/ecosystem/transaction-batching'
import { addressCorrelation } from '../attributes/privacy/address-correlation'
import { multiAddressCorrelation } from '../attributes/privacy/multi-address-correlation'
import { privateTransfers } from '../attributes/privacy/private-transfers'
import { chainVerification } from '../attributes/security/chain-verification'
import { securityAudits } from '../attributes/security/security-audits'
import { accountPortability } from '../attributes/self-sovereignty/account-portability'
import { transactionInclusion } from '../attributes/self-sovereignty/transaction-inclusion'
import { feeTransparency } from '../attributes/transparency/fee-transparency'
import { funding } from '../attributes/transparency/funding'
import { openSource } from '../attributes/transparency/open-source'
import { sourceVisibility } from '../attributes/transparency/source-visibility'
import { hardwareWalletType } from '../features/security/hardware-wallet-support'
import { RpcEndpointConfiguration } from '../features/self-sovereignty/chain-configurability'
import { isSupported, notSupported } from '../features/support'
import {
	type StageCriterionEvaluation,
	stageCriterionEvaluationPerVariant,
	StageCriterionRating,
	type StageEvaluatableWallet,
	variantsMustPassAttribute,
	type WalletLadder,
	type WalletStage,
} from '../stages'
import { Variant } from '../variants'
import { WalletType, walletTypeToVariants } from '../wallet-types'

export const softwareWalletVariants = walletTypeToVariants(WalletType.SOFTWARE)

export const softwareWalletStageZero: WalletStage = {
	id: 'software_stage_0',
	label: 'Stage 0',
	description: sentence('The wallet meets the minimum criteria for evaluation.'),
	criteriaGroups: [
		{
			id: 'reviewability',
			description: sentence("The wallet's source code can be reviewed by the public."),
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
	label: 'Stage 1',
	description: sentence('The wallet has made a minimal commitment to Ethereum values.'),
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
								hardwareWalletType.fullRecord(
									variantWallet.features.security.hardwareWalletSupport.wallets,
									notSupported,
								),
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
						'The wallet allows the user to use their own node when interacting with the L1 chain.',
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

							if (!isSupported(variantWallet.features.chainConfigurability)) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence(
										'{{WALLET_NAME}} does not allow users to use their own Ethereum node.',
									),
								}
							}

							if (!isSupported(variantWallet.features.chainConfigurability.l1)) {
								return {
									rating: StageCriterionRating.PASS,
									explanation: sentence(
										'{{WALLET_NAME}} does not interact with Ethereum L1, so it does not rely on an Ethereum node.',
									),
								}
							}

							switch (variantWallet.features.chainConfigurability.l1.rpcEndpointConfiguration) {
								case RpcEndpointConfiguration.NO:
									return {
										rating: StageCriterionRating.FAIL,
										explanation: sentence(
											'{{WALLET_NAME}} does not allow users to use their own Ethereum node.',
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
			description: sentence(
				'The wallet is aligned with basic Ethereum ecosystem best practices for usability.',
			),
			criteria: [
				{
					id: 'address_resolution',
					description: sentence('The wallet can send funds to human-readable Ethereum addresses.'),
					rationale: sentence(`
						This improves the user experience of Ethereum and its layer 2 ecosystem
						while reducing the potential for mistakes when sending funds.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, addressResolution),
				},
				{
					id: 'browser_integration',
					description: sentence('The wallet complies with web browser integration standards.'),
					rationale: sentence(`
						This ensures compatibility across wallets, and ensures that the
						Ethereum wallet ecosystem remains competitive thanks to interoperability.
					`),
					evaluate: variantsMustPassAttribute(nonEmptySet(Variant.BROWSER), browserIntegration, {
						allowPartial: false,
						ifNoVariantInScope: {
							rating: StageCriterionRating.EXEMPT,
							explanation: sentence('{{WALLET_NAME}} is exempt as it has no browser version.'),
						},
					}),
				},
			],
		},
	],
}

const softwareWalletStageTwo: WalletStage = {
	id: 'software_stage_2',
	label: 'Stage 2',
	description: sentence('The wallet has made a significant commitment to Ethereum values.'),
	criteriaGroups: [
		{
			id: 'security',
			description: sentence('The wallet provides a strong level of security.'),
			criteria: [
				{
					id: 'bug_bounty_program',
					description: sentence('The wallet is part of a funded Bug Bounty program.'),
					rationale: sentence(
						'This aligns incentives for security exploits to be reported to the wallet developer, rather than exploited.',
					),
					// TODO: Replace with this once bug bounty program attribute applies to software wallets (#230):
					// evaluate: variantsMustPassAttribute(softwareWalletVariants, bugBountyProgram),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(_): StageCriterionEvaluation => ({
							rating: StageCriterionRating.UNRATED,
						}),
					),
				},
				// TODO: Add "key is stored in encrypted form"
				// TODO: Add calldata interpretation
			],
		},
		{
			id: 'privacy',
			description: sentence(
				'The wallet collects no more information about its users by default than a web browser does.',
			),
			criteria: [
				{
					id: 'address_privacy',
					description: sentence(
						'Wallet addresses are not correlatable with other user information.',
					),
					rationale: sentence(`
						Your wallet address is unique and permanent, which makes it easy to track your activity.
						In web-privacy terms, it is worse than cookies: wallet addresses are permanent,
						publicly visible, and can even be tracked across multiple devices and websites.
						Keeping it private is paramount for user privacy at least on par with web2.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, addressCorrelation),
				},
				{
					id: 'multi_address_correlation',
					description: sentence('Multiple wallet addresses are not correlatable with one another.'),
					rationale: sentence(`
						You probably have more than one wallet address configured in your wallet,
						which you use for different purposes and perhaps as different identities.
						These wallet addresses all belong to you, but you would rather keep that
						fact private. It is therefore important to use a wallet that does not reveal that fact.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, multiAddressCorrelation),
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
					id: 'transaction_inclusion',
					description: sentence(
						'The wallet can withdraw L2 funds to Ethereum L1 without relying on intermediaries.',
					),
					rationale: sentence(`
						Wallets must be able to submit permissionlessly submit transactions on L2s and L1
						in order to be self-sovereign. L2 force-withdrawal transactions posted on L1
						exercise this permissionlessness at both levels.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, transactionInclusion),
				},
				{
					id: 'support_own_chains',
					description: sentence(
						'The wallet allows the user to use their own node when interacting with any chain.',
					),
					rationale: sentence(`
            Blockchains' censorship resistance properties relies on
            disintermediation. Without the ability to use their own Ethereum
						nodes, users are forced to rely on intermediaries for interacting
						with the chain.
          `),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(variantWallet): StageCriterionEvaluation => {
							if (variantWallet.features.chainConfigurability === null) {
								return { rating: StageCriterionRating.UNRATED }
							}

							if (!isSupported(variantWallet.features.chainConfigurability)) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence(
										'{{WALLET_NAME}} does not allow users to use their own Ethereum node.',
									),
								}
							}

							if (!isSupported(variantWallet.features.chainConfigurability.nonL1)) {
								return {
									rating: StageCriterionRating.PASS,
									explanation: sentence(
										'{{WALLET_NAME}} does not interact with non-L1 chains, so no further chain customization option is warranted.',
									),
								}
							}

							switch (variantWallet.features.chainConfigurability.nonL1.rpcEndpointConfiguration) {
								case RpcEndpointConfiguration.NO:
									return {
										rating: StageCriterionRating.FAIL,
										explanation: sentence(
											'{{WALLET_NAME}} does not allow users to customize non-L1 chain endpoints.',
										),
									}
								case RpcEndpointConfiguration.YES_AFTER_OTHER_REQUESTS:
								// Fallthrough.
								case RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST:
									return {
										rating: StageCriterionRating.PASS,
										explanation: sentence(
											'{{WALLET_NAME}} allows users to customize non-L1 chain endpoints.',
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
					id: 'funding',
					description: sentence(
						"The wallet's funding sources and revenue model are public and transparent.",
					),
					rationale: sentence(`
						Wallets are complex, high-stakes pieces of software.
						They must be maintained, regularly audited, and follow the continuous
						improvements in the ecosystem.
						This requires a reliable and transparent source of funding.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, funding),
				},
				{
					id: 'fee_transparency',
					description: sentence(
						'The fees charged by the wallet are made transparent to the user at all times.',
					),
					rationale: sentence(`
						Wallets may charge fees to the user for convenience services,
						or simply to interact with the chain (gas fees). Whenever they do,
						the user deserves to know what they are paying for.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, feeTransparency),
				},
			],
		},
		{
			id: 'ecosystem',
			description: sentence(
				'The wallet is aligned with advanced Ethereum ecosystem best practices for usability.',
			),
			criteria: [
				{
					id: 'account_abstraction',
					description: sentence('The wallet is Account Abstraction ready.'),
					rationale: sentence(`
						Account Abstraction is a massive UX upgrade and security for
						Ethereum users. Wallets must support it through open standards
						to preserve account portability and interoperability.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, accountAbstraction),
				},
				{
					id: 'transaction_batching',
					description: sentence('The wallet supports atomic batched transactions.'),
					rationale: sentence(`
						Batched transactions through the WalletCall API enables better UX
						for common DeFi workflows, such as token approvals followed by a
						DeFi operation. Atomic batched transactions make such batched
						transactions safer and easier to understand for the user, as well
						as enabling advanced DeFi use-cases.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, transactionBatching),
				},
			],
		},
	],
}

/**
 * Ladder for software wallets.
 */
export const softwareWalletLadder: WalletLadder = {
	stages: [softwareWalletStageZero, softwareWalletStageOne, softwareWalletStageTwo],
	applicableTo: (wallet: StageEvaluatableWallet): boolean => {
		return setContains<WalletType>(wallet.types, WalletType.SOFTWARE)
	},
}
