import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'demonic-metamask-seed-phrase-on-disk',
	type: NewsType.VULNERABILITY,
	ref: [
		{
			label: 'MetaMask: Security Notice: Extension Disk Encryption Issue',
			url: 'https://medium.com/metamask/security-notice-extension-disk-encryption-issue-d437d4250863',
		},
		{
			label: 'Halborn: MetaMask "Demonic" vulnerability disclosure (CVE-2022-32969)',
			url: 'https://halborn.com/disclosures/demonic-vulnerability/',
		},
	],
	impact: {
		category: ImpactCategory.SEED_PHRASE_LEAK,
		fundsImpacted: true,
	},
	publishedAt: '2022-06-15',
	severity: Severity.HIGH,
	status: IncidentStatus.RESOLVED,
	summary:
		'Security researchers at Halborn found that browser session restore could save a secret recovery phrase typed into the MetaMask extension to disk unencrypted (CVE-2022-32969). Users were at risk if they imported their recovery phrase with the "Show Secret Recovery Phrase" checkbox enabled on a computer with an unencrypted disk that was later stolen or compromised. MetaMask fixed the issue in extension version 10.11.3; the mobile app was not affected. Halborn said it also worked with other browser extension wallets to fix the same issue.',
	title: 'Demonic Vulnerability Could Leave MetaMask Recovery Phrases Unencrypted on Disk',
	updatedAt: '2022-06-15',
	wallets: ['metamask'],
} as const satisfies WalletSecurityNews
