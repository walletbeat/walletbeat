import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'kraken-trezor-voltage-glitch-seed-extraction',
	type: NewsType.VULNERABILITY,
	ref: {
		label: 'Kraken Security Labs: Kraken Identifies Critical Flaw in Trezor Hardware Wallets',
		url: 'https://blog.kraken.com/security/kraken-identifies-critical-flaw-in-trezor-hardware-wallets',
	},
	impact: {
		category: ImpactCategory.HARDWARE_VULNERABILITY,
		fundsImpacted: true,
	},
	publishedAt: '2020-01-31',
	severity: Severity.HIGH,
	status: IncidentStatus.MITIGATED,
	summary:
		'Kraken Security Labs showed that voltage glitching the microcontroller of the Trezor One and Trezor Model T can extract the encrypted seed with about 15 minutes of physical access to the device. The PIN protecting the seed can then be brute-forced in minutes. The flaw is in the microcontroller hardware, so firmware updates cannot fully fix it. Enabling a BIP39 passphrase, which is not stored on the device, protects against the attack. Kraken disclosed the issue to Trezor on 2019-10-30.',
	title: 'Physical Voltage Glitching Attack Extracts Seeds from Trezor One and Model T',
	updatedAt: '2020-01-31',
	wallets: ['trezor'],
} as const satisfies WalletSecurityNews
