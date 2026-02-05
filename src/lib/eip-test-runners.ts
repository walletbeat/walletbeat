import type {
	DiscoveredProvider,
	EIPCheckResult,
	EIPTestResult,
	StepResult,
	StepStatus,
	TestStep,
} from '../constants/test-eip-support'
import type { Eip1193Provider } from '../types/eip'
import { isRecord } from '../types/utils/record'

/**
 * Context provided to EIP test step runners.
 * Contains state accessors and callbacks to update state.
 */
export interface EIPTestContext {
	// State accessors
	getDiscoveredProviders: () => Array<DiscoveredProvider & { provider: unknown }>
	getSelectedProviderId: () => string | null
	getConnectedAddress: () => string | null
	getChainId: () => number | null
	getBatchId: () => string | null
	getAccountAddress: () => string | undefined

	// State setters
	setSelectedProviderId: (id: string) => void
	setConnectedAddress: (address: string) => void
	setChainId: (chainId: number) => void
	setBatchId: (batchId: string) => void
}

/**
 * Get the EIP-1193 provider - either the selected provider from EIP-6963 discovery
 * or fallback to window.ethereum
 */
export function getProviderFromContext(ctx: EIPTestContext): Eip1193Provider | null {
	const selectedId = ctx.getSelectedProviderId()
	const discoveredProviders = ctx.getDiscoveredProviders()

	// If a provider is selected, use it
	if (selectedId) {
		const selected = discoveredProviders.find(p => p.uuid === selectedId)

		if (selected?.provider) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- provider from EIP-6963 is EIP-1193 compliant
			return selected.provider as Eip1193Provider
		}
	}

	// Fallback to window.ethereum
	if (typeof window !== 'undefined' && 'ethereum' in window) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- window.ethereum is the EIP-1193 provider
		return window.ethereum as Eip1193Provider
	}

	return null
}

/**
 * Get the EIP-1193 provider from window.ethereum (legacy fallback)
 */
export function getProvider(): Eip1193Provider | null {
	if (typeof window !== 'undefined' && 'ethereum' in window) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- window.ethereum is the EIP-1193 provider
		return window.ethereum as Eip1193Provider
	}

	return null
}

/**
 * Create a step result object
 */
export function createStepResult(
	step: TestStep,
	status: StepStatus,
	eipResults: EIPTestResult[],
	error?: string,
): StepResult {
	return {
		stepId: step.id,
		status,
		eipResults,
		error,
		timestamp: Date.now(),
	}
}

/**
 * Create an EIP test result object
 */
export function createEIPResult(
	eipNumber: string,
	name: string,
	specUrl: string,
	checks: EIPCheckResult[],
): EIPTestResult {
	const overallPassed = checks.filter(c => c.passed === false).length === 0

	return { eipNumber, name, specUrl, checks, overallPassed }
}

/**
 * Determine step status based on critical vs non-critical check failures
 */
export function determineStepStatus(
	step: TestStep,
	eipResults: EIPTestResult[],
	primaryPassed: boolean,
): StepStatus {
	if (!primaryPassed) {
		return 'failed'
	}

	// Check if any non-critical checks failed
	let hasNonCriticalFailure = false

	for (const eipResult of eipResults) {
		// Find the corresponding EIP definition in the step
		const eipDef = step.eips.find(e => e.eipNumber === eipResult.eipNumber)

		if (!eipDef) {
			continue
		}

		for (const check of eipResult.checks) {
			if (!check.passed) {
				// Find the check definition to see if it's critical
				const checkDef = eipDef.checks.find(c => c.id === check.id)

				if (checkDef && !checkDef.critical) {
					hasNonCriticalFailure = true
				} else if (checkDef && checkDef.critical) {
					// Critical check failed - this shouldn't happen if primaryPassed is true
					// but handle it just in case
					return 'failed'
				}
			}
		}
	}

	return hasNonCriticalFailure ? 'partial' : 'passed'
}

/**
 * Step 1: Wallet Detection
 * Tests EIP-6963 (Multi Injected Provider Discovery) and EIP-1193 basics
 */
