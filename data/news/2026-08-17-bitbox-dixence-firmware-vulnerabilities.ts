import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'bitbox-dixence-firmware-vulnerabilities',
	type: NewsType.VULNERABILITY,
	ref: {
		label: 'BitBox Blog: BitBox 08.2026 Dixence update',
		url: 'https://blog.bitbox.swiss/en/bitbox-08-2026-dixence-update/',
	},
	impact: {
		category: ImpactCategory.HARDWARE_VULNERABILITY,
		fundsImpacted: true,
	},
	publishedAt: '2026-08-17',
	severity: Severity.LOW,
	status: IncidentStatus.RESOLVED,
	summary:
		'BitBox disclosed three security issues in its hardware wallet firmware, all fixed in the 08.2026 "Dixence" update (firmware version 9.26.5). A bootloader issue, already fixed in the prior Oeschinen release (v9.26.2), could have let an attacker trick users into installing malicious firmware and thereby steal funds, but required a phishing attack (the BitBox02 Nova is not affected). A different memory corruption issue on multi-edition devices without a wallet set up, used with a malicious host, could enable arbitrary code execution and malicious firmware installation (the Bitcoin-only edition is not affected). A silent payments issue could have allowed an attacker to lock funds to an unintended payment address for a potential ransom. There are no reports of exploitation or stolen funds from any of these vulnerabilities.',
	title: 'BitBox firmware update fixes three internally-discovered vulnerabilities',
	updatedAt: '2026-08-18',
	wallets: ['bitbox'],
} as const satisfies WalletSecurityNews
