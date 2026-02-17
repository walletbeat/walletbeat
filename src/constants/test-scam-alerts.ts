export interface ScamAlertTest {
	id: string
	name: string
	description: string
	contractAddress: `0x${string}`
	calldata: `0x${string}`
	riskType: 'recent-deploy' | 'previous-interaction' | 'known-scam'
	expectedBehavior: string
	requirements?: string[]
}

export const scamAlertTests: ScamAlertTest[] = [
	{
		id: 'recent-contract-1',
		name: 'Recent Contract Warning',
		description: 'Warns about newly deployed contracts.',
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
		id: 'scam-contract-1',
		name: 'Scam Contract Testing',
		description: 'Blocks or warns about known scam contracts.',
		contractAddress: '0x0000000000000000000000000000000000000000',
		calldata: '0x00000000',
		riskType: 'known-scam',
		expectedBehavior:
			'Wallet should block the transaction or display a prominent scam warning preventing the user from proceeding.',
		requirements: [
			'Connect your wallet before sending',
			'Use a disposable wallet with no real assets',
			'Do NOT send real funds',
			'This test uses a known scam contract address from public blocklists',
		],
	},
]