export async function runStep1Detection(step: TestStep, ctx: EIPTestContext): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []

	// Re-request providers to ensure we have the latest
	window.dispatchEvent(new Event('eip6963:requestProvider'))
	await new Promise(resolve => setTimeout(resolve, 500))

	// EIP-6963 checks
	const eip6963Checks: EIPCheckResult[] = []
	const discoveredProviders = ctx.getDiscoveredProviders()
	const hasProviders = discoveredProviders.length > 0

	eip6963Checks.push({
		id: 'announces-provider',
		name: 'Provider announcement',
		description: 'Wallet announces itself via eip6963:announceProvider event',
		passed: hasProviders,
		detail: hasProviders
			? `Found ${discoveredProviders.length} provider(s)`
			: 'No providers discovered',
	})

	eip6963Checks.push({
		id: 'responds-to-request',
		name: 'Responds to discovery',
		description: 'Wallet responds to eip6963:requestProvider event',
		passed: hasProviders,
	})

	if (hasProviders) {
		const provider = discoveredProviders[0]

		eip6963Checks.push({
			id: 'has-provider-info',
			name: 'Provider info object',
			description: 'Includes valid provider info (uuid, name, icon, rdns)',
			passed: !!(provider.name && provider.uuid && provider.rdns),
			detail: provider.name || 'Unknown',
		})

		eip6963Checks.push({
			id: 'valid-icon',
			name: 'Valid icon URI',
			description: 'Provider icon is a valid data URI or HTTPS URL',
			passed: provider.icon?.startsWith('data:') || provider.icon?.startsWith('https://'),
		})

		const rdnsRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i

		eip6963Checks.push({
			id: 'rdns-format',
			name: 'RDNS format',
			description: 'Provider rdns follows reverse domain name format',
			passed: rdnsRegex.test(provider.rdns),
			detail: provider.rdns,
		})

		// Auto-select first provider
		ctx.setSelectedProviderId(provider.uuid)
	}

	eipResults.push(
		createEIPResult(
			'EIP-6963',
			'Multi Injected Provider Discovery',
			'https://eips.ethereum.org/EIPS/eip-6963',
			eip6963Checks,
		),
	)

	// EIP-1193 basic checks
	const eip1193Checks: EIPCheckResult[] = []
	const rawProvider = getProviderFromContext(ctx)
	const providerExists = !!rawProvider || hasProviders

	eip1193Checks.push({
		id: 'has-provider',
		name: 'Provider exists',
		description: 'window.ethereum or provider discovered via EIP-6963',
		passed: providerExists,
	})

	eip1193Checks.push({
		id: 'has-request',
		name: 'request() method',
		description: 'Provider implements the request(args) method',
		passed: providerExists && typeof rawProvider?.request === 'function',
	})

	eipResults.push(
		createEIPResult(
			'EIP-1193',
			'Ethereum Provider JavaScript API',
			'https://eips.ethereum.org/EIPS/eip-1193',
			eip1193Checks,
		),
	)

	// Step passes if we found at least one provider
	const stepPassed = hasProviders || providerExists
	const status = determineStepStatus(step, eipResults, stepPassed)

	return createStepResult(step, status, eipResults)
}

/**
 * Step 2: Connect Wallet
 * Tests EIP-1193 connection methods and events
 */
