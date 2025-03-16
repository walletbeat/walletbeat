import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const eip1193: Eip = {
	prefix: EipPrefix.EIP,
	number: '1193',
	friendlyName: 'JavaScript Provider API',
	formalTitle: 'Ethereum Provider JavaScript API',
	status: EipStatus.FINAL,
	summaryMarkdown: `
		A JavaScript Ethereum Provider API for consistency across clients and applications.
	`,
	whyItMattersMarkdown: `
		EIP-1193 defines a consistent standard for browser-extension-based
		Ethereum wallets to integrate with web applications. This allows
		web applications to interact with the wallet and the Ethereum blockchain
		without needing to implement wallet-specific code.
	`,
	noteMarkdown: `
		EIP-1193 has largely been superseded by EIP-6963, which provides better
		support for the case where the user has installed multiple Ethereum
		wallet browser extensions.
	`,
}
