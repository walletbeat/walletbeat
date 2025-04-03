import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const eip2700: Eip = {
	prefix: EipPrefix.EIP,
	number: '2700',
	friendlyName: 'JavaScript Provider Events',
	formalTitle: 'JavaScript Provider Event Emitter',
	status: EipStatus.FINAL,
	summaryMarkdown: `
		A standard mechanism for JavaScript Ethereum Providers to notify clients about chain state changes when both are able to interface with each other via a shared JavaScript object.
	`,
	whyItMattersMarkdown: `
		EIP-2700 defines a consistent standard for web applications to be notified
		about changes and events to the chain, such as transaction inclusions or
		failures. This allows web applications to interact with the wallet and
		Ethereum blockchain without needing to implement wallet-specific code.
	`,
}
