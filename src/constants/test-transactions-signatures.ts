export interface TestTransaction {
	id: string
	name: string
	function: string
	parameters: {
		name: string
		value: string
		type: string
	}[]
	calldata: `0x${string}`
	contractAddress?: `0x${string}`
	description?: string
	requirements?: string[]
	value?: bigint
	// For multi-call transactions (EIP-7702)
	calls?: {
		to: `0x${string}`
		data: `0x${string}`
		value?: bigint
	}[]
}

export interface TestSignature {
	id: string
	name: string
	type: 'message' | 'typed'
	description?: string
	requirements?: string[]
	message?: string
	domain?: {
		name: string
		version: string
		chainId: number
		verifyingContract: `0x${string}`
		salt: `0x${string}`
	}
	types?: Record<
		string,
		{
			name: string
			type: string
		}[]
	>
	primaryType?: string
	messageData?: Record<string, string | number | boolean | bigint | Record<string, unknown>>
}

export const testTransactions: TestTransaction[] = [
	{
		id: 'approve-1',
		name: 'ERC20 Approve',
		function: 'approve(address,uint256)',
		parameters: [
			{
				name: 'spender',
				value: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // AAVE Address
				type: 'address',
			},
			{
				name: 'amount',
				value: '1000000',
				type: 'uint256',
			},
		],
		calldata:
			'0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240',
		contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		description: 'Approve 1 token (6 decimals) to the specified address',
		requirements: [
			'Have at least 1 USDC in your wallet',
			'Ensure you have sufficient ETH for gas fees',
			"Make sure you're on the correct network (Ethereum Mainnet)",
		],
	},
	{
		id: 'transfer-1',
		name: 'ERC20 Transfer',
		function: 'transfer(address,uint256)',
		parameters: [
			{
				name: 'to',
				value: '0x06496E706bB260Bef1656297A7eaDDF5D3E7788A',
				type: 'address',
			},
			{
				name: 'amount',
				value: '1000000',
				type: 'uint256',
			},
		],
		calldata:
			'0xa9059cbb00000000000000000000000006496e706bb260bef1656297a7eaddf5d3e7788a00000000000000000000000000000000000000000000000000000000000f4240',
		contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		description: 'Transfer 1 token (6 decimals) to the specified address',
		requirements: [
			'Have at least 1 USDC in your wallet',
			'Ensure you have sufficient ETH for gas fees',
			"Make sure you're on the correct network (Ethereum Mainnet)",
		],
	},
	{
		id: 'supply-1',
		name: 'Aave Supply',
		function: 'supply(address,uint256,address,uint16)',
		parameters: [
			{
				name: 'asset',
				value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
				type: 'address',
			},
			{
				name: 'amount',
				value: '1000000',
				type: 'uint256',
			},
			{
				name: 'onBehalfOf',
				value: '0x9467919138E36f0252886519f34a0f8016dDb3a3',
				type: 'address',
			},
			{
				name: 'referralCode',
				value: '0',
				type: 'uint16',
			},
		],
		calldata:
			'0x617ba037000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000009467919138e36f0252886519f34a0f8016ddb3a30000000000000000000000000000000000000000000000000000000000000000',
		contractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
		description: 'Supply 1 token (6 decimals) to Aave protocol',
		requirements: [
			'Have at least 1 token of the specified asset in your wallet',
			'Ensure you have sufficient ETH for gas fees',
			"Make sure you're on the correct network",
		],
	},
	{
		id: 'multicall-1',
		name: 'EIP-7702 Multi-Call',
		function: 'approve(address,uint256) + transfer(address,uint256)',
		parameters: [
			{
				name: 'spender',
				value: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
				type: 'address',
			},
			{
				name: 'amount',
				value: '1000000',
				type: 'uint256',
			},
			{
				name: 'to',
				value: '0x06496E706bB260Bef1656297A7eaDDF5D3E7788A',
				type: 'address',
			},
		],
		calldata:
			'0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240',
		contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		description:
			'Batch transactions using EIP-7702 (EIP-5792 sendCalls): Approve and transfer USDC',
		requirements: [
			'Have at least 1 USDC in your wallet',
			'Ensure you have sufficient ETH for gas fees',
			"Make sure you're on the correct network (Ethereum Mainnet)",
			'Requires wallet support for EIP-5792 (wallet_sendCalls)',
		],
		calls: [
			{
				to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`,
				data: '0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240' as `0x${string}`,
				value: BigInt(0),
			},
			{
				to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`,
				data: '0xa9059cbb00000000000000000000000006496e706bb260bef1656297a7eaddf5d3e7788a00000000000000000000000000000000000000000000000000000000000f4240' as `0x${string}`,
				value: BigInt(0),
			},
		],
	},
]
export const testSignatures: TestSignature[] = [
	{
		id: 'message-1',
		name: 'Simple Test Message',
		type: 'message',
		message:
			'This is a safe test message for educational purposes only. It does not authorize any transactions or actions.',
		description:
			"A simple plain text message signature. This is the safest type of signature as it's just text with no structured data.",
		requirements: [
			"This signature is safe - it's just a plain text message",
			'No transactions or approvals are authorized by this signature',
			'This is for testing and educational purposes only',
		],
	},
	{
		id: 'siwe-1',
		name: 'SIWE (Sign-In With Ethereum)',
		type: 'message',
		message: '',
		description:
			'Sign-In With Ethereum (EIP-4361) - A standardized authentication message format for wallet-based login.',
		requirements: [
			'SIWE is the standard protocol for wallet authentication',
			'This message follows the EIP-4361 specification',
			'Used for proving wallet ownership to log into applications',
			'Safe for testing - this signature only authenticates your session',
		],
	},
	{
		id: 'typed-1',
		name: 'EIP-712 Test Signature',
		type: 'typed',
		description:
			'An EIP-712 structured data signature for testing. This demonstrates how structured data signatures work.',
		domain: {
			name: 'Test Signature App',
			version: '1',
			chainId: 1,
			verifyingContract: '0x0000000000000000000000000000000000000000',
			salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
		},
		types: {
			TestMessage: [
				{ name: 'purpose', type: 'string' },
				{ name: 'message', type: 'string' },
			],
		},
		primaryType: 'TestMessage',
		messageData: {
			purpose: 'Educational Testing Only',
			message:
				'This signature is for testing purposes only. It does not authorize any transactions, transfers, or approvals.',
		},
		requirements: [
			'This is a structured data signature (EIP-712)',
			'The domain clearly indicates this is for testing only',
			'No financial transactions or approvals are authorized',
			'This signature is safe for testing purposes',
		],
	},
]
