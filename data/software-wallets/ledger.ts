import { mattmatt } from '@/data/contributors/0xmattmatt'
import { nconsigny } from '@/data/contributors/nconsigny'
import { patrickalphac } from '@/data/contributors/patrickalphac'
import type { SoftwareWallet } from '@/data/software-wallets'
import { notApplicableWalletIntegration } from '@/schema/features/ecosystem/integration'
import { WalletProfile } from '@/schema/features/profile'
import { Variant } from '@/schema/variants'
import { paragraph } from '@/types/content'

export const ledgerLive: SoftwareWallet = {
	metadata: {
		id: 'ledger',
		displayName: 'Ledger Wallet',
		tableName: 'Ledger',
		blurb: paragraph(`
			Ledger Wallet is a self-custodial wallet built by Ledger. It
			integrates with Ledger hardware wallets to provide secure cryptocurrency management.
		`),
		contributors: [nconsigny, patrickalphac, mattmatt],
		iconExtension: 'svg',
		lastUpdated: '2025-03-12',
		urls: {
			docs: ['https://developers.ledger.com/'],
			repositories: ['https://github.com/LedgerHQ/'],
			socials: {
				facebook: 'https://web.facebook.com/Ledger/',
				instagram: 'https://www.instagram.com/ledger/',
				linkedin: 'https://www.linkedin.com/company/ledgerhq/',
				reddit: 'https://www.reddit.com/r/ledgerwallet/',
				tiktok: 'https://www.tiktok.com/@ledger',
				x: 'https://x.com/Ledger',
			},
			websites: ['https://www.ledger.com/'],
		},
	},
	features: {
		accountSupport: null,
		addressResolution: null,
		chainAbstraction: null,
		chainConfigurability: null,
		ecosystem: {
			delegation: null,
		},
		integration: notApplicableWalletIntegration,
		licensing: null,
		monetization: null,
		multiAddress: null,
		privacy: {
			analytics: {
				crashReports: null,
				usage: null,
			},
			appIsolation: null,
			dataCollection: null,
			privacyPolicy: 'https://ledger.com/privacy-policy',
			transactionPrivacy: null,
		},
		profile: WalletProfile.GENERIC,
		security: {
			accountRecovery: null,
			bugBountyProgram: null,
			duressResistance: null,
			hardwareWalletSupport: null,
			keysHandling: null,
			lightClient: {
				ethereumL1: null,
			},
			passkeyVerification: null,
			publicSecurityAudits: null,
			scamAlerts: null,
			transactionLegibility: null,
		},
		selfSovereignty: {
			permissionsManagement: null,
			transactionSubmission: null,
		},
		transparency: {
			operationFees: null,
		},
	},
	variants: {
		[Variant.DESKTOP]: true,
	},
}
