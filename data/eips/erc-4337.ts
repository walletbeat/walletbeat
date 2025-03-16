import { type Eip, EipPrefix, EipStatus } from '@/schema/eips'

export const erc4337: Eip = {
	prefix: EipPrefix.ERC,
	number: '4337',
	// Yes this is not exactly what this ERC is implementing, but it is
	// roughly what it unlocks.
	friendlyName: 'Account Abstraction for smart contract wallets',
	formalTitle: 'Account Abstraction Using Alt Mempool',
	status: EipStatus.DRAFT,
	summaryMarkdown: `
		ERC-4337 defines a standard for account abstraction without changes to
		the Ethereum protocol, relying on a separate transaction mempool that
		contains operations to be submitted and executed onchain by external
		actors ("bundlers") on behalf of transacting users.

		Smart contract accounts require their own Ethereum address by definition.
		However, EIP-7702 builds on top of ERC-4337 by allowing non-smart-contract
		accounts (EOAs) to delegate their authority to smart contract accounts,
		extending the power of ERC-4337 to all Ethereum users.
	`,
	whyItMattersMarkdown: `
		ERC-4337 allows users of Ethereum to use smart contract account features
		without changes to the protocol. This gives users better UX and more
		flexibility over how their wallet is secured and recoverable, can be
		used to avoid needing to keep the wallet topped up with Ether to pay for
		gas fees, etc. See
		[Account Abstraction](https://ethereum.org/en/roadmap/account-abstraction/)
		for more information.
	`,
}
