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
import { duressResistance } from '../attributes/security/duress-resistance'
import { scamPrevention } from '../attributes/security/scam-prevention'
import { securityAudits } from '../attributes/security/security-audits'
import { securityBestPractices } from '../attributes/security/security-best-practices'
import { transactionLegibility } from '../attributes/security/transaction-legibility'
import { accountPortability } from '../attributes/self-sovereignty/account-portability'
import { accountUnruggability } from '../attributes/self-sovereignty/account-unruggability'
import { permissionsManagement } from '../attributes/self-sovereignty/permissions-management'
import { transactionInclusion } from '../attributes/self-sovereignty/transaction-inclusion'
import { feeTransparency } from '../attributes/transparency/fee-transparency'
import { funding } from '../attributes/transparency/funding'
import { openSource } from '../attributes/transparency/open-source'
import { releaseProcess } from '../attributes/transparency/release-process'
import { sourceVisibility } from '../attributes/transparency/source-visibility'
import { hardwareWalletType } from '../features/security/hardware-wallet-support'
import { RpcEndpointConfiguration } from '../features/self-sovereignty/chain-configurability'
import { SpendingApprovalsControl } from '../features/self-sovereignty/permissions-management'
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
import { privacyHygiene } from '../attributes/privacy/privacy-hygiene'
import { bugBountyProgram } from '../attributes/security/bug-bounty-program'

export const softwareWalletVariants = walletTypeToVariants(WalletType.SOFTWARE)

export const softwareWalletStageZero: WalletStage = {
	id: 'stage:software-0',
	label: 'Stage 0',
	name: 'Verifiable',
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
						'The source code must be publicly available so that it can be reviewed by the public.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, sourceVisibility),
					displayName: 'Source Availability',
				},
			],
		},
	],
}

export const softwareWalletStageZeroFive: WalletStage = {
	id: 'stage:software-0-5',
	label: 'Stage 0.5',
	name: 'Foundational Wallet',
	description: sentence(
		'The wallet meets the basic requirements to be considered a usable Ethereum wallet.',
	),
	criteriaGroups: [
		{
			id: 'security',
			description: sentence('The wallet provides basic security protections for its users.'),
			criteria: [
				{
					id: 'hardware_wallet_any',
					description: sentence('The wallet supports at least one hardware wallet manufacturer.'),
					rationale: sentence(
						'Supporting hardware wallets lets users keep their private keys offline, adding a critical layer of security.',
					),
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

							if (numSupportedWallets < 1) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence('{{WALLET_NAME}} does not support any hardware wallets.'),
								}
							}

							return {
								rating: StageCriterionRating.PASS,
								explanation: sentence(
									'{{WALLET_NAME}} supports at least one hardware wallet manufacturer.',
								),
							}
						},
					),
					displayName: 'Hardware Wallet Support',
				},
				{
					id: 'transaction_legibility_basic',
					description: sentence(
						'The wallet displays basic transaction details before the user signs.',
					),
					rationale: sentence(
						'Users must be able to see key transaction details (amount, recipient, chain, fees) before signing to avoid being deceived.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, transactionLegibility, {
						allowPartial: false,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Transaction Legibility',
				},
				{
					id: 'basic_authentication',
					description: sentence('The wallet requires a PIN, password, or biometric to unlock.'),
					rationale: sentence(
						'Without a lock screen, anyone who picks up a device can immediately access and transfer funds. Basic authentication is the minimum bar for protecting users against physical theft or unauthorized access.',
					),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(variantWallet): StageCriterionEvaluation => {
							if (variantWallet.features.security.duressResistance === null) {
								return { rating: StageCriterionRating.UNRATED }
							}

							if (
								variantWallet.features.security.duressResistance.basicUnlock === 'NO_LOCK_MECHANISM'
							) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence('{{WALLET_NAME}} has no PIN, password, or biometric lock.'),
								}
							}

							return {
								rating: StageCriterionRating.PASS,
								explanation: sentence('{{WALLET_NAME}} requires authentication to unlock.'),
							}
						},
					),
					displayName: 'Basic Authentication',
				},
			],
		},
	],
}

