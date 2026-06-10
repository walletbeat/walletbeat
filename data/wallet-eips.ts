export type EipStatus = 'Final' | 'Draft' | 'Review' | 'Stagnant' | 'Withdrawn' | 'Living'
export type EipCategory = 'signing' | 'account-abstraction' | 'provider' | 'tokens' | 'identity'

export interface WalletEip {
	category: EipCategory
	number: number
	specUrl: string
	status: EipStatus
	summary: string
	title: string
	walletbeatAttributeSlug?: string
	walletRelevance: string
}

export const walletEips: WalletEip[] = [
	{
		category: 'signing',
		number: 191,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-191',
		status: 'Final',
		summary:
			'Defines a prefix format for signed messages so they are clearly distinguishable from signed transactions.',
		title: 'Signed Data Standard',
		walletRelevance:
			'Wallets must prefix personal messages with the EIP-191 header before hashing; failing to do so allows replay attacks across contexts.',
	},
	{
		category: 'signing',
		number: 712,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-712',
		status: 'Final',
		summary:
			'Defines a standard schema so wallets can display human-readable structured data (typed messages) before users sign them.',
		title: 'Typed structured data hashing and signing',
		walletbeatAttributeSlug: 'transaction-legibility',
		walletRelevance:
			'Foundational for clear signing: wallets that implement EIP-712 can show users the decoded fields of what they are signing instead of raw hex.',
	},
	{
		category: 'signing',
		number: 1271,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-1271',
		status: 'Final',
		summary:
			'A standard interface (`isValidSignature`) for smart contract wallets to validate signatures on-chain.',
		title: 'Standard Signature Validation Method for Contracts',
		walletRelevance:
			'Smart contract wallets (Safe, etc.) cannot sign with a private key. EIP-1271 lets dApps verify their signatures without assuming EOA ownership.',
	},
	{
		category: 'signing',
		number: 7730,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-7730',
		status: 'Review',
		summary:
			'A JSON registry format that enriches EIP-712 and calldata schemas with human-readable display metadata, enabling "clear signing".',
		title: 'Structured Data Clear Signing Format',
		walletbeatAttributeSlug: 'transaction-legibility',
		walletRelevance:
			'Allows hardware and software wallets to display intent-level descriptions (e.g. "Send 100 USDC to Alice") instead of raw hex when users sign transactions.',
	},
	{
		category: 'signing',
		number: 8312,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-8312',
		status: 'Draft',
		summary:
			'Requires wallets to display both the calldata digest and the EIP-712 digest so users can independently verify what they are signing.',
		title: 'Wallet Signature and Calldata Digest Display (ERC-8213)',
		walletbeatAttributeSlug: 'transaction-legibility',
		walletRelevance:
			'Closes the gap where a wallet could display misleading information while the user signs something different; full implementation prevents Bybit-style UI-spoofing attacks.',
	},

	// Account Abstraction
	{
		category: 'account-abstraction',
		number: 4337,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-4337',
		status: 'Final',
		summary:
			'Introduces UserOperations and a separate mempool so smart contract wallets can participate in Ethereum without requiring protocol changes.',
		title: 'Account Abstraction Using Alt Mempool (ERC-4337)',
		walletbeatAttributeSlug: 'account-abstraction',
		walletRelevance:
			'Enables smart contract wallets to sponsor gas, batch transactions, use social recovery, and support arbitrary signing schemes.',
	},
	{
		category: 'account-abstraction',
		number: 7702,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-7702',
		status: 'Final',
		summary:
			'Allows an EOA to temporarily delegate its code to a smart contract for the duration of a transaction.',
		title: 'Set EOA Account Code',
		walletbeatAttributeSlug: 'account-abstraction',
		walletRelevance:
			'Brings account-abstraction features (batching, sponsored gas, session keys) to existing EOA wallets without requiring migration to a new address.',
	},

	// Provider / Discovery
	{
		category: 'provider',
		number: 1193,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
		status: 'Final',
		summary:
			'Defines the `window.ethereum` provider interface that dApps use to communicate with browser wallets.',
		title: 'Ethereum Provider JavaScript API',
		walletRelevance:
			'Every browser extension wallet must implement this interface for dApp compatibility. Correct event handling (connect/disconnect/chainChanged) is required for a good UX.',
	},
	{
		category: 'provider',
		number: 6963,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-6963',
		status: 'Final',
		summary:
			'Uses browser window events to announce multiple wallet providers simultaneously, replacing the single `window.ethereum` slot.',
		title: 'Multi Injected Provider Discovery',
		walletRelevance:
			'Eliminates wallet conflicts when multiple extensions are installed and lets users choose their wallet explicitly from a list.',
	},

	// Tokens
	{
		category: 'tokens',
		number: 20,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-20',
		status: 'Final',
		summary:
			'The canonical fungible token interface: transfer, approve, transferFrom, balanceOf, allowance.',
		title: 'Token Standard (ERC-20)',
		walletRelevance:
			'Wallets must correctly display and handle ERC-20 token balances, approvals, and transfer requests.',
	},
	{
		category: 'tokens',
		number: 721,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-721',
		status: 'Final',
		summary: 'Defines the interface for non-fungible tokens (NFTs).',
		title: 'Non-Fungible Token Standard (ERC-721)',
		walletRelevance:
			'Wallets that display NFTs must implement ERC-721 metadata fetching and correctly handle `safeTransferFrom` interactions.',
	},
	{
		category: 'tokens',
		number: 2612,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-2612',
		status: 'Final',
		summary:
			'Extends ERC-20 with a `permit` function so users can approve token spending via an EIP-712 signature instead of an on-chain transaction.',
		title: 'Permit Extension for EIP-20 Signed Approvals',
		walletbeatAttributeSlug: 'transaction-legibility',
		walletRelevance:
			'Wallets must display permit signatures clearly: they carry spending authority and are a common phishing vector.',
	},

	// Identity / ENS
	{
		category: 'identity',
		number: 137,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-137',
		status: 'Final',
		summary:
			'A distributed naming system that maps human-readable names (e.g. `alice.eth`) to Ethereum addresses and other resources.',
		title: 'Ethereum Name Service (ENS)',
		walletRelevance:
			'Wallets that resolve ENS names let users send to `alice.eth` instead of a hex address, dramatically reducing copy-paste phishing risk.',
	},
	{
		category: 'identity',
		number: 3770,
		specUrl: 'https://eips.ethereum.org/EIPS/eip-3770',
		status: 'Final',
		summary:
			'A human-readable address format that includes a chain shortName prefix (e.g. `eth:0x…`, `oeth:0x…`).',
		title: 'Chain-specific Addresses (ERC-3770)',
		walletRelevance:
			'Prevents cross-chain send errors by encoding the intended chain directly in the address string; wallets should display and validate this format.',
	},
]

export const eipCategories: Record<EipCategory, { description: string; label: string }> = {
	'account-abstraction': {
		description:
			'Standards that extend wallet capabilities beyond plain EOAs: gas sponsorship, batching, social recovery.',
		label: 'Account Abstraction',
	},
	identity: {
		description: 'Human-readable naming and chain-aware address formats that reduce phishing risk.',
		label: 'Identity & Addresses',
	},
	provider: {
		description:
			'Standards for how dApps connect to browser wallets and how multiple wallets can coexist.',
		label: 'Provider & Discovery',
	},
	signing: {
		description:
			'Standards that define how wallets hash, display, and sign data — the foundation of user security.',
		label: 'Signing & Legibility',
	},
	tokens: {
		description:
			'Core token interfaces that wallets must handle correctly to display and transact with user assets.',
		label: 'Tokens & Assets',
	},
}
