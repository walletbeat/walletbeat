import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'rabby-silent-signature-extraction',
	type: NewsType.VULNERABILITY,
	ref: [
		{
			label: 'V12 on X: Silent signature extraction in Rabby leading to a full wallet drain',
			url: 'https://x.com/v12sec/status/2090114226320977931',
		},
		{
			label: 'Rabby Wallet on X: Vulnerability resolved and update released',
			url: 'https://x.com/Rabby_io/status/2090269706087514615',
		},
	],
	impact: {
		category: ImpactCategory.SIGNING_BUG,
		fundsImpacted: true,
	},
	publishedAt: '2026-08-19',
	severity: Severity.LOW,
	status: IncidentStatus.RESOLVED,
	summary:
		'Security researcher disclosed a silent signature extraction flaw in the Rabby browser extension. A malicious app can queue a fund-draining signature request hidden by a Chrome pop-under bug, and because unlocking the wallet resolves the pending approval queue without re-confirming consent, the signature could be signed without the user seeing it. This vulnerability only works if the user has manually configured their wallet auto-lock timer to exactly 10 minutes, and there are no reports of any funds being compromised. Rabby released a fix on August 11 2026. The mobile app is unaffected. No exploits were detected in the wild.',
	title: 'Silent Signature Extraction Vulnerability in Rabby Browser Extension',
	updatedAt: '2026-08-20',
	wallets: ['rabby'],
} as const satisfies WalletSecurityNews
