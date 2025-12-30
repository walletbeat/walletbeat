export type EIPTestStatus = 'untested' | 'pass' | 'fail' | 'partial' | 'testing'

export interface EIPTest {
	id: string
	eipNumber: string
	name: string
	description: string
	specUrl: string
	requirements?: string[]
	checks: EIPCheck[]
}

export interface EIPCheck {
	id: string
	name: string
	description: string
	critical: boolean // Whether this check is required for compliance
}

export const eipTests: EIPTest[] = [
	{
		id: 'eip-1193',
		eipNumber: 'EIP-1193',
		name: 'Ethereum Provider JavaScript API',
		description:
			'Defines a standard JavaScript provider interface for Ethereum wallets, including the request method and event system.',
		specUrl: 'https://eips.ethereum.org/EIPS/eip-1193',
		requirements: [
			'Browser extension or injected provider must be installed',
			'Provider should be accessible via window.ethereum or EIP-6963 discovery',
		],
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
				id: 'supports-accountsChanged',
				name: 'accountsChanged event',
				description: 'Provider emits accountsChanged when accounts change',
				critical: true,
			},
			{
				id: 'supports-chainChanged',
				name: 'chainChanged event',
				description: 'Provider emits chainChanged when chain changes',
				critical: true,
			},
			{
				id: 'supports-connect',
				name: 'connect event',
				description: 'Provider emits connect event when connected',
				critical: false,
			},
			{
				id: 'supports-disconnect',
				name: 'disconnect event',
				description: 'Provider emits disconnect event when disconnected',
				critical: false,
			},
			{
				id: 'eth-accounts',
				name: 'eth_accounts RPC',
				description: 'Responds to eth_accounts request',
				critical: true,
			},
			{
				id: 'eth-requestAccounts',
				name: 'eth_requestAccounts RPC',
				description: 'Responds to eth_requestAccounts request (shows connection prompt)',
				critical: true,
			},
		],
	},
	{
		id: 'eip-2700',
		eipNumber: 'EIP-2700',
		name: 'JavaScript Provider Event Emitter',
		description:
			'Extends EIP-1193 to formalize the event emitter interface, ensuring wallets properly implement EventEmitter methods for listening to provider events.',
		specUrl: 'https://eips.ethereum.org/EIPS/eip-2700',
		requirements: [
			'Browser extension or injected provider must be installed',
			'Provider should implement standard EventEmitter interface',
		],
		checks: [
			{
				id: 'has-on',
				name: 'on() method',
				description: 'Provider implements on(eventName, listener) method',
				critical: true,
			},
			{
				id: 'has-removeListener',
				name: 'removeListener() method',
				description: 'Provider implements removeListener(eventName, listener) method',
				critical: true,
			},
			{
				id: 'has-addListener',
				name: 'addListener() method',
				description: 'Provider implements addListener(eventName, listener) method (alias for on)',
				critical: false,
			},
			{
				id: 'has-removeAllListeners',
				name: 'removeAllListeners() method',
				description: 'Provider implements removeAllListeners([eventName]) method',
				critical: false,
			},
			{
				id: 'has-listeners',
				name: 'listeners() method',
				description: 'Provider implements listeners(eventName) method',
				critical: false,
			},
			{
				id: 'has-once',
				name: 'once() method',
				description: 'Provider implements once(eventName, listener) method',
				critical: false,
			},
			{
				id: 'has-emit',
				name: 'emit() method',
				description: 'Provider implements emit(eventName, ...args) method (for internal use)',
				critical: false,
			},
			{
				id: 'supports-message-event',
				name: 'message event',
				description: 'Provider supports the message event for subscription notifications',
				critical: true,
			},
		],
	},
	{
		id: 'eip-6963',
		eipNumber: 'EIP-6963',
		name: 'Multi Injected Provider Discovery',
		description:
			'Enables multiple wallet extensions to coexist by announcing their providers via events instead of overwriting window.ethereum.',
		specUrl: 'https://eips.ethereum.org/EIPS/eip-6963',
		requirements: [
			'Modern browser with multiple wallet extensions installed (recommended)',
			'At least one wallet supporting EIP-6963',
		],
		checks: [
			{
				id: 'announces-provider',
				name: 'Provider announcement',
				description: 'Wallet announces itself via eip6963:announceProvider event',
				critical: true,
			},
			{
				id: 'responds-to-request',
				name: 'Responds to discovery request',
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
				id: 'unique-uuid',
				name: 'Unique UUID',
				description: 'Provider has a unique UUID',
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
		id: 'eip-5792',
		eipNumber: 'EIP-5792',
		name: 'Wallet Function Call API',
		description:
			'Defines methods for sending batched transactions (wallet_sendCalls) and querying their status, enabling atomic multi-call operations.',
		specUrl: 'https://eips.ethereum.org/EIPS/eip-5792',
		requirements: [
			'Wallet must support EIP-5792 (newer standard, not all wallets support it yet)',
			'Requires connection to a wallet',
		],
		checks: [
			{
				id: 'has-sendCalls',
				name: 'wallet_sendCalls',
				description: 'Provider implements wallet_sendCalls method',
				critical: true,
			},
			{
				id: 'has-getCallsStatus',
				name: 'wallet_getCallsStatus',
				description: 'Provider implements wallet_getCallsStatus method',
				critical: true,
			},
			{
				id: 'has-showCallsStatus',
				name: 'wallet_showCallsStatus',
				description: 'Provider implements wallet_showCallsStatus method (optional)',
				critical: false,
			},
			{
				id: 'has-getCapabilities',
				name: 'wallet_getCapabilities',
				description: 'Provider implements wallet_getCapabilities method',
				critical: false,
			},
			{
				id: 'atomicity-support',
				name: 'Atomicity support',
				description: 'Wallet declares atomicBatch capability in wallet_getCapabilities',
				critical: false,
			},
			{
				id: 'atomicity-enforcement',
				name: 'Atomicity enforcement',
				description:
					'When atomicBatch is true, wallet reverts all calls if any call fails (true atomic batch)',
				critical: false,
			},
		],
	},
]
