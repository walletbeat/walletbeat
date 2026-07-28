import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'
import { variantEnum } from '@/schema/variants'

export const erc8213: Eip = {
	friendlyName: 'Wallet signature & calldata digest display',
	formalTitle: 'Wallet Signature and Calldata Digest Display',
	appliesTo: variantEnum.set,
	icon: 'ICON_HASH',
	number: '8213',
	prefix: EipPrefix.ERC,
	status: EipStatus.DRAFT,
	summaryMarkdown: `
		ERC-8213 standardizes the terminology and display requirements for
		cryptographic digests that wallets show to signers. It defines the terms:

		- **EIP-712 Digest**: \`keccak256("\\x19\\x01" || domainSeparator || hashStruct(message))\` — the value that is ultimately signed.
		- **Calldata Digest**: \`keccak256(uint256(len(calldata)) || calldata)\` — a compact, chain-agnostic fingerprint of the transaction payload.

		For EIP-712 signing, wallets SHOULD display at least the EIP-712 Digest (or Domain Hash + Message Hash together).
		For transactions with calldata, wallets SHOULD display the Calldata Digest as a \`0x\`-prefixed hex string.
	`,
	whyItMattersMarkdown: `
		Recent high-profile exchange compromises showed that users cannot safely
		rely on a website's description of what they are signing, if the signing
		interface is compromised, the description can be spoofed while the actual
		payload is malicious. ERC-8213 gives signers a way to independently verify
		the exact bytes they authorize by comparing a short digest against a trusted
		external source, without needing to parse raw hex character-by-character.
	`,
}
