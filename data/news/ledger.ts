import {
	IncidentStatus,
	ImpactCategory,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

import { ledgerWalletMetadata } from '../hardware-wallets/ledger'

export const globalEBreach: WalletSecurityNews = {
	name: 'global-e-breach',
	type: NewsType.DATA_BREACH,
	severity: Severity.MEDIUM,
	title: 'Global-e Third-Party Data Breach Affecting Ledger Customers',
	summary:
		'Global-e, a third-party e-commerce platform used by Ledger.com, experienced unauthorized access to their cloud systems. Personal data including names and contact information of Ledger customers who made purchases through Global-e were improperly accessed. No payment information, account credentials, or passwords were compromised.',
	wallet: ledgerWalletMetadata,
	impact: {
		fundsImpacted: false,
		category: ImpactCategory.PRIVACY_LEAK,
	},
	status: IncidentStatus.RESOLVED,
	publishedAt: '2026-01-06',
	updatedAt: '2026-01-06',
	ref: {
		url: 'https://x.com/zachxbt/status/2008139053544194545',
		label: 'ZachXBT community alert on Ledger data breach'
	}
}

export const ledgerNewsRegistry = {
	'ledger-global-e-breach': globalEBreach,
} as const