export async function runStep2Connect(step: TestStep, ctx: EIPTestContext): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []
	const eip1193Checks: EIPCheckResult[] = []

	const provider = getProviderFromContext(ctx)

	if (!provider) {
		return createStepResult(step, 'failed', [], 'No provider found')
	}

	// Check on() method
	eip1193Checks.push({
		id: 'has-on',
		name: 'on() method',
		description: 'Provider implements the on(eventName, listener) method',
		passed: typeof provider.on === 'function',
	})

	// Check removeListener() method
	eip1193Checks.push({
		id: 'has-removeListener',
		name: 'removeListener() method',
		description: 'Provider implements the removeListener(eventName, listener) method',
		passed: typeof provider.removeListener === 'function',
	})

	// Set up connect event listener BEFORE requesting accounts
	let connectEventFired = false
	let connectEventData: unknown = null
	const connectListener = (info: unknown) => {
		connectEventFired = true
		connectEventData = info
	}

	// Set up disconnect event listener to verify subscription works
	let disconnectEventSubscribable = false
	const disconnectListener = () => {}

	try {
		if (typeof provider.on === 'function') {
			provider.on('connect', connectListener)
			provider.on('disconnect', disconnectListener)
			disconnectEventSubscribable = true
		}
	} catch {
		// Provider doesn't support event subscription
	}

	// Actually connect via eth_requestAccounts
	let connectPassed = false
	let connectDetail = ''

	try {
		if (provider.request) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
			const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]

			if (accounts && accounts.length > 0) {
				connectPassed = true
				ctx.setConnectedAddress(accounts[0])
				connectDetail = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
			} else {
				connectDetail = 'No accounts returned'
			}
		}
	} catch (error) {
		connectDetail = error instanceof Error ? error.message : 'Connection rejected'
	}

	// Give a brief moment for connect event to fire (some wallets emit asynchronously)
	await new Promise(resolve => setTimeout(resolve, 100))

	// Clean up listeners
	try {
		if (typeof provider.removeListener === 'function') {
			provider.removeListener('connect', connectListener)
			provider.removeListener('disconnect', disconnectListener)
		}
	} catch {
		// Ignore cleanup errors
	}

	eip1193Checks.push({
		id: 'eth-requestAccounts',
		name: 'eth_requestAccounts',
		description: 'Successfully prompts user to connect and returns accounts',
		passed: connectPassed,
		detail: connectDetail,
	})

	// Check if connect event actually fired (EIP-1193 MUST emit when connected)
	let connectEventDetail = ''

	if (connectEventFired) {
		// Validate connect event data has chainId per EIP-1193
		const hasChainId =
			connectEventData && typeof connectEventData === 'object' && 'chainId' in connectEventData

		connectEventDetail = hasChainId
			? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- connectEventData validated above
				`Event fired with chainId: ${(connectEventData as { chainId: string }).chainId}`
			: 'Event fired (missing chainId in payload)'
	} else {
		connectEventDetail = 'Event did not fire during connection'
	}

	eip1193Checks.push({
		id: 'connect-event',
		name: 'connect event',
		description: 'Connect event fires when wallet connects (MUST per EIP-1193)',
		passed: connectEventFired,
		detail: connectEventDetail,
	})

	// For disconnect, we can only verify subscription works (can't trigger actual disconnect)
	eip1193Checks.push({
		id: 'disconnect-event',
		name: 'disconnect event',
		description: 'Can subscribe to disconnect event (fires with error 4900/4901 on disconnect)',
		passed: disconnectEventSubscribable,
		detail: disconnectEventSubscribable ? 'Subscription supported' : 'Cannot subscribe to event',
	})

	eipResults.push(
		createEIPResult(
			'EIP-1193',
			'Ethereum Provider JavaScript API',
			'https://eips.ethereum.org/EIPS/eip-1193',
			eip1193Checks,
		),
	)

	const status = determineStepStatus(step, eipResults, connectPassed)

	return createStepResult(step, status, eipResults)
}

/**
 * Step 3: Check Account
 * Tests EIP-1193 account access methods
 */
