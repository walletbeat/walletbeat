import type { CorporateEntity, InfrastructureProvider } from '@/schema/entity'

export const aws: CorporateEntity & InfrastructureProvider = {
	id: 'aws',
	name: 'Amazon Web Services',
	legalName: { name: 'Amazon Web Services, Inc.', soundsDifferent: false },
	type: {
		chainDataProvider: false,
		corporate: true,
		dataBroker: false,
		exchange: false,
		infrastructureProvider: true,
		offchainDataProvider: false,
		securityAuditor: false,
		transactionBroadcastProvider: false,
		walletDeveloper: false,
	},
	crunchbase: 'https://www.crunchbase.com/organization/amazon-web-services',
	farcaster: { type: 'NO_FARCASTER_PROFILE' },
	icon: 'NO_ICON',
	jurisdiction: 'Seattle, Washington, United States',
	linkedin: 'https://www.linkedin.com/company/amazon-web-services/',
	privacyPolicy: 'https://aws.amazon.com/privacy/',
	repoUrl: 'https://github.com/aws',
	twitter: 'https://x.com/awscloud',
	url: 'https://aws.amazon.com/',
}
