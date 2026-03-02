export type ScamAlertCategory = 'public-list' | 'wallet-own' | 'allow-infinite'

export interface ScamAlertTest {
	id: string
	name: string
	description: string
	category: ScamAlertCategory
	testType: 'transaction' | 'signature'
	contractAddress: `0x${string}`
	calldata: `0x${string}`
	value?: bigint
	riskType: 'recent-deploy' | 'previous-interaction' | 'known-scam' | 'allow-infinite'
	expectedBehavior: string
	requirements?: string[]
	// Only for testType === 'signature'
	domain?: {
		name: string
		version: string
		chainId: number
		verifyingContract: `0x${string}`
	}
	types?: Record<string, { name: string; type: string }[]>
	primaryType?: string
	messageData?: Record<string, string | number | bigint>
}

// approve(address(0), type(uint256).max)
const INFINITE_APPROVE_CALLDATA: `0x${string}` =
	'0x095ea7b30000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

// Deadline 5 years from module load time
const PERMIT_DEADLINE = Math.floor(Date.now() / 1000) + 5 * 365 * 24 * 3600

export const scamAlertTests: ScamAlertTest[] = [
	// ── Public List ──────────────────────────────────────────────────────────────
	{
		id: 'recent-contract-1',
		name: 'Recent Contract Warning',
		description: 'Warns about newly deployed contracts.',
		category: 'public-list',
		testType: 'transaction',
		contractAddress: '0x0000000000000000000000000000000000000000',
		calldata: '0x00000000',
		riskType: 'recent-deploy',
		expectedBehavior:
			'Wallet should display a warning indicating the contract was recently deployed and may be risky.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
		],
	},
	{
		id: 'previous-interaction-1',
		name: 'Previous Contract Transaction',
		description: 'Recognizes previously interacted contracts.',
		category: 'public-list',
		testType: 'transaction',
		contractAddress: '0x0000000000000000000000000000000000000000',
		calldata: '0x00000000',
		riskType: 'previous-interaction',
		expectedBehavior:
			'Wallet may show a familiar contract indicator or skip certain warnings for previously-interacted contracts.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
		],
	},
	{
		id: 'wallet-own-1',
		name: 'Custom Address',
		description: "Enter any address and send 0.0001 ETH to test the wallet's own scam detection.",
		category: 'wallet-own',
		testType: 'transaction',
		contractAddress: '0x0000000000000000000000000000000000000000',
		calldata: '0x',
		value: BigInt(100_000_000_000_000),
		riskType: 'known-scam',
		expectedBehavior:
			'Wallet should use its own internal detection to warn about or block suspicious addresses you provide.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
		],
	},
	{
		id: 'allow-infinite-zero',
		name: 'Known scam address',
		description: 'Sends 0.0001 ETH to a known scam address.',
		category: 'allow-infinite',
		testType: 'transaction',
		contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
		calldata: '0x',
		value: BigInt(100_000_000_000_000),
		riskType: 'allow-infinite',
		expectedBehavior:
			'Wallet should warn about or block the transaction to this known scam address.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
		],
	},
	{
		id: 'allow-infinite-usdc',
		name: 'USDC',
		description: 'Sends an infinite token approval targeting the USDC contract address.',
		category: 'allow-infinite',
		testType: 'transaction',
		contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
		calldata: INFINITE_APPROVE_CALLDATA,
		riskType: 'allow-infinite',
		expectedBehavior:
			'Wallet should warn about an unlimited approval sent to the USDC contract itself — an unusual and suspicious destination.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
		],
	},
	{
		id: 'allow-infinite-permit',
		name: 'Gasless Approval: USDC Permit',
		description:
			'Signs an EIP-2612 Permit granting infinite allowance to an unknown EOA. A relayer could submit permit() to USDC with no gas from you.',
		category: 'allow-infinite',
		testType: 'signature',
		contractAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
		calldata: '0x',
		riskType: 'allow-infinite',
		expectedBehavior:
			'Wallet should clearly show the allowance amount (infinite) and the spender (address(0)) in the signing prompt.',
		requirements: [
			'This signs a message — no on-chain transaction is sent',
			'Check whether the wallet shows the allowance amount and spender clearly',
			'Use only a disposable test wallet',
		],
		domain: {
			name: 'USDC',
			version: '2',
			chainId: 1,
			verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
		},
		types: {
			Permit: [
				{ name: 'owner', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'value', type: 'uint256' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'deadline', type: 'uint256' },
			],
		},
		primaryType: 'Permit',
		messageData: {
			owner: '0x0000000000000000000000000000000000000000', // Placeholder
			spender: '0x0000000000000000000000000000000000000000', // Placeholder
			value: BigInt(
				'115792089237316195423570985008687907853269984665640564039457584007913129639935',
			),
			nonce: 0,
			deadline: PERMIT_DEADLINE,
		},
	},
]

export const SCAM_ALERT_CATEGORY_LABELS: Record<ScamAlertCategory, string> = {
	'public-list': 'Public List',
	'wallet-own': "Wallet's Own",
	'allow-infinite': 'Allow Infinite',
}
