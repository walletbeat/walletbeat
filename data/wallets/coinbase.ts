import { paragraph } from '@/types/content'
import type { Wallet } from '@/schema/wallet'
import { WalletProfile } from '@/schema/features/profile'
import { polymutex } from '../contributors/polymutex'
import { nconsigny } from '../contributors/nconsigny'
import { ClearSigningLevel } from '@/schema/features/security/hardware-wallet-clear-signing'
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification'
import { HardwareWalletType } from '@/schema/features/security/hardware-wallet-support'
import { featureSupported } from '@/schema/features/support'
import { Variant } from '@/schema/variants'
import { cantina } from '../entities/cantina'
import { code4rena } from '../entities/code4rena'
import { certora } from '../entities/certora'
import { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import { License } from '@/schema/features/transparency/license'

export const coinbase: Wallet = {
	metadata: {
		id: 'coinbase',
		displayName: 'Coinbase Wallet',
		tableName: 'Coinbase',
		iconExtension: 'svg',
		blurb: paragraph(`
			Coinbase Wallet is a self-custodial wallet built by Coinbase. It
			integrates with Coinbase exchange accounts to bring them onchain.
		`),
		url: 'https://www.coinbase.com/wallet',
		repoUrl: 'https://github.com/coinbase/smart-wallet',
		contributors: [polymutex, nconsigny],
		lastUpdated: '2025-03-14',
	},
	features: {
		profile: WalletProfile.GENERIC,
		chainConfigurability: null,
		accountSupport: null,
		multiAddress: null,
		addressResolution: {
			nonChainSpecificEnsResolution: null,
			chainSpecificAddressing: {
				erc7828: null,
				erc7831: null,
			},
			ref: null,
		},
		integration: {
			browser: {
				'1193': null,
				'2700': null,
				'6963': null,
				ref: null,
			},
		},
		security: {
			scamAlerts: null,
			publicSecurityAudits: [
				{
					auditor: cantina,
					auditDate: '2024-04-01',
					variantsScope: 'ALL_VARIANTS',
					unpatchedFlaws: 'NONE_FOUND',
					ref: 'https://github.com/coinbase/smart-wallet/blob/main/audits/Cantina-April-2024.pdf',
				},
				{
					auditor: code4rena,
					auditDate: '2024-03-01',
					variantsScope: 'ALL_VARIANTS',
					unpatchedFlaws: 'NONE_FOUND',
					ref: 'https://github.com/coinbase/smart-wallet/blob/main/audits/Code4rena-March-2024.md',
				},
				{
					auditor: certora,
					auditDate: '2024-02-01',
					variantsScope: 'ALL_VARIANTS',
					unpatchedFlaws: 'NONE_FOUND',
					ref: 'https://github.com/coinbase/smart-wallet/blob/main/audits/Certora-February-2024.pdf',
				},
				{
					auditor: cantina,
					auditDate: '2023-12-01',
					variantsScope: 'ALL_VARIANTS',
					unpatchedFlaws: 'NONE_FOUND',
					ref: 'https://github.com/coinbase/smart-wallet/blob/main/audits/Cantina-December-2023.pdf',
				},
			],
			lightClient: {
				ethereumL1: null,
			},
			hardwareWalletSupport: {
				supportedWallets: {
					[HardwareWalletType.LEDGER]: featureSupported,
				},
				ref: null,
			},
			hardwareWalletClearSigning: {
				level: ClearSigningLevel.NONE,
				details: 'No hardware wallet clear signing information available.',
				ref: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.WEB_AUTHN_SOL,
				libraryUrl:
					'https://github.com/base/webauthn-sol/tree/619f20ab0f074fef41066ee4ab24849a913263b2',
				ref: {
					url: 'https://github.com/base/webauthn-sol/tree/619f20ab0f074fef41066ee4ab24849a913263b2',
					explanation: 'Coinbase uses the webauthn-sol library for passkey verification.',
				},
			},
		},
		privacy: {
			dataCollection: null,
			privacyPolicy: 'https://wallet.coinbase.com/privacy-policy',
		},
		selfSovereignty: {
			transactionSubmission: {
				l1: {
					selfBroadcastViaDirectGossip: null,
					selfBroadcastViaSelfHostedNode: null,
				},
				l2: {
					[TransactionSubmissionL2Type.arbitrum]: null,
					[TransactionSubmissionL2Type.opStack]: null,
				},
			},
		},
		transparency: {
			feeTransparency: null,
		},
		license: {
			license: License.BSD_3_CLAUSE,
			ref: {
				urls: [
					{
						url: 'https://github.com/coinbase/wallet-mobile/blob/master/LICENSE.md',
						label: 'Coinbase Wallet License File',
					},
				],
				explanation: 'Coinbase Wallet uses the BSD-3-Clause license for its source code',
			},
		},
		monetization: {
			revenueBreakdownIsPublic: false,
			strategies: {
				selfFunded: null,
				donations: null,
				ecosystemGrants: null,
				publicOffering: null,
				ventureCapital: null,
				transparentConvenienceFees: null,
				hiddenConvenienceFees: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
			},
			ref: null,
		},
	},
	variants: {
		[Variant.MOBILE]: true,
		[Variant.BROWSER]: true,
		[Variant.DESKTOP]: false,
		[Variant.EMBEDDED]: false,
		[Variant.HARDWARE]: false,
	},
}
