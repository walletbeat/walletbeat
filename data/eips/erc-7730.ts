import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const erc7730: Eip = {
	friendlyName: 'Clear Signing Format',
	formalTitle: 'Clear Signing Format',
	number: '7730',
	prefix: EipPrefix.ERC,
	status: EipStatus.DRAFT,
	summaryMarkdown: `
		ERC-7730 defines a standard JSON descriptor format for structured calldata,
		enabling wallets to display human-readable descriptions of smart contract calls.
		Instead of showing raw hex calldata, wallets that implement ERC-7730 can show
		decoded function names and parameters in plain language. For example,
		"Approve 100 USDC for Aave" instead of the raw \`0x095ea7b3...\` bytes.
	`,
	whyItMattersMarkdown: `
		Without calldata decoding, users must trust that the signing prompt correctly
		represents the transaction they intended to authorize, a significant attack surface.
		ERC-7730 allows wallets to independently display what a transaction actually does
		so users can confirm function names, amounts, and addresses before signing.
	`,
}