export async function runStep3Account(step: TestStep, ctx: EIPTestContext): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []
	const eip1193Checks: EIPCheckResult[] = []

	const provider = getProviderFromContext(ctx)

	if (!provider) {
		return createStepResult(step, 'failed', [], 'No provider found')
	}

	// Call eth_accounts
	let accountsPassed = false
	let accountsDetail = ''
	let returnedAddress = ''

	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		const accounts = (await provider.request({ method: 'eth_accounts' })) as string[]

		if (accounts && accounts.length > 0) {
			accountsPassed = true
			returnedAddress = accounts[0]
			accountsDetail = `${accounts.length} account(s) returned`
		} else {
			accountsDetail = 'No accounts returned (wallet may be disconnected)'
		}
	} catch (error) {
		accountsDetail = error instanceof Error ? error.message : 'Failed to get accounts'
	}

	eip1193Checks.push({
		id: 'eth-accounts',
		name: 'eth_accounts',
		description: 'Returns connected account addresses',
		passed: accountsPassed,
		detail: accountsDetail,
	})

	// Validate address format
	const addressRegex = /^0x[a-fA-F0-9]{40}$/
	const validAddress = addressRegex.test(returnedAddress)

	eip1193Checks.push({
		id: 'valid-address',
		name: 'Valid address format',
		description: 'Returned address is a valid Ethereum address (0x + 40 hex chars)',
		passed: validAddress,
		detail: validAddress ? returnedAddress : 'Invalid or no address',
	})

	// Check accountsChanged event subscription
	let eventSubscribable = false
	let accountsChangedListener: (() => void) | null = null

	try {
		if (typeof provider.on === 'function') {
			accountsChangedListener = () => {}
			provider.on('accountsChanged', accountsChangedListener)
			eventSubscribable = true
		}
	} catch {
		eventSubscribable = false
	}

	// Clean up the listener
	if (accountsChangedListener && typeof provider.removeListener === 'function') {
		try {
			provider.removeListener('accountsChanged', accountsChangedListener)
		} catch {
			// Ignore cleanup errors
		}
	}

	eip1193Checks.push({
		id: 'accountsChanged-event',
		name: 'accountsChanged event',
		description: 'Can subscribe to accountsChanged event',
		passed: eventSubscribable,
	})

	eipResults.push(
		createEIPResult(
			'EIP-1193',
			'Ethereum Provider JavaScript API',
			'https://eips.ethereum.org/EIPS/eip-1193',
			eip1193Checks,
		),
	)

	const stepPassed = accountsPassed && validAddress
	const status = determineStepStatus(step, eipResults, stepPassed)

	return createStepResult(step, status, eipResults)
}

/**
 * Step 4: Check Network
 * Tests EIP-1193 chain methods and EIP-2700 EventEmitter
 */
export async function runStep4Network(step: TestStep, ctx: EIPTestContext): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []

	const provider = getProviderFromContext(ctx)

	if (!provider) {
		return createStepResult(step, 'failed', [], 'No provider found')
	}

	// EIP-1193 checks
	const eip1193Checks: EIPCheckResult[] = []

	// Get chain ID
	let chainIdPassed = false
	let chainIdDetail = ''
	let chainChangedListener: (() => void) | null = null

	try {
		const chainIdHex = await provider.request({ method: 'eth_chainId' })

		if (typeof chainIdHex === 'string') {
			const chainId = parseInt(chainIdHex, 16)

			ctx.setChainId(chainId)
			chainIdPassed = true
			chainIdDetail = `Chain ID: ${chainId} (${chainIdHex})`
		}
	} catch (error) {
		chainIdDetail = error instanceof Error ? error.message : 'Failed to get chain ID'
	}

	eip1193Checks.push({
		id: 'eth-chainId',
		name: 'eth_chainId',
		description: 'Returns current chain ID',
		passed: chainIdPassed,
		detail: chainIdDetail,
	})

	// Check chainChanged event
	let chainEventSubscribable = false

	try {
		if (typeof provider.on === 'function') {
			chainChangedListener = () => {}
			provider.on('chainChanged', chainChangedListener)
			chainEventSubscribable = true
		}
	} catch {
		chainEventSubscribable = false
	}

	// Clean up the listener
	if (chainChangedListener && typeof provider.removeListener === 'function') {
		try {
			provider.removeListener('chainChanged', chainChangedListener)
		} catch {
			// Ignore cleanup errors
		}
	}

	eip1193Checks.push({
		id: 'chainChanged-event',
		name: 'chainChanged event',
		description: 'Can subscribe to chainChanged event',
		passed: chainEventSubscribable,
	})

	eipResults.push(
		createEIPResult(
			'EIP-1193',
			'Ethereum Provider JavaScript API',
			'https://eips.ethereum.org/EIPS/eip-1193',
			eip1193Checks,
		),
	)

	// EIP-2700 EventEmitter checks
	const eip2700Checks: EIPCheckResult[] = []

	eip2700Checks.push({
		id: 'has-on',
		name: 'on() method',
		description: 'Provider implements on(eventName, listener)',
		passed: typeof provider.on === 'function',
	})

	eip2700Checks.push({
		id: 'has-removeListener',
		name: 'removeListener() method',
		description: 'Provider implements removeListener(eventName, listener)',
		passed: typeof provider.removeListener === 'function',
	})

	eip2700Checks.push({
		id: 'has-once',
		name: 'once() method',
		description: 'Provider implements once(eventName, listener)',
		passed: typeof provider.once === 'function',
	})

	eip2700Checks.push({
		id: 'has-removeAllListeners',
		name: 'removeAllListeners() method',
		description: 'Provider implements removeAllListeners([eventName])',
		passed: typeof provider.removeAllListeners === 'function',
	})

	eipResults.push(
		createEIPResult(
			'EIP-2700',
			'JavaScript Provider Event Emitter',
			'https://eips.ethereum.org/EIPS/eip-2700',
			eip2700Checks,
		),
	)

	// Step passes if chain ID was retrieved
	const status = determineStepStatus(step, eipResults, chainIdPassed)

	return createStepResult(step, status, eipResults)
}

