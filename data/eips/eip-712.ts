import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { variantEnum } from '@/schema/variants'

export const eip712: Eip = {
	friendlyName: 'Typed structured data signing',
	formalTitle: 'Typed structured data hashing and signing',
	appliesTo: variantEnum.set,
	icon: 'ICON_SIGNATURE',
	number: '712',
	prefix: EipPrefix.EIP,
	status: EipStatus.FINAL,
	summaryMarkdown: `
		EIP-712 defines a standard for hashing and signing typed structured data,
		enabling wallets to display human-readable descriptions of what a user is
		signing rather than a hex string. It introduces a domain separator
		and per-type schemas so that signatures are both human-inspectable and
		replay-protected across different contracts and chains.
	`,
	whyItMattersMarkdown: `
		Without EIP-712, wallets present users with a raw 32-byte hash to sign,
		giving them no indication of what they are authorizing. With EIP-712,
		wallets can decode and display the structured data 
		so users can make an informed decision before signing.
	`,
}
