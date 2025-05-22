import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile';
import { BugBountyProgramType } from '@/schema/features/security/bug-bounty-program';
import { DappSigningLevel } from '@/schema/features/security/hardware-wallet-dapp-signing';
import { PasskeyVerificationLibrary } from '@/schema/features/security/passkey-verification';
import { Variant } from '@/schema/variants';
import type { HardwareWallet } from '@/schema/wallet';
import { paragraph } from '@/types/content';

import { nconsigny } from '../contributors/nconsigny';

export const trezorWallet: HardwareWallet = {
	metadata: {
		id: 'trezor',
		displayName: 'Trezor Wallet',
		tableName: 'Trezor',
		blurb: paragraph(`
			Trezor Wallet is a self-custodial hardware wallet built by SatoshiLabs. It
			provides secure storage for cryptocurrencies with an easy-to-use interface.
		`),
		contributors: [nconsigny],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'trezor-safe-5',
				name: 'Trezor Safe 5',
				isFlagship: true,
				url: 'https://trezor.io/trezor-safe-5',
			},
			{
				id: 'trezor-safe-3',
				name: 'Trezor Safe 3',
				isFlagship: false,
				url: 'https://trezor.io/trezor-safe-3',
			},
			{
				id: 'trezor-model-one',
				name: 'Trezor Model One',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-one',
			},
			{
				id: 'trezor-model-t',
				name: 'Trezor Model T',
				isFlagship: false,
				url: 'https://trezor.io/trezor-model-t',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		repoUrl: 'https://github.com/trezor/trezor-suite',
		url: 'https://trezor.io/',
	},
	features: {
		accountSupport: null,
		license: null,
		monetization: {
			ref: null,
			revenueBreakdownIsPublic: false,
			strategies: {
				donations: null,
				ecosystemGrants: null,
				governanceTokenLowFloat: null,
				governanceTokenMostlyDistributed: null,
				hiddenConvenienceFees: null,
				publicOffering: null,
				selfFunded: null,
				transparentConvenienceFees: null,
				ventureCapital: null,
			},
		},
		multiAddress: null,
		privacy: {
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: 'https://trezor.io/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			bugBountyProgram: {
				type: BugBountyProgramType.COMPREHENSIVE,
				details:
					'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
				ref: [
					{
						explanation:
							'At SatoshiLabs and Trezor, the safety of our products and services is a top priority. If you have identified a security vulnerability, we would greatly appreciate your assistance in disclosing it to us in a responsible manner.',
						url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
					},
				],
				upgradePathAvailable: true,
				url: 'https://trezor.io/support/a/how-to-report-a-security-issue',
			},
			firmware: null,
			hardwareWalletDappSigning: {
				details:
					'Trezor provides basic transaction details when using hardware wallets, but some complex interactions may not display complete information on the hardware device.',
				level: DappSigningLevel.PARTIAL,
				ref: [
					{
						explanation:
							"Independent video demonstration of Trezor's clear signing implementation on Safe.",
						url: 'https://youtu.be/7lP_0h-PPvY?si=07dMNswh_9RsuWQ9&t=879',
					},
				],
			},
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: {
				library: PasskeyVerificationLibrary.NONE,
				ref: null,
			},
			publicSecurityAudits: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			feeTransparency: null,
			maintenance: null,
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
};

// Flagship : Trezor safe 5 : @https://trezor.io/trezor-safe-5
// Trezor safe 3 : @https://trezor.io/trezor-safe-3
// Trezor model one : @https://trezor.io/trezor-model-one
// Trezor model T / @https://trezor.io/trezor-model-t
