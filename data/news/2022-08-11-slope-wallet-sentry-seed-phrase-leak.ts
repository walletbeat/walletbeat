import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'slope-wallet-sentry-seed-phrase-leak',
	type: NewsType.DATA_BREACH,
	ref: [
		{
			label: 'Slope Finance Investigation by auditor OtterSec',
			url: 'https://osec.io/reports/slope-investigation-report.pdf',
		},
		{
			label: 'Analysis of Slope Finance hack by auditor SlowMist',
			url: 'https://slowmist.medium.com/analysis-of-a-large-scale-attack-on-solana-part-2-ee105d907c12',
		},
		{
			label: 'Public statement about the Slope Wallet incident by Slope Finance',
			url: 'https://slope-finance.medium.com/slope-update-11-august-2022-31d678d7cd97',
		},
	],
	impact: {
		category: ImpactCategory.SEED_PHRASE_LEAK,
		fundsImpacted: true,
	},
	publishedAt: '2022-08-11',
	severity: Severity.CRITICAL,
	status: IncidentStatus.MITIGATED,
	summary:
		"Slope Wallet versions 2022-06-24 and later contained user tracking code that leaked users' full seed phrase to the Slope's on-premise Sentry analytics platform.",
	title: "Slope Wallet users' seed phrases leaked to user tracking platform Sentry",
	updatedAt: '2026-06-10',
	wallets: [],
} as const satisfies WalletSecurityNews
