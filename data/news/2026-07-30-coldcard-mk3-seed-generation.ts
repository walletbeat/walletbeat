import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'coldcard-mk3-seed-generation',
	type: NewsType.VULNERABILITY,
	ref: {
		label: 'Coldcard Security Advisory: Seed Generation Warning by Coinkite',
		url: 'https://blog.coinkite.com/coldcard-mk3-seed-generation-warning/',
	},
	impact: {
		category: ImpactCategory.HARDWARE_VULNERABILITY,
		fundsImpacted: true,
	},
	publishedAt: '2026-07-30',
	severity: Severity.HIGH,
	status: IncidentStatus.MITIGATED,
	summary:
		'Coinkite disclosed a security advisory affecting seed generation on COLDCARD hardware wallets (Mk2, Mk3, Mk4, Mk5 and Q). Affected firmware generates seeds with reduced entropy: Mk2/Mk3 firmware versions 4.0.1 through 4.1.9 inclusive, and Mk4, Mk5 and Q before their fixed releases, produce roughly 72 bits of entropy instead of the expected 128 bits. Funds controlled by such seeds are at risk. Fixed firmware has been released for all affected models. Coinkite advises migrating to a newly-generated seed.',
	title: 'COLDCARD seed generation vulnerability reduces entropy',
	updatedAt: '2026-07-30',
	wallets: [],
} as const satisfies WalletSecurityNews
