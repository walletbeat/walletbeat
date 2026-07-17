import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { walletTypes } from '@/schema/wallet-types'

export const erc4361: Eip = {
	friendlyName: 'Sign-In with Ethereum',
	formalTitle: 'Sign-In with Ethereum',
	appliesTo: walletTypes.set,
	icon: 'ICON_LOG_IN',
	number: '4361',
	prefix: EipPrefix.ERC,
	status: EipStatus.FINAL,
	summaryMarkdown: `
		Sign-In with Ethereum describes how Ethereum accounts authenticate with
		off-chain services by signing a standard message format parameterized by
		scope, session details, and security mechanisms (e.g., a nonce).
		The goals of this specification are to provide a self-custodied
		alternative to centralized identity providers, improve interoperability
		across off-chain services for Ethereum-based authentication, and provide
		wallet vendors a consistent machine-readable message format to achieve
		improved user experiences and consent management.
	`,
	whyItMattersMarkdown: `
		ERC-4361 provides a standardized way for apps to authenticate users via
		wallets rather than traditional web2 login systems.
		Wallets supporting this standard can present a clear sign-in request
		details to users, improving the UX and security of signing in with a
		wallet.
	`,
}