export const softwareWalletStageOne: WalletStage = {
	id: 'stage:software-1',
	name: 'Ethereum Standard wallet',
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
					evaluate: variantsMustPassAttribute(softwareWalletVariants, securityAudits, {
						allowPartial: false,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Security Audits',
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
					displayName: 'Hardware Wallet Support',
				},
				{
					id: 'scam_alerting',
					description: sentence('The wallet warns users about potential scams.'),
					rationale: sentence(
						'Wallets should alert users about known scams before transactions are made, helping prevent irreversible losses. Transaction legibility (Stage 0.5) is a prerequisite for meaningful scam alerting.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, scamPrevention, {
						allowPartial: true,
						ifUnverifiable: sentence(
							"{{WALLET_NAME}}'s scam prevention cannot be publicly verified.",
						),
						ifNoVariantInScope: null,
					}),
					displayName: 'Scam Alerting',
				},
				{
					id: 'security_best_practices',
					description: sentence(
						'The wallet follows standard security practices for key storage and platform hardening.',
					),
					rationale: sentence(
						'Standard security practices, such as storing keys in a secure enclave and requesting minimal permissions, protect users from key extraction attacks and malicious apps. These are baseline implementation requirements for a wallet that takes security seriously.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, securityBestPractices, {
						allowPartial: true,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Standard Security Practices',
				},
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
					displayName: 'Private Transfers',
				},
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
					evaluate: variantsMustPassAttribute(softwareWalletVariants, addressCorrelation,
						{
						allowPartial: false,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}
					),
					displayName: 'Wallet Address Privacy',
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
					displayName: 'Multi-Address Privacy',
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
					id: 'account_unruggability',
					description: sentence(
						"No external party can take over the account without the user's consent.",
					),
					rationale: sentence(
						"True self-sovereignty requires that neither the wallet developer nor any external service can unilaterally take over the user's account.",
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, accountUnruggability, {
						allowPartial: false,
						ifUnverifiable: sentence(
							"{{WALLET_NAME}}'s account unruggability cannot be publicly verified.",
						),
						ifNoVariantInScope: null,
					}),
					displayName: 'Account Unruggability',
				},
				{
					id: 'account_portability',
					description: sentence('The user can freely export their account to another wallet.'),
					rationale: sentence(`
            To avoid wallet lock-in, users must be able to export their
            account information and import it in another wallet.
          `),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, accountPortability),
					displayName: 'Account Portability',
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
					displayName: 'Support Own Node',
				},
				{
					id: 'outstanding_approvals_erc20',
					description: sentence(
						'The wallet lets users inspect their outstanding ERC-20 token approvals.',
					),
					rationale: sentence(
						'Outstanding token approvals are a major risk vector, they allow contracts to drain user funds even long after initial interaction. Being able to inspect (and ideally revoke) ERC-20 approvals is the baseline for protecting users from this risk.',
					),
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(variantWallet): StageCriterionEvaluation => {
							const feature = variantWallet.features.selfSovereignty.permissionsManagement

							if (feature === null) {
								return { rating: StageCriterionRating.UNRATED }
							}

							if (!isSupported(feature)) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence(
										'{{WALLET_NAME}} does not support token approval management.',
									),
								}
							}

							if (feature.erc20Approvals === SpendingApprovalsControl.CANNOT_INSPECT) {
								return {
									rating: StageCriterionRating.FAIL,
									explanation: sentence(
										'{{WALLET_NAME}} does not let users inspect their ERC-20 approvals.',
									),
								}
							}

							return {
								rating: StageCriterionRating.PASS,
								explanation: sentence(
									'{{WALLET_NAME}} lets users inspect their ERC-20 token approvals.',
								),
							}
						},
					),
					displayName: 'Outstanding Approvals (ERC-20)',
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
					displayName: 'Free and Open Source Licensing',
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
					description: sentence(
						'The wallet can send funds to human-readable Ethereum addresses (e.g. ENS).',
					),
					rationale: sentence(`
						This improves the user experience of Ethereum and its layer 2 ecosystem
						while reducing the potential for mistakes when sending funds.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, addressResolution, {
						allowPartial: true,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Address Resolution',
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
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: {
							rating: StageCriterionRating.EXEMPT,
							explanation: sentence('{{WALLET_NAME}} is exempt as it has no browser version.'),
						},
					}),
					displayName: 'Browser Integration',
				},
			],
		},
	],
}

const softwareWalletStageTwo: WalletStage = {
	id: 'stage:software-2',
	name: 'Trust-minimized wallet',
	label: 'Stage 2',
	description: sentence('The wallet has made a significant commitment to Ethereum values.'),
	criteriaGroups: [
		{
			id: 'security',
			description: sentence('The wallet provides a strong level of security.'),
			criteria: [
				{
					id: 'chain_verification',
					description: sentence('The wallet verifies the integrity of the Ethereum chain.'),
					rationale: sentence(`
            Much like browsers use HTTPS to provide integrity when doing online purchases,
            wallets should verify the integrity of the chain when performing transactions.
            This requires a light client and is a high bar, appropriate for Stage 2.
          `),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, chainVerification),
					displayName: 'Chain Verification',
				},
				{
					id: 'bug_bounty_program',
					description: sentence('The wallet is part of a funded Bug Bounty program.'),
					rationale: sentence(
						'This aligns incentives for security exploits to be reported to the wallet developer, rather than exploited.',
					),
					evaluate: variantsMustPassAttribute(
						softwareWalletVariants,
						bugBountyProgram,
					),
					displayName: 'Bug Bounty Program',
				},
				{
					id: 'duress_resistance',
					description: sentence(
						'The wallet protects users against physical coercion and unauthorized access.',
					),
					rationale: sentence(
						'A wallet should provide mechanisms such as a duress PIN or decoy wallet to protect users under coercion, limiting the effectiveness of physical theft or forced access.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, duressResistance, {
						allowPartial: true,
						ifUnverifiable: sentence(
							"{{WALLET_NAME}}'s duress resistance cannot be publicly verified.",
						),
						ifNoVariantInScope: null,
					}),
					displayName: 'Duress Resistance',
				},
				{
					id: 'impact_mitigation',
					description: sentence(
						'The wallet lets users set self-imposed limits to mitigate damage from unauthorized access.',
					),
					rationale: sentence(
						'Spending rate-limits, high-value spend timelocks, or multiparty authorization for large transactions limit the blast radius of a compromised wallet.',
					),
					// TODO: Replace with a proper impact_mitigation attribute evaluation once the attribute exists.
					evaluate: stageCriterionEvaluationPerVariant(
						softwareWalletVariants,
						(_): StageCriterionEvaluation => ({
							rating: StageCriterionRating.UNRATED,
						}),
					),
					displayName: 'Impact Mitigation',
				},
			],
		},
		{
			id: 'privacy',
			description: sentence(
				'The wallet collects no more information about its users by default than a web browser does.',
			),
			criteria: [
				{
					id: 'data_collection',
					description: sentence(
						'The wallet collects no more user data than a web browser does by default.',
					),
					rationale: sentence(
						'Wallets handle sensitive financial data. Collecting excessive user data creates unnecessary privacy risks and undermines user trust.',
					),
					evaluate: variantsMustPassAttribute(
						softwareWalletVariants,
						privacyHygiene
					),
					displayName: 'Minimal Data Collection',
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
					displayName: 'Transaction Inclusion',
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
					displayName: 'Chain Configurability',
				},
				{
					id: 'outstanding_approvals_full',
					description: sentence(
						'The wallet lets users inspect and revoke ERC-20, ERC-721, and ERC-1155 token approvals.',
					),
					rationale: sentence(
						'Full approval management across all token standards, ERC-20, ERC-721, and ERC-1155, is required at Stage 2. Being able to revoke approvals (not just inspect them) is critical for recovering from compromised contracts.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, permissionsManagement),
					displayName: 'Outstanding Approvals (Full)',
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
					displayName: 'Funding Transparency',
				},
				{
					id: 'release_process_safety',
					description: sentence('The wallet release process follows safety best practices.'),
					rationale: sentence(
						'A well-defined release process with artifact signing, reproducible builds, and dependency locking reduces supply chain attack risk.',
					),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, releaseProcess, {
						allowPartial: true,
						ifUnverifiable: sentence(
							"{{WALLET_NAME}}'s release process safety cannot be publicly verified.",
						),
						ifNoVariantInScope: null,
					}),
					displayName: 'Release Process Safety',
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
					evaluate: variantsMustPassAttribute(softwareWalletVariants, feeTransparency, {
						allowPartial: false,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Fee Transparency',
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
					id: 'chain_specific_address_resolution',
					description: sentence(
						'The wallet supports chain-specific human-readable addresses (e.g. ERC-7828, ERC-7831).',
					),
					rationale: sentence(`
						Including the destination chain in the address reduces wrong-chain sends
						and improves the user experience of Ethereum's layer 2 ecosystem.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, addressResolution, {
						allowPartial: false,
						ifUnverifiable: 'THROW',
						ifNoVariantInScope: null,
					}),
					displayName: 'Chain-Specific Address Resolution',
				},
				{
					id: 'account_abstraction',
					description: sentence('The wallet is Account Abstraction ready.'),
					rationale: sentence(`
						Account Abstraction is a massive UX upgrade and security for
						Ethereum users. Wallets must support it through open standards
						to preserve account portability and interoperability.
					`),
					evaluate: variantsMustPassAttribute(softwareWalletVariants, accountAbstraction),
					displayName: 'Account Abstraction',
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
					displayName: 'Transaction Batching',
				},
			],
		},
	],
}

/**
 * Ladder for software wallets.
 */
export const softwareWalletLadder: WalletLadder = {
	stages: [
		softwareWalletStageZero,
		softwareWalletStageZeroFive,
		softwareWalletStageOne,
		softwareWalletStageTwo,
	],
	applicableTo: (wallet: StageEvaluatableWallet): boolean => {
		return setContains<WalletType>(wallet.types, WalletType.SOFTWARE)
	},
}
