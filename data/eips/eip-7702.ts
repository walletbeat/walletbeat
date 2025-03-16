import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const eip7702: Eip = {
	prefix: EipPrefix.EIP,
	number: '7702',
	friendlyName: 'Account Abstraction via smart contract authority delegation',
	formalTitle: 'Set EOA account code',
	status: EipStatus.DRAFT,
	summaryMarkdown: `
		Smart contract accounts require their own Ethereum address by definition.
		EIP-7702 builds on top of ERC-4337 by allowing non-smart-contract accounts
		(EOAs) to delegate their authority to smart contract accounts,
		extending the power of ERC-4337 to all Ethereum users.

		EIP-7702 allows wallets to submit a special type of transaction which
		sets the smart contract code that acts on behalf of the user's account,
		effectively delegating control of the account to the smart contract
		without requiring the user's address to change.
	`,
	whyItMattersMarkdown: `
		EIP-7702 allows users of Ethereum to use smart contract account features
		with minimal changes to the protocol. This gives users better UX and more
		flexibility over how their wallet is secured and recoverable, can be
		used to avoid needing to keep the wallet topped up with Ether to pay for
		gas fees, etc. See
		[Account Abstraction](https://ethereum.org/en/roadmap/account-abstraction/)
		for more information.
	`,
}
