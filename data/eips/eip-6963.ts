import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const eip6963: Eip = {
	prefix: EipPrefix.EIP,
	number: '6963',
	friendlyName: 'Multiple JavaScript Providers',
	formalTitle: 'Multi Injected Provider Discovery',
	status: EipStatus.FINAL,
	summaryMarkdown: `
		An alternative discovery mechanism to EIP-1193 which supports discovering multiple injected Wallet Providers in a web page.
	`,
	whyItMattersMarkdown: `
		EIP-9693 defines a consistent standard for browser-extension-based
		Ethereum wallets to integrate with web applications. This allows
		web applications to interact with the wallet and the Ethereum blockchain
		without needing to implement wallet-specific code.
	`,
	noteMarkdown: `
		EIP-6963 has largely superseded EIP-1193, as it provides better
		support for the case where the user has installed multiple Ethereum
		wallet browser extensions.
	`,
}