/**
 * Step 5: Send Batch Calls
 * Tests EIP-5792 wallet_sendCalls
 */
export async function runStep5BatchSend(step: TestStep, ctx: EIPTestContext): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []
	const eip5792Checks: EIPCheckResult[] = []

	const provider = getProviderFromContext(ctx)

	if (!provider) {
		return createStepResult(step, 'failed', [], 'No provider found')
	}

	const connectedAddress = ctx.getConnectedAddress() || ctx.getAccountAddress()

	if (!connectedAddress) {
		return createStepResult(step, 'failed', [], 'No connected address')
	}

	const chainId = ctx.getChainId()

	// Check wallet_getCapabilities
	let capabilitiesPassed = false
	let atomicitySupported = false
	let capabilitiesDetail = ''
	let detectedVersion: string | null = null

	try {
		const capabilities = await provider.request({
			method: 'wallet_getCapabilities',
			params: [connectedAddress],
		})

		if (isRecord(capabilities)) {
			capabilitiesPassed = true
			capabilitiesDetail = 'Capabilities retrieved'

			// Check atomicity for current chain
			const chainIdHex = chainId ? `0x${chainId.toString(16)}` : '0x1'
			const chainCapabilities = capabilities[chainIdHex]

			if (isRecord(chainCapabilities)) {
				const atomicBatch = chainCapabilities['atomicBatch']

				if (isRecord(atomicBatch)) {
					atomicitySupported = atomicBatch['supported'] === true
				}

				// Check for version support in capabilities
				const sendCalls = chainCapabilities['wallet_sendCalls']

				if (isRecord(sendCalls) && Array.isArray(sendCalls['supportedVersions'])) {
					const rawVersions = sendCalls['supportedVersions']
					// Validate that all elements are strings
					const versions = rawVersions.filter((v): v is string => typeof v === 'string')

					if (versions.includes('2.0.0')) {
						detectedVersion = '2.0.0'
					} else if (versions.includes('1.0.0') || versions.length > 0) {
						detectedVersion = versions[0]
					}
				}
			}
		}
	} catch (error) {
		capabilitiesDetail = error instanceof Error ? error.message : 'Method not supported'
	}

	eip5792Checks.push({
		id: 'has-getCapabilities',
		name: 'wallet_getCapabilities',
		description: 'Provider implements wallet_getCapabilities method',
		passed: capabilitiesPassed,
		detail: capabilitiesDetail,
	})

	eip5792Checks.push({
		id: 'atomicity-support',
		name: 'Atomicity support',
		description: 'Wallet declares atomicBatch capability',
		passed: atomicitySupported,
		detail: atomicitySupported ? 'Atomic batching supported' : 'Not supported or not declared',
	})

	// Actually send batched calls - try v2.0.0 first, fallback to v1.0.0 if needed
	let sendCallsPassed = false
	let sendCallsDetail = ''
	let usedVersion = detectedVersion || '2.0.0'

	// Helper to send calls with a specific version format
	const trySendCalls = async (version: string): Promise<string | null> => {
		const chainIdHex = chainId ? `0x${chainId.toString(16)}` : '0x1'

		// v2.0.0 format includes version and atomicRequired fields
		// v1.0.0 format is simpler without these fields
		const params =
			version === '2.0.0'
				? {
						version: '2.0.0',
						chainId: chainIdHex,
						from: connectedAddress,
						atomicRequired: false,
						calls: [
							{
								to: '0x0000000000000000000000000000000000000000',
								data: '0x00',
								value: '0x0',
							},
						],
					}
				: {
						// v1.0.0 format (no version field, no atomicRequired)
						chainId: chainIdHex,
						from: connectedAddress,
						calls: [
							{
								to: '0x0000000000000000000000000000000000000000',
								data: '0x',
								value: '0x0',
							},
						],
					}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		const result = (await provider.request({
			method: 'wallet_sendCalls',
			params: [params],
		})) as string | { id: string }

		if (typeof result === 'string') {
			return result
		} else if (result && typeof result === 'object' && 'id' in result) {
			return result.id
		}

		return null
	}

	try {
		// Try with preferred version first
		let batchId = await trySendCalls(usedVersion)

		// If v2.0.0 fails with version error, try v1.0.0
		if (!batchId && usedVersion === '2.0.0') {
			try {
				usedVersion = '1.0.0'
				batchId = await trySendCalls('1.0.0')
			} catch {
				// v1.0.0 fallback also failed, will report original error
			}
		}

		if (batchId) {
			sendCallsPassed = true
			ctx.setBatchId(batchId)
			sendCallsDetail = `Batch ID: ${batchId.slice(0, 16)}... (v${usedVersion})`
		} else {
			sendCallsDetail = 'Unexpected response format from wallet_sendCalls'
		}
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error'

		// If v2.0.0 fails, try v1.0.0 fallback
		if (
			usedVersion === '2.0.0' &&
			(errorMsg.toLowerCase().includes('version') ||
				errorMsg.toLowerCase().includes('invalid') ||
				errorMsg.toLowerCase().includes('unsupported'))
		) {
			try {
				usedVersion = '1.0.0'
				const batchId = await trySendCalls('1.0.0')

				if (batchId) {
					sendCallsPassed = true
					ctx.setBatchId(batchId)
					sendCallsDetail = `Batch ID: ${batchId.slice(0, 16)}... (v1.0.0 fallback)`
				}
			} catch (fallbackError) {
				const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'

				sendCallsDetail = `v2.0.0 failed, v1.0.0 fallback also failed: ${fallbackMsg}`
			}
		}

		if (!sendCallsPassed) {
			// Check if it's a user rejection vs method not supported
			if (errorMsg.toLowerCase().includes('reject') || errorMsg.toLowerCase().includes('denied')) {
				sendCallsDetail = 'User rejected the transaction'
			} else if (
				errorMsg.toLowerCase().includes('not supported') ||
				errorMsg.toLowerCase().includes('not implemented')
			) {
				sendCallsDetail = 'wallet_sendCalls not supported by this wallet'
			} else {
				sendCallsDetail = errorMsg
			}
		}
	}

	eip5792Checks.push({
		id: 'has-sendCalls',
		name: 'wallet_sendCalls',
		description: 'Successfully sends batched calls and returns batch ID',
		passed: sendCallsPassed,
		detail: sendCallsDetail,
	})

	eipResults.push(
		createEIPResult(
			'EIP-5792',
			'Wallet Function Call API',
			'https://eips.ethereum.org/EIPS/eip-5792',
			eip5792Checks,
		),
	)

	const status = determineStepStatus(step, eipResults, sendCallsPassed)

	return createStepResult(step, status, eipResults)
}

