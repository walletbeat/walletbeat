import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'

export default {
	slug: 'ledger-e-commerce-database-breach',
	type: NewsType.DATA_BREACH,
	ref: [
		{
			label: 'Ledger: Addressing the July 2020 e-commerce and marketing data breach',
			url: 'https://www.ledger.com/addressing-the-july-2020-e-commerce-and-marketing-data-breach',
		},
		{
			label: "Ledger: Message from Ledger's CEO about the data leak",
			url: 'https://www.ledger.com/message-ledgers-ceo-data-leak',
		},
	],
	impact: {
		category: ImpactCategory.PRIVACY_LEAK,
		fundsImpacted: false,
	},
	publishedAt: '2020-07-29',
	severity: Severity.HIGH,
	status: IncidentStatus.RESOLVED,
	summary:
		"An unauthorized party used an API key to access part of Ledger's e-commerce and marketing database on 2020-06-25, exposing about 1 million customer email addresses. Ledger initially reported that 9,500 customers also had their names, postal addresses and phone numbers exposed. In December 2020 the database was dumped publicly, revealing that the names, postal addresses and phone numbers of about 272,000 customers had been taken. No payment information, recovery phrases or funds were exposed, but the leak fueled phishing and extortion attempts against Ledger customers.",
	title: 'Ledger E-Commerce Database Breach Exposes Customer Contact Details',
	updatedAt: '2020-12-21',
	wallets: ['ledger'],
} as const satisfies WalletSecurityNews
