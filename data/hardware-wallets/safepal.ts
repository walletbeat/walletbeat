import { minimalsm } from '@/data/contributors/minimalsm'
import type { HardwareWallet } from '@/data/hardware-wallets'
import { HardwareWalletManufactureType, WalletProfile } from '@/schema/features/profile'
import { Variant } from '@/schema/variants'

export const safepalWallet: HardwareWallet = {
	metadata: {
		id: 'safepal',
		displayName: 'SafePal S1 Pro',
		tableName: 'SafePal S1 Pro',
		coinspectId: { type: 'NO_COINSPECT_ID' },
		contributors: [minimalsm],
		hardwareWalletManufactureType: HardwareWalletManufactureType.FACTORY_MADE,
		hardwareWalletModels: [
			{
				id: 'safepal-s1-pro',
				name: 'SafePal S1 Pro',
				isFlagship: true,
				url: 'https://www.safepal.com/en/store/s1pro',
			},
		],
		iconExtension: 'svg',
		lastUpdated: '2026-10-09',
		urls: {
			docs: ['https://safepalsupport.zendesk.com/hc/en-us'],
			repositories: ['https://github.com/SafePalWallet/safepal-s1'],
			socials: {
				discord: 'https://discord.com/invite/BuKynZqRNj',
				facebook: 'https://www.facebook.com/iSafePal',
				instagram: 'https://www.instagram.com/isafepal/',
				linkedin: 'https://www.linkedin.com/company/14504410',
				telegram: 'https://t.me/SafePalTG',
				x: 'https://x.com/SafePal',
				youtube: 'https://www.youtube.com/channel/UCfqztNiZWV62Eu9kiqKf6WQ',
			},
			websites: ['https://www.safepal.com/'],
		},
	},
	features: {
		accountSupport: null,
		appConnectionSupport: null,
		licensing: null,
		monetization: null,
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			dataCollection: null,
			hardwarePrivacy: null,
			privacyPolicy: null,
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			firmware: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			publicSecurityAudits: null,
			secureElement: null,
			securityBestPractices: null,
			supplyChainDIY: null,
			supplyChainFactory: null,
			transactionLegibility: null,
			userSafety: null,
		},
		selfSovereignty: {
			interoperability: null,
		},
		transparency: {
			maintenance: null,
			operationFees: null,
			releaseTransparency: {
				artifactSigning: null,
				dependencyLocking: null,
				dependencySandboxing: null,
				dependencyVulnerabilityScanning: null,
				hasPublicChangelog: null,
				hermeticBuilds: null,
				repositoryChangeControls: null,
				reproducibleBuilds: null,
			},
			reputation: null,
		},
	},
	variants: {
		[Variant.HARDWARE]: true,
	},
}