/**
 * Response structure for wallet_getCallsStatus per EIP-5792
 */
interface CallsStatusReceipt {
	logs?: unknown[]
	status?: string
	chainId?: string
	blockHash?: string
	blockNumber?: string
	gasUsed?: string
	transactionHash?: string
}

interface CallsStatusResponse {
	status: number | string
	receipts?: CallsStatusReceipt[]
	version?: string
	atomic?: boolean
	id?: unknown
}

/**
 * Step 6: Check Batch Status
 * Tests EIP-5792 wallet_getCallsStatus
 */
export async function runStep6BatchStatus(
	step: TestStep,
	ctx: EIPTestContext,
): Promise<StepResult> {
	const eipResults: EIPTestResult[] = []
	const eip5792Checks: EIPCheckResult[] = []

	const provider = getProviderFromContext(ctx)

	if (!provider) {
		return createStepResult(step, 'failed', [], 'No provider found')
	}

	const batchId = ctx.getBatchId()

	if (!batchId) {
		return createStepResult(step, 'failed', [], 'No batch ID from previous step')
	}

	// Check wallet_getCallsStatus
	let statusPassed = false
	let statusDetail = ''
	let validResponse = false
	let hasAtomicField = false
	let hasValidReceipts = false
	let atomicDetail = ''
	let receiptsDetail = ''

	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		const status = (await provider.request({
			method: 'wallet_getCallsStatus',
			params: [batchId],
		})) as CallsStatusResponse

		statusPassed = true

		// EIP-5792 v2.0.0 uses numeric status codes (like HTTP: 200 = success)
		// Earlier versions used string status ("CONFIRMED", "PENDING", etc.)
		if (typeof status.status === 'number') {
			statusDetail = `Status: ${status.status} (${status.status >= 200 && status.status < 300 ? 'success' : 'pending/failed'})`
			validResponse = true
		} else if (typeof status.status === 'string') {
			statusDetail = `Status: ${status.status}`
			validResponse = true
		} else {
			statusDetail = 'Status field missing or invalid type'
			validResponse = false
		}

		// Check for atomic field (EIP-5792 MUST include this)
		// For atomicMultiTransactions feature, we need atomic to be true
		if ('atomic' in status && typeof status.atomic === 'boolean') {
			hasAtomicField = status.atomic === true
			atomicDetail = status.atomic
				? 'Batch executed atomically'
				: 'Batch executed non-atomically (atomic: false)'
		} else {
			atomicDetail = 'Atomic field missing or invalid type'
		}

		// Check for valid receipts array structure
		if (Array.isArray(status.receipts)) {
			if (status.receipts.length > 0) {
				// Validate first receipt has expected fields
				const firstReceipt = status.receipts[0]
				const hasRequiredFields =
					firstReceipt &&
					typeof firstReceipt === 'object' &&
					('transactionHash' in firstReceipt || 'status' in firstReceipt)

				if (hasRequiredFields) {
					hasValidReceipts = true
					receiptsDetail = `${status.receipts.length} receipt(s) with valid structure`
				} else {
					receiptsDetail = 'Receipts missing required fields (transactionHash, status)'
				}
			} else {
				// Empty array is valid for pending transactions
				hasValidReceipts = true
				receiptsDetail = 'Empty receipts array (transaction may be pending)'
			}
		} else {
			receiptsDetail = 'Receipts field missing or not an array'
		}
	} catch (error) {
		statusDetail = error instanceof Error ? error.message : 'Failed to get status'
	}

	eip5792Checks.push({
		id: 'has-getCallsStatus',
		name: 'wallet_getCallsStatus',
		description: 'Successfully retrieves batch status',
		passed: statusPassed,
		detail: statusDetail,
	})

	eip5792Checks.push({
		id: 'valid-status-response',
		name: 'Valid status response',
		description: 'Status response includes status field (number or string)',
		passed: validResponse,
	})

	eip5792Checks.push({
		id: 'atomic-batch-execution',
		name: 'Atomic batch execution',
		description: 'Wallet executes batches atomically (all-or-nothing)',
		passed: hasAtomicField,
		detail: atomicDetail,
	})

	eip5792Checks.push({
		id: 'valid-receipts',
		name: 'Valid receipts array',
		description: 'Response includes receipts array with transaction receipt fields',
		passed: hasValidReceipts,
		detail: receiptsDetail,
	})

	// Test wallet_showCallsStatus (optional)
	let showStatusPassed = false

	try {
		await provider.request({
			method: 'wallet_showCallsStatus',
			params: [batchId],
		})
		showStatusPassed = true
	} catch {
		showStatusPassed = false
	}

	eip5792Checks.push({
		id: 'has-showCallsStatus',
		name: 'wallet_showCallsStatus',
		description: 'Provider implements wallet_showCallsStatus (optional)',
		passed: showStatusPassed,
		detail: showStatusPassed ? 'Supported' : 'Not supported (optional)',
	})

	eipResults.push(
		createEIPResult(
			'EIP-5792',
			'Wallet Function Call API',
			'https://eips.ethereum.org/EIPS/eip-5792',
			eip5792Checks,
		),
	)

	const status = determineStepStatus(step, eipResults, statusPassed)

	return createStepResult(step, status, eipResults)
}
