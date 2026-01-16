import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

import { ledgerWalletMetadata } from '../hardware-wallets/ledger'

export default {
	slug: 'global-e-breach',
	type: NewsType.DATA_BREACH,
	ref: {
		label: 'ZachXBT tweet about Ledger data breach',
		url: 'https://x.com/zachxbt/status/2008139053544194545',
	},
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2026-01-06',
	severity: Severity.MEDIUM,
	status: IncidentStatus.RESOLVED,
	summary:
		'Global-e, an independent e-commerce platform used by Ledger.com, experienced unauthorized access to their cloud systems. Personal data including names and contact information of Ledger customers who made purchases through Global-e were improperly accessed. No payment information, account credentials, or passwords were compromised.',
	title: 'Global-e Independent Provider Data Breach Affecting Ledger Customers',
	updatedAt: '2026-01-06',
	wallet: ledgerWalletMetadata,
} as const satisfies WalletSecurityNews