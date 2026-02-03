// Step-based EIP testing types
export type StepStatus = 'pending' | 'running' | 'passed' | 'partial' | 'failed' | 'skipped'

export interface EIPCheckResult {
	id: string
	name: string
	description: string
	passed: boolean
	detail?: string
}

export interface EIPTestResult {
	eipNumber: string
	name: string
	specUrl: string
	checks: EIPCheckResult[]
	overallPassed: boolean
}

export interface TestStep {
	id: string
	stepNumber: number
	name: string
	description: string
	eips: EIPReference[]
}

export interface EIPReference {
	eipNumber: string
	name: string
	specUrl: string
	checks: EIPCheckDefinition[]
}

export interface EIPCheckDefinition {
	id: string
	name: string
	description: string
	critical: boolean
}

export interface StepResult {
	stepId: string
	status: StepStatus
	eipResults: EIPTestResult[]
	error?: string
	timestamp?: number
}

export interface DiscoveredProvider {
	uuid: string
	name: string
	icon: string
	rdns: string
}

// The 6 testing steps with their EIP mappings
export const testSteps: TestStep[] = [
	{
		id: 'step-1-detection',
		stepNumber: 1,
		name: 'Wallet Detection',
		description: 'Detect available wallets via EIP-6963 discovery or window.ethereum fallback',
		eips: [
			{
				eipNumber: 'EIP-6963',
				name: 'Multi Injected Provider Discovery',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-6963',
				checks: [
					{
						id: 'announces-provider',
						name: 'Provider announcement',
						description: 'Wallet announces itself via eip6963:announceProvider event',
						critical: true,
					},
					{
						id: 'responds-to-request',
						name: 'Responds to discovery',
						description: 'Wallet responds to eip6963:requestProvider event',
						critical: true,
					},
					{
						id: 'has-provider-info',
						name: 'Provider info object',
						description: 'Includes valid provider info (uuid, name, icon, rdns)',
						critical: true,
					},
					{
						id: 'valid-icon',
						name: 'Valid icon URI',
						description: 'Provider icon is a valid data URI or HTTPS URL',
						critical: false,
					},
					{
						id: 'rdns-format',
						name: 'RDNS format',
						description: 'Provider rdns follows reverse domain name format',
						critical: false,
					},
				],
			},
			{
				eipNumber: 'EIP-1193',
				name: 'Ethereum Provider JavaScript API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
				checks: [
					{
						id: 'has-provider',
						name: 'Provider exists',
						description: 'window.ethereum or provider discovered via EIP-6963',
						critical: true,
					},
					{
						id: 'has-request',
						name: 'request() method',
						description: 'Provider implements the request(args) method',
						critical: true,
					},
				],
			},
		],
	},
	{
		id: 'step-2-connect',
		stepNumber: 2,
		name: 'Connect Wallet',
		description: 'Connect to the wallet and verify connection methods work correctly',
		eips: [
			{
				eipNumber: 'EIP-1193',
				name: 'Ethereum Provider JavaScript API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
				checks: [
					{
						id: 'eth-requestAccounts',
						name: 'eth_requestAccounts',
						description: 'Successfully prompts user to connect and returns accounts',
						critical: true,
					},
					{
						id: 'has-on',
						name: 'on() method',
						description: 'Provider implements the on(eventName, listener) method',
						critical: true,
					},
					{
						id: 'has-removeListener',
						name: 'removeListener() method',
						description: 'Provider implements the removeListener(eventName, listener) method',
						critical: true,
					},
					{
						id: 'connect-event',
						name: 'connect event',
						description: 'Can subscribe to connect event (MUST emit when connected)',
						critical: false,
					},
					{
						id: 'disconnect-event',
						name: 'disconnect event',
						description: 'Can subscribe to disconnect event (MUST emit with error 4900/4901)',
						critical: false,
					},
				],
			},
		],
	},
	{
		id: 'step-3-account',
		stepNumber: 3,
		name: 'Check Account',
		description: 'Verify account access and event subscription capabilities',
		eips: [
			{
				eipNumber: 'EIP-1193',
				name: 'Ethereum Provider JavaScript API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
				checks: [
					{
						id: 'eth-accounts',
						name: 'eth_accounts',
						description: 'Returns connected account addresses',
						critical: true,
					},
					{
						id: 'valid-address',
						name: 'Valid address format',
						description: 'Returned address is a valid Ethereum address (0x + 40 hex chars)',
						critical: true,
					},
					{
						id: 'accountsChanged-event',
						name: 'accountsChanged event',
						description: 'Can subscribe to accountsChanged event',
						critical: false,
					},
				],
			},
		],
	},
	{
		id: 'step-4-network',
		stepNumber: 4,
		name: 'Check Network',
		description: 'Verify chain information and EventEmitter implementation',
		eips: [
			{
				eipNumber: 'EIP-1193',
				name: 'Ethereum Provider JavaScript API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
				checks: [
					{
						id: 'eth-chainId',
						name: 'eth_chainId',
						description: 'Returns current chain ID',
						critical: true,
					},
					{
						id: 'chainChanged-event',
						name: 'chainChanged event',
						description: 'Can subscribe to chainChanged event',
						critical: false,
					},
				],
			},
			{
				eipNumber: 'EIP-2700',
				name: 'JavaScript Provider Event Emitter',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-2700',
				checks: [
					{
						id: 'has-on',
						name: 'on() method',
						description: 'Provider implements on(eventName, listener)',
						critical: true,
					},
					{
						id: 'has-removeListener',
						name: 'removeListener() method',
						description: 'Provider implements removeListener(eventName, listener)',
						critical: true,
					},
					{
						id: 'has-once',
						name: 'once() method',
						description: 'Provider implements once(eventName, listener)',
						critical: false,
					},
					{
						id: 'has-removeAllListeners',
						name: 'removeAllListeners() method',
						description: 'Provider implements removeAllListeners([eventName])',
						critical: false,
					},
				],
			},
		],
	},
	{
		id: 'step-5-batch-send',
		stepNumber: 5,
		name: 'Send Batch Calls',
		description: 'Test EIP-5792 by sending a batched transaction (requires wallet confirmation)',
		eips: [
			{
				eipNumber: 'EIP-5792',
				name: 'Wallet Function Call API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-5792',
				checks: [
					{
						id: 'has-getCapabilities',
						name: 'wallet_getCapabilities',
						description: 'Provider implements wallet_getCapabilities method',
						critical: false,
					},
					{
						id: 'atomicity-support',
						name: 'Atomicity support',
						description: 'Wallet declares atomicBatch capability',
						critical: false,
					},
					{
						id: 'has-sendCalls',
						name: 'wallet_sendCalls',
						description: 'Successfully sends batched calls and returns batch ID',
						critical: true,
					},
				],
			},
		],
	},
	{
		id: 'step-6-batch-status',
		stepNumber: 6,
		name: 'Check Batch Status',
		description: 'Query the status of the batch transaction sent in the previous step',
		eips: [
			{
				eipNumber: 'EIP-5792',
				name: 'Wallet Function Call API',
				specUrl: 'https://eips.ethereum.org/EIPS/eip-5792',
				checks: [
					{
						id: 'has-getCallsStatus',
						name: 'wallet_getCallsStatus',
						description: 'Successfully retrieves batch status',
						critical: true,
					},
					{
						id: 'valid-status-response',
						name: 'Valid status response',
						description: 'Status response includes status field (number or string)',
						critical: true,
					},
					{
						id: 'atomic-batch-execution',
						name: 'Atomic batch execution',
						description: 'Wallet executes batches atomically (all-or-nothing)',
						critical: false,
					},
					{
						id: 'valid-receipts',
						name: 'Valid receipts array',
						description: 'Response includes receipts array with transaction receipt fields',
						critical: false,
					},
					{
						id: 'has-showCallsStatus',
						name: 'wallet_showCallsStatus',
						description: 'Provider implements wallet_showCallsStatus (optional)',
						critical: false,
					},
				],
			},
		],
	},
]

// Helper to get a step by ID
export function getStepById(stepId: string): TestStep | undefined {
	return testSteps.find(step => step.id === stepId)
}

// Helper to get all EIP numbers tested across all steps
export function getAllTestedEIPs(): string[] {
	const eips = new Set<string>()

	for (const step of testSteps) {
		for (const eip of step.eips) {
			eips.add(eip.eipNumber)
		}
	}

	return Array.from(eips)
}
