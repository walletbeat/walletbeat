import { createStore, type EIP1193Provider, type EIP6963ProviderDetail } from 'mipd'
import {
	type Address,
	concatHex,
	createWalletClient,
	custom,
	type Hex,
	hexToBytes,
	isAddress,
	keccak256,
	numberToHex,
} from 'viem'
import { sendCalls, sendTransaction, signMessage, switchChain } from 'viem/actions'
import { mainnet } from 'viem/chains'

import { getBaseUrl } from '@/base-url'
import {
	WALLETBEAT_TEST_CONTRACT,
	WALLETBEAT_TEST_ERC20,
	WALLETBEAT_TEST_ERC721,
	WALLETBEAT_TEST_ERC1155,
	ZERO_ADDRESS,
} from '@/constants/test-contracts'
import { type StepResult, type StepStatus, testSteps } from '@/constants/test-eip-support'
import { type ScamAlertTest, scamAlertTests } from '@/constants/test-scam-alerts'
import {
	type TestSignature,
	testSignatures,
	type TestTransaction,
	testTransactions,
} from '@/constants/test-transactions-signatures'
import {
	createStepResult,
	type EIPTestContext,
	runStep1Detection,
	runStep2Connect,
	runStep3Account,
	runStep4Network,
	runStep5BatchSend,
	runStep6BatchStatus,
} from '@/lib/eip-test-runners'
import { getErrorMessage } from '@/types/errors'
import { type Eip712TypeMap, hashStruct, hashTypedData } from '@/types/utils/eip712'
import { assertTransactionId } from '@/types/utils/ethereum-types'
import { isRecord } from '@/types/utils/record'

type TabId =
	| 'transactions'
	| 'signatures'
	| 'eip-support'
	| 'app-isolation'
	| 'tx-simulations'
	| 'scam-alerts'
	| 'erc-8213'

type AppIsolationId = 'eth-accounts' | 'wallet-connect'
type Erc8213Id = 'calldata' | 'eip712'

type Eip712DigestResult = {
	domainSeparator: Hex
	messageHash: Hex
	fullDigest: Hex
	primaryType: string
}

type Eip712DigestInput = {
	domain: Record<string, unknown>
	message: Record<string, unknown>
	primaryType: string
	types: Eip712TypeMap
}

type SimulationId =
	| 'erc20-mint'
	| 'erc721-mint'
	| 'erc1155-mint'
	| 'erc20-transfer'
	| 'erc721-transfer'
	| 'erc1155-transfer'
	| 'all-token-transfer'
	| 'misleading-selector'
	| 'fake-airdrop'
	| 'volatile-outcome'
	| 'failing-transaction'

type NavItem = {
	id: string
	title: string
	description?: string
	status?: StepStatus | 'done'
}

type PlaygroundState = {
	providers: readonly EIP6963ProviderDetail[]
	selectedProviderUuid: string | null
	account: Address | null
	chainId: number | null
	tab: TabId
	selectedTx: string
	selectedSignature: string
	selectedScam: string
	selectedAppIsolation: AppIsolationId
	selectedSimulation: SimulationId
	selectedErc8213: Erc8213Id
	stepIndex: number
	hashes: Record<string, Hex>
	batchIds: Record<string, string>
	signatures: Record<string, Hex>
	appIsolationResults: Partial<Record<AppIsolationId, string>>
	pendingId: string | null
	error: string
	scamDisclaimerAccepted: boolean
	stepResults: Record<string, StepResult>
	eipStatus: 'idle' | 'in_progress' | 'completed' | 'failed'
	eipSelectedProviderId: string | null
	eipConnectedAddress: string | null
	eipChainId: number | null
	eipBatchId: string | null
	erc20To: string
	erc721From: string
	erc721To: string
	erc721TokenId: string
	erc1155From: string
	erc1155To: string
	erc1155TokenId: string
	calldataInput: string
	calldataDigest: Hex | null
	calldataError: string
	eip712Json: string
	eip712Digest: Eip712DigestResult | null
	eip712Error: string
}

const store = createStore()

const simulationLabels: Record<SimulationId, { title: string; description: string }> = {
	'erc20-mint': {
		title: 'ERC-20 Mint',
		description: 'Deterministic 100-token ERC-20 mint',
	},
	'erc721-mint': {
		title: 'ERC-721 Mint',
		description: 'Deterministic single NFT mint',
	},
	'erc1155-mint': {
		title: 'ERC-1155 Mint',
		description: 'Deterministic single token mint',
	},
	'erc20-transfer': {
		title: 'ERC-20 Transfer',
		description: 'transfer() 1 token to caller address',
	},
	'erc721-transfer': {
		title: 'ERC-721 Transfer',
		description: 'safeTransferFrom() token #1 from/to caller',
	},
	'erc1155-transfer': {
		title: 'ERC-1155 Transfer',
		description: 'safeTransferFrom() 1 unit of token #1 from/to caller',
	},
	'all-token-transfer': {
		title: 'All Token Transfer',
		description: 'Mints ERC-20, ERC-721, and ERC-1155 in one tx',
	},
	'misleading-selector': {
		title: 'Misleading Selector',
		description: 'transfer() selector that actually mints to caller',
	},
	'fake-airdrop': {
		title: 'Fake Airdrop',
		description: 'Burns balance, emits fake mint event',
	},
	'volatile-outcome': {
		title: 'Volatile Outcome',
		description: 'Mints or burns depending on block number',
	},
	'failing-transaction': {
		title: 'Failing Transaction',
		description: 'Always reverts unconditionally',
	},
}

const state: PlaygroundState = {
	providers: [],
	selectedProviderUuid: null,
	account: null,
	chainId: null,
	tab: 'transactions',
	selectedTx: testTransactions[0]?.id ?? '',
	selectedSignature: testSignatures[0]?.id ?? '',
	selectedScam: scamAlertTests[0]?.id ?? '',
	selectedAppIsolation: 'eth-accounts',
	selectedSimulation: 'erc20-mint',
	selectedErc8213: 'calldata',
	stepIndex: 0,
	hashes: {},
	batchIds: {},
	signatures: {},
	appIsolationResults: {},
	pendingId: null,
	error: '',
	scamDisclaimerAccepted: false,
	stepResults: {},
	eipStatus: 'idle',
	eipSelectedProviderId: null,
	eipConnectedAddress: null,
	eipChainId: null,
	eipBatchId: null,
	erc20To: '',
	erc721From: '',
	erc721To: '',
	erc721TokenId: '1',
	erc1155From: '',
	erc1155To: '',
	erc1155TokenId: '1',
	calldataInput:
		'0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000000f4240',
	calldataDigest: null,
	calldataError: '',
	eip712Json: `{
  "types": {
    "Person": [
      { "name": "name", "type": "string" },
      { "name": "wallet", "type": "address" }
    ],
    "Mail": [
      { "name": "from", "type": "Person" },
      { "name": "to", "type": "Person" },
      { "name": "contents", "type": "string" }
    ]
  },
  "domain": {
    "name": "Ether Mail",
    "version": "1",
    "chainId": 1,
    "verifyingContract": "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
  },
  "primaryType": "Mail",
  "message": {
    "from": { "name": "Cow", "wallet": "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
    "to": { "name": "Bob", "wallet": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
    "contents": "Hello, Bob!"
  }
}`,
	eip712Digest: null,
	eip712Error: '',
}

const tabId = (value: string): TabId | null =>
	value === 'transactions' ||
	value === 'signatures' ||
	value === 'eip-support' ||
	value === 'app-isolation' ||
	value === 'tx-simulations' ||
	value === 'scam-alerts' ||
	value === 'erc-8213'
		? value
		: null

const simulationId = (value: string): SimulationId | null =>
	value === 'erc20-mint' ||
	value === 'erc721-mint' ||
	value === 'erc1155-mint' ||
	value === 'erc20-transfer' ||
	value === 'erc721-transfer' ||
	value === 'erc1155-transfer' ||
	value === 'all-token-transfer' ||
	value === 'misleading-selector' ||
	value === 'fake-airdrop' ||
	value === 'volatile-outcome' ||
	value === 'failing-transaction'
		? value
		: null

const isEip712TypeMap = (value: unknown): value is Eip712TypeMap =>
	isRecord(value) &&
	Object.values(value).every(
		fields =>
			Array.isArray(fields) &&
			fields.every(
				field =>
					isRecord(field) && typeof field.name === 'string' && typeof field.type === 'string',
			),
	)

const isEip712DigestInput = (value: unknown): value is Eip712DigestInput =>
	isRecord(value) &&
	isRecord(value.domain) &&
	isRecord(value.message) &&
	typeof value.primaryType === 'string' &&
	isEip712TypeMap(value.types)

const isEip1193Provider = (value: unknown): value is EIP1193Provider =>
	isRecord(value) &&
	typeof value.request === 'function' &&
	typeof value.on === 'function' &&
	typeof value.removeListener === 'function'

const escapeHtml = (value: unknown): string =>
	String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')

const stringify = (value: unknown): string =>
	JSON.stringify(
		value,
		(_key, item: unknown) => (typeof item === 'bigint' ? item.toString() : item),
		2,
	) ?? ''

const shortAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`

const isHex = (value: unknown): value is Hex =>
	typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value)

const isAddressString = (value: string): value is Address => isAddress(value)

const activeProviderDetail = (): EIP6963ProviderDetail | null =>
	state.providers.find(({ info }) => info.uuid === state.selectedProviderUuid) ??
	state.providers[0] ??
	null

const provider = (): EIP1193Provider | null => {
	const selected = activeProviderDetail()

	if (selected) {
		return selected.provider
	}

	const windowProvider: unknown = 'ethereum' in window ? window.ethereum : undefined

	if (isEip1193Provider(windowProvider)) {
		return windowProvider
	}

	return null
}

const walletClient = () => {
	const selectedProvider = provider()

	if (!selectedProvider || !state.account) {
		return null
	}

	return createWalletClient({
		account: state.account,
		chain: mainnet,
		transport: custom(selectedProvider),
	})
}

const setText = (selector: string, value: string): void => {
	const element = document.querySelector(selector)

	if (element) {
		element.textContent = value
	}
}

const showDialog = (id: string): void => {
	const dialog = document.getElementById(id)

	if (dialog instanceof HTMLDialogElement && !dialog.open) {
		dialog.showModal()
	}
}

const closeDialog = (id: string): void => {
	const dialog = document.getElementById(id)

	if (dialog instanceof HTMLDialogElement && dialog.open) {
		dialog.close()
	}
}

const codeBlock = (label: string, value: unknown, options: { wrap?: boolean } = {}): string => `
	<dl data-column="gap-1">
		<div>
			<dt>${escapeHtml(label)}</dt>
			<dd><pre tabindex="0"${options.wrap === true ? ' data-code-block="wrap"' : ''}><code>${escapeHtml(value)}</code></pre></dd>
		</div>
	</dl>
`

const warning = (text: string): string => `
	<div data-card="secondary radius-4 padding-3">
		<p>${escapeHtml(text)}</p>
	</div>
`

const actionButton = (action: string, label: string, disabled = false): string =>
	`<button type="button" data-action="${escapeHtml(action)}"${disabled ? ' disabled' : ''}>${escapeHtml(label)}</button>`

const selectedProviderInfo = (): string => {
	const selected = activeProviderDetail()

	return selected ? `${selected.info.name} (${selected.info.rdns})` : 'Browser injected provider'
}

const readAccount = async (): Promise<void> => {
	const selectedProvider = provider()

	if (!selectedProvider) {
		state.account = null
		state.chainId = null

		return
	}

	const accounts = await selectedProvider.request({ method: 'eth_accounts' })
	const chainId = await selectedProvider.request({ method: 'eth_chainId' })

	if (Array.isArray(accounts) && typeof accounts[0] === 'string' && isAddressString(accounts[0])) {
		state.account = accounts[0]
	} else {
		state.account = null
	}

	if (typeof chainId === 'string') {
		state.chainId = Number.parseInt(chainId, 16)
	}
}

const connect = async (providerUuid = state.selectedProviderUuid): Promise<void> => {
	if (providerUuid !== null) {
		state.selectedProviderUuid = providerUuid
	}

	const selectedProvider = provider()

	if (!selectedProvider) {
		throw new Error('No wallet provider available')
	}

	const accounts = await selectedProvider.request({ method: 'eth_requestAccounts' })

	if (
		!Array.isArray(accounts) ||
		typeof accounts[0] !== 'string' ||
		!isAddressString(accounts[0])
	) {
		throw new Error('Wallet did not return a valid account')
	}

	state.account = accounts[0]
	await readAccount()
}

const switchMainnet = async (): Promise<void> => {
	const client = walletClient()

	if (!client) {
		throw new Error('Connect a wallet first')
	}

	await switchChain(client, { id: mainnet.id })
	await readAccount()
}

const ensureMainnet = (): boolean => {
	if (state.chainId === mainnet.id) {
		return true
	}

	showDialog('chain-dialog')

	return false
}

const runAction = async (callback: () => Promise<void> | void): Promise<void> => {
	state.error = ''
	render()

	try {
		await callback()
	} catch (error) {
		state.error = getErrorMessage(error)
		showDialog('error-dialog')
	} finally {
		state.pendingId = null
		render()
	}
}

const formatValue = (value: string, type: string): string => {
	if (type !== 'uint256' || value.length <= 10) {
		return value
	}

	try {
		const ether = Number(BigInt(value)) / 1e18

		return ether >= 0.0001 ? `${value} (${ether.toFixed(4)} ETH)` : value
	} catch {
		return value
	}
}

const currentSignature = (): TestSignature => {
	const signature =
		testSignatures.find(item => item.id === state.selectedSignature) ?? testSignatures[0]

	if (signature.id !== 'siwe-1' || signature.type !== 'message') {
		return signature
	}

	const address = state.account ?? ZERO_ADDRESS
	const baseUrl = getBaseUrl()

	return {
		...signature,
		message: `${baseUrl}/ wants you to sign in with your Ethereum account:
${address}

Sign in to authenticate your wallet. This is a test SIWE message.

URI: ${baseUrl}/
Version: 1
Chain ID: 1
Nonce: ${Math.random().toString(36).slice(2, 15)}
Issued At: ${new Date().toISOString()}`,
	}
}

const currentScamAlert = (): ScamAlertTest =>
	scamAlertTests.find(item => item.id === state.selectedScam) ?? scamAlertTests[0]

const scamAlertForSigning = (test: ScamAlertTest): ScamAlertTest => {
	if (test.id !== 'allow-infinite-permit' || test.messageData === undefined) {
		return test
	}

	return {
		...test,
		messageData: {
			...test.messageData,
			owner: state.account ?? ZERO_ADDRESS,
		},
	}
}

const padAddress = (address: string): string =>
	address.toLowerCase().replace('0x', '').padStart(64, '0')

const padUint = (value: bigint): string => value.toString(16).padStart(64, '0')

const safeUint = (value: string, fallback: bigint): bigint => {
	try {
		return BigInt(value)
	} catch {
		return fallback
	}
}

const simulationTransaction = (): TestTransaction => {
	const account = state.account ?? ZERO_ADDRESS
	const erc20To = isAddressString(state.erc20To) ? state.erc20To : ZERO_ADDRESS
	const erc721From = isAddressString(state.erc721From) ? state.erc721From : account
	const erc721To = isAddressString(state.erc721To) ? state.erc721To : ZERO_ADDRESS
	const erc1155From = isAddressString(state.erc1155From) ? state.erc1155From : account
	const erc1155To = isAddressString(state.erc1155To) ? state.erc1155To : ZERO_ADDRESS

	const simulations: Record<SimulationId, TestTransaction> = {
		'erc20-mint': {
			id: 'erc20-mint',
			name: 'ERC-20 Mint',
			function: 'mintHundred()',
			parameters: [],
			description:
				'Mints exactly 100 tokens (100e18) to the caller via mintHundred(). Deterministic: the simulation result should always match execution.',
			contractAddress: WALLETBEAT_TEST_ERC20,
			calldata: '0x4838e647',
		},
		'erc721-mint': {
			id: 'erc721-mint',
			name: 'ERC-721 Mint',
			function: 'mintOne()',
			parameters: [],
			description:
				'Mints exactly one ERC-721 NFT to the caller via mintOne(). Deterministic: the simulation result should always match execution.',
			contractAddress: WALLETBEAT_TEST_ERC721,
			calldata: '0x0ced8637',
		},
		'erc1155-mint': {
			id: 'erc1155-mint',
			name: 'ERC-1155 Mint',
			function: 'mintOne()',
			parameters: [],
			description:
				'Mints exactly one ERC-1155 token to the caller via mintOne(). Deterministic: the simulation result should always match execution.',
			contractAddress: WALLETBEAT_TEST_ERC1155,
			calldata: '0x0ced8637',
		},
		'erc20-transfer': {
			id: 'erc20-transfer',
			name: 'ERC-20 Transfer',
			function: 'transfer(address to,uint256 amount)',
			parameters: [],
			description:
				'Transfers 1 token (1e18) to a specified address. Tests how the wallet displays an ERC-20 transfer in its simulation.',
			contractAddress: WALLETBEAT_TEST_ERC20,
			calldata: assertTransactionId(
				`0xa9059cbb${padAddress(erc20To)}${padUint(1_000_000_000_000_000_000n)}`,
			),
		},
		'erc721-transfer': {
			id: 'erc721-transfer',
			name: 'ERC-721 Transfer',
			function: 'safeTransferFrom(address from,address to,uint256 tokenId)',
			parameters: [],
			description:
				'Safe-transfers an ERC-721 NFT to a specified address. Tests how the wallet displays an NFT transfer in its simulation.',
			contractAddress: WALLETBEAT_TEST_ERC721,
			calldata: assertTransactionId(
				`0x42842e0e${padAddress(erc721From)}${padAddress(erc721To)}${padUint(safeUint(state.erc721TokenId, 1n))}`,
			),
		},
		'erc1155-transfer': {
			id: 'erc1155-transfer',
			name: 'ERC-1155 Transfer',
			function: 'safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)',
			parameters: [],
			description:
				'Safe-transfers 1 unit of an ERC-1155 token to a specified address. Tests how the wallet displays a semi-fungible transfer in its simulation.',
			contractAddress: WALLETBEAT_TEST_ERC1155,
			calldata: assertTransactionId(
				`0xf242432a${padAddress(erc1155From)}${padAddress(erc1155To)}${padUint(safeUint(state.erc1155TokenId, 1n))}${padUint(1n)}${padUint(160n)}${padUint(0n)}`,
			),
		},
		'all-token-transfer': {
			id: 'all-token-transfer',
			name: 'All Token Transfer',
			function: 'simulateFunctionV1()',
			parameters: [],
			description:
				'Mints ERC-20, ERC-721, and ERC-1155 tokens to the caller in a single transaction via simulateFunctionV1(). Tests whether the wallet correctly shows all three asset types in its simulation.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0xf88a1a98',
		},
		'misleading-selector': {
			id: 'misleading-selector',
			name: 'Misleading Selector',
			function: 'transfer(address,uint256)',
			parameters: [],
			description:
				'Uses the standard ERC-20 transfer() selector on a contract that actually mints tokens to the caller. Tests whether wallets simulate actual behavior or assume behavior from the function signature.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata:
				'0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		},
		'fake-airdrop': {
			id: 'fake-airdrop',
			name: 'Fake Airdrop',
			function: 'claim()',
			parameters: [],
			description:
				"Burns the caller's entire ERC-20 balance while emitting a Transfer(0x0 to caller) event to suggest a mint.",
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0x4e71d92d',
		},
		'volatile-outcome': {
			id: 'volatile-outcome',
			name: 'Volatile Outcome',
			function: 'simulateFunctionV2()',
			parameters: [],
			description:
				'Calls a function that mints tokens on even blocks and burns all tokens on odd blocks.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0xa79c3153',
		},
		'failing-transaction': {
			id: 'failing-transaction',
			name: 'Failing Transaction',
			function: 'alwaysFails()',
			parameters: [],
			description: 'Always reverts unconditionally via alwaysFails().',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0x128e6c37',
		},
	}

	return simulations[state.selectedSimulation]
}

const currentTransaction = (): TestTransaction =>
	state.tab === 'tx-simulations'
		? simulationTransaction()
		: (testTransactions.find(item => item.id === state.selectedTx) ?? testTransactions[0])

const sendTestTransaction = async (tx: TestTransaction): Promise<void> => {
	const client = walletClient()

	if (!client || !state.account) {
		throw new Error('Connect a wallet first')
	}

	if (!ensureMainnet()) {
		return
	}

	state.pendingId = tx.id

	if (tx.calls && tx.calls.length > 0) {
		const result = await sendCalls(client, {
			account: state.account,
			chain: mainnet,
			calls: tx.calls.map(call => ({
				to: call.to,
				data: call.data,
				value: call.value,
			})),
		})

		state.batchIds[tx.id] = result.id
		state.hashes[tx.id] = assertTransactionId(result.id)

		return
	}

	if (!tx.contractAddress) {
		throw new Error('Contract address is required for this transaction')
	}

	const hash = await sendTransaction(client, {
		account: state.account,
		chain: mainnet,
		to: tx.contractAddress,
		data: tx.calldata,
		value: tx.value,
	})

	state.hashes[tx.id] = hash
}

const signSelectedSignature = async (): Promise<void> => {
	const client = walletClient()
	const sig = currentSignature()

	if (!client || !state.account) {
		throw new Error('Connect a wallet first')
	}

	state.pendingId = sig.id

	if (sig.type === 'message') {
		if (!sig.message) {
			throw new Error('Missing message')
		}

		state.signatures[sig.id] = await signMessage(client, {
			account: state.account,
			message: sig.message,
		})

		return
	}

	const selectedProvider = provider()

	if (!selectedProvider || !sig.domain || !sig.types || !sig.primaryType || !sig.messageData) {
		throw new Error('Missing typed data fields')
	}

	const result = await selectedProvider.request({
		method: 'eth_signTypedData_v4',
		params: [
			state.account,
			stringify({
				domain: sig.domain,
				message: sig.messageData,
				primaryType: sig.primaryType,
				types: sig.types,
			}),
		],
	})

	if (!isHex(result)) {
		throw new Error('Wallet returned an invalid signature')
	}

	state.signatures[sig.id] = result
}

const sendScam = async (): Promise<void> => {
	const test = currentScamAlert()
	const contractAddress = test.customAddress
		? getInputValue('[data-scam-custom-address]')
		: test.contractAddress

	if (!isAddressString(contractAddress)) {
		throw new Error('Enter a valid Ethereum address')
	}

	await sendTestTransaction({
		id: test.id,
		name: test.name,
		function: test.testType,
		parameters: [],
		calldata: test.calldata,
		contractAddress,
		value: test.value,
	})
}

const signScam = async (): Promise<void> => {
	const selectedProvider = provider()
	const test = scamAlertForSigning(currentScamAlert())

	if (!selectedProvider || !state.account) {
		throw new Error('Connect a wallet first')
	}

	if (!test.domain || !test.types || !test.primaryType || !test.messageData) {
		throw new Error('Missing typed data fields')
	}

	state.pendingId = test.id
	const result = await selectedProvider.request({
		method: 'eth_signTypedData_v4',
		params: [
			state.account,
			stringify({
				domain: test.domain,
				message: test.messageData,
				primaryType: test.primaryType,
				types: test.types,
			}),
		],
	})

	if (!isHex(result)) {
		throw new Error('Wallet returned an invalid signature')
	}

	state.signatures[test.id] = result
}

const getInputValue = (selector: string): string => {
	const element = document.querySelector(selector)

	return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
		? element.value.trim()
		: ''
}

const createEipContext = (): EIPTestContext => ({
	getDiscoveredProviders: () =>
		state.providers.map(({ info, provider: discoveredProvider }) => ({
			icon: info.icon,
			name: info.name,
			provider: discoveredProvider,
			rdns: info.rdns,
			uuid: info.uuid,
		})),
	getSelectedProviderId: () => state.eipSelectedProviderId ?? state.selectedProviderUuid,
	getConnectedAddress: () => state.eipConnectedAddress,
	getChainId: () => state.eipChainId,
	getBatchId: () => state.eipBatchId,
	getAccountAddress: () => state.account ?? undefined,
	setSelectedProviderId: id => {
		state.eipSelectedProviderId = id
		state.selectedProviderUuid = id
	},
	setConnectedAddress: address => {
		state.eipConnectedAddress = address

		if (isAddressString(address)) {
			state.account = address
		}
	},
	setChainId: chainId => {
		state.eipChainId = chainId
		state.chainId = chainId
	},
	setBatchId: batchId => {
		state.eipBatchId = batchId
	},
})

const canRunStep = (index: number): boolean => {
	if (index === 0) {
		return true
	}

	const previous = testSteps[index - 1]
	const previousStatus = state.stepResults[previous.id]?.status

	return previousStatus === 'passed' || previousStatus === 'partial' || previousStatus === 'failed'
}

const runEipStep = async (): Promise<void> => {
	const step = testSteps[state.stepIndex]

	if (!step) {
		throw new Error('No EIP step selected')
	}

	if (!canRunStep(state.stepIndex)) {
		throw new Error('Complete the previous step first')
	}

	state.eipStatus = 'in_progress'
	state.stepResults[step.id] = createStepResult(step, 'running', [])
	render()

	const context = createEipContext()
	let result: StepResult

	if (step.id === 'step-1-detection') {
		result = await runStep1Detection(step, context)
	} else if (step.id === 'step-2-connect') {
		result = await runStep2Connect(step, context)
	} else if (step.id === 'step-3-account') {
		result = await runStep3Account(step, context)
	} else if (step.id === 'step-4-network') {
		result = await runStep4Network(step, context)
	} else if (step.id === 'step-5-batch-send') {
		result = await runStep5BatchSend(step, context)
	} else if (step.id === 'step-6-batch-status') {
		result = await runStep6BatchStatus(step, context)
	} else {
		throw new Error(`Unknown step: ${step.id}`)
	}

	state.stepResults[step.id] = result

	if (state.stepIndex < testSteps.length - 1) {
		state.stepIndex += 1
		state.eipStatus = 'idle'

		return
	}

	state.eipStatus =
		result.status === 'passed' || result.status === 'partial' ? 'completed' : 'failed'
	renderEipResultsDialog()
	showDialog('eip-results-dialog')
}

const resetEipSteps = (): void => {
	state.stepIndex = 0
	state.eipStatus = 'idle'
	state.stepResults = {}
	state.eipSelectedProviderId = null
	state.eipConnectedAddress = null
	state.eipChainId = null
	state.eipBatchId = null
}

const callAppIsolation = async (method: AppIsolationId): Promise<void> => {
	const selectedProvider = provider()

	if (!selectedProvider) {
		throw new Error('Connect a wallet first')
	}

	state.pendingId = method
	const result = await selectedProvider.request(
		method === 'eth-accounts'
			? { method: 'eth_accounts' }
			: { method: 'wallet_connect', params: [{ version: '1' }] },
	)

	state.appIsolationResults[method] = stringify(result)
}

const computeCalldataDigest = (): void => {
	const input = getInputValue('[data-calldata-input]')
	const hex = input.startsWith('0x') ? input : `0x${input}`

	state.calldataInput = hex
	state.calldataDigest = null
	state.calldataError = ''

	if (!isHex(hex)) {
		state.calldataError = 'Invalid hex input, must be a 0x-prefixed hex string.'

		return
	}

	const length = hexToBytes(hex).length

	state.calldataDigest = keccak256(concatHex([numberToHex(length, { size: 32 }), hex]))
}

const computeEip712Digest = (): void => {
	state.eip712Json = getInputValue('[data-eip712-input]')
	state.eip712Digest = null
	state.eip712Error = ''

	try {
		const parsedJson: unknown = JSON.parse(state.eip712Json)

		if (!isEip712DigestInput(parsedJson)) {
			throw new Error('Typed data JSON must include domain, message, primaryType, and types')
		}

		const parsed = parsedJson
		const domainFields: { name: string; type: string }[] = []

		if (parsed.domain.name !== undefined) {
			domainFields.push({ name: 'name', type: 'string' })
		}

		if (parsed.domain.version !== undefined) {
			domainFields.push({ name: 'version', type: 'string' })
		}

		if (parsed.domain.chainId !== undefined) {
			domainFields.push({ name: 'chainId', type: 'uint256' })
		}

		if (parsed.domain.verifyingContract !== undefined) {
			domainFields.push({ name: 'verifyingContract', type: 'address' })
		}

		if (parsed.domain.salt !== undefined) {
			domainFields.push({ name: 'salt', type: 'bytes32' })
		}

		const domainSeparator = hashStruct({
			data: parsed.domain,
			primaryType: 'EIP712Domain',
			types: { EIP712Domain: domainFields },
		})
		const messageHash = hashStruct({
			data: parsed.message,
			primaryType: parsed.primaryType,
			types: parsed.types,
		})
		const fullDigest = hashTypedData({
			domain: parsed.domain,
			message: parsed.message,
			primaryType: parsed.primaryType,
			types: parsed.types,
		})

		state.eip712Digest = {
			domainSeparator,
			fullDigest,
			messageHash,
			primaryType: parsed.primaryType,
		}
	} catch (error) {
		state.eip712Error = getErrorMessage(error)
	}
}

const currentPanel = (): HTMLElement | null => {
	const panel = document.querySelector(`[data-tab-panel][data-tab="${state.tab}"]`)

	return panel instanceof HTMLElement ? panel : null
}

const selectedNav = (id: string): boolean => {
	if (state.tab === 'transactions') {
		return state.selectedTx === id
	}

	if (state.tab === 'signatures') {
		return state.selectedSignature === id
	}

	if (state.tab === 'eip-support') {
		return state.stepIndex === Number(id)
	}

	if (state.tab === 'app-isolation') {
		return state.selectedAppIsolation === id
	}

	if (state.tab === 'tx-simulations') {
		return state.selectedSimulation === id
	}

	if (state.tab === 'scam-alerts') {
		return state.selectedScam === id
	}

	return state.selectedErc8213 === id
}

const navItems = (): NavItem[] => {
	if (state.tab === 'transactions') {
		return testTransactions.map(tx => ({
			id: tx.id,
			title: tx.name,
			description: tx.description,
			status: state.hashes[tx.id] ? 'done' : undefined,
		}))
	}

	if (state.tab === 'signatures') {
		return testSignatures.map(signature => ({
			id: signature.id,
			title: signature.name,
			description: signature.description,
			status: state.signatures[signature.id] ? 'done' : undefined,
		}))
	}

	if (state.tab === 'eip-support') {
		return testSteps.map((step, index) => ({
			id: String(index),
			title: `${step.stepNumber}. ${step.name}`,
			description: step.eips.map(eip => eip.eipNumber).join(', '),
			status: state.stepResults[step.id]?.status,
		}))
	}

	if (state.tab === 'app-isolation') {
		return [
			{
				id: 'eth-accounts',
				title: 'eth_accounts',
				description: 'Which accounts does the wallet expose?',
			},
			{
				id: 'wallet-connect',
				title: 'wallet_connect',
				description: 'ERC-7846 privacy-preserving connection',
			},
		]
	}

	if (state.tab === 'tx-simulations') {
		return Object.entries(simulationLabels).map(([id, item]) => ({
			id,
			title: item.title,
			description: item.description,
			status: state.hashes[id] ? 'done' : undefined,
		}))
	}

	if (state.tab === 'scam-alerts') {
		return scamAlertTests.map(test => ({
			id: test.id,
			title: test.name,
			description: test.description,
			status: state.hashes[test.id] || state.signatures[test.id] ? 'done' : undefined,
		}))
	}

	return [
		{
			id: 'calldata',
			title: 'Calldata digest',
			description: 'keccak256 of raw transaction calldata',
		},
		{
			id: 'eip712',
			title: 'EIP-712 digest',
			description: 'Full typed-data hash',
		},
	]
}

const renderProviderDialog = (): void => {
	const list = document.querySelector('[data-provider-list]')

	if (!list) {
		return
	}

	list.innerHTML = ''

	if (state.providers.length === 0) {
		list.innerHTML = '<p>No EIP-6963 wallet providers announced yet.</p>'

		return
	}

	for (const detail of state.providers) {
		const selected = detail.info.uuid === state.selectedProviderUuid

		list.insertAdjacentHTML(
			'beforeend',
			`<button type="button" data-provider-uuid="${escapeHtml(detail.info.uuid)}">
				<img alt="" src="${escapeHtml(detail.info.icon)}">
				<span>${escapeHtml(detail.info.name)}</span>
				<code>${escapeHtml(detail.info.rdns)}</code>
				${selected ? '<span data-badge="small">Selected</span>' : ''}
			</button>`,
		)
	}
}

const renderNavigation = (): void => {
	const nav = currentPanel()?.querySelector('[data-playground-nav]')

	if (!nav) {
		return
	}

	nav.innerHTML = ''

	for (const item of navItems()) {
		const details = document.createElement('details')
		const summary = document.createElement('summary')
		const selected = selectedNav(item.id)

		details.setAttribute('name', `wallet-playground-${state.tab}`)
		details.dataset.navItem = item.id
		details.dataset.navTab = state.tab
		details.open = selected
		summary.innerHTML = `
			<span>${escapeHtml(item.title)}</span>
			${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}
			${item.status ? `<small>${escapeHtml(item.status)}</small>` : ''}
		`
		details.append(summary)

		if (selected) {
			const panel = document.createElement('div')

			panel.dataset.tabPanel = ''
			panel.dataset.playgroundDetail = ''
			details.append(panel)
		}

		nav.append(details)
	}
}

const renderAccount = (): void => {
	setText(
		'[data-account-status]',
		state.account
			? `Connected as ${shortAddress(state.account)} on chain ${state.chainId ?? 'unknown'} via ${selectedProviderInfo()}`
			: state.providers.length > 0
				? `${state.providers.length} wallet provider(s) found`
				: 'No wallet connected',
	)
}

const renderOuterTabs = (): void => {
	document.querySelectorAll('details[data-tab]').forEach(element => {
		if (!(element instanceof HTMLDetailsElement)) {
			return
		}

		const tab = element.dataset.tab

		if (tab === state.tab && !element.open) {
			element.open = true
		}
	})
}

const renderDetail = (): void => {
	const detail = currentPanel()?.querySelector('[data-playground-detail]')

	if (!detail) {
		return
	}

	if (state.tab === 'transactions') {
		detail.innerHTML = renderTransaction(currentTransaction(), 'send-transaction')
	} else if (state.tab === 'signatures') {
		detail.innerHTML = renderSignature(currentSignature())
	} else if (state.tab === 'eip-support') {
		detail.innerHTML = renderEipSupport()
	} else if (state.tab === 'app-isolation') {
		detail.innerHTML = renderAppIsolation()
	} else if (state.tab === 'tx-simulations') {
		detail.innerHTML = renderSimulation()
	} else if (state.tab === 'scam-alerts') {
		detail.innerHTML = renderScamAlert()
	} else {
		detail.innerHTML = renderErc8213()
	}
}

const renderTransaction = (tx: TestTransaction, action: string): string => {
	const hash = state.hashes[tx.id]

	return `
		<div data-card="radius-8 padding-5" data-column="gap-4">
			<header data-column="gap-1">
				<h3>${escapeHtml(tx.name)}</h3>
				${tx.description ? `<p>${escapeHtml(tx.description)}</p>` : ''}
			</header>
			${tx.requirements ? `<ul>${tx.requirements.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
			${codeBlock('Function', tx.function)}
			${tx.parameters
				.map(parameter =>
					codeBlock(
						`${parameter.name} (${parameter.type})`,
						formatValue(parameter.value, parameter.type),
						{ wrap: true },
					),
				)
				.join('')}
			${tx.calls ? codeBlock('Calls', stringify(tx.calls), { wrap: true }) : ''}
			${!tx.calls ? codeBlock('Calldata', tx.calldata, { wrap: true }) : ''}
			${tx.contractAddress ? codeBlock('Contract Address', tx.contractAddress) : ''}
			${warning('WARNING: This page is for testing only. Do not send real transactions.')}
			${actionButton(action, hash ? 'Transaction Sent' : 'Send Transaction (Testing Only)', !state.account || state.pendingId === tx.id)}
			${hash ? codeBlock('Transaction Hash', hash, { wrap: true }) : ''}
			${state.batchIds[tx.id] ? codeBlock('Batch ID', state.batchIds[tx.id], { wrap: true }) : ''}
		</div>
	`
}

const renderSignature = (sig: TestSignature): string => {
	const result = state.signatures[sig.id]

	return `
		<div data-card="radius-8 padding-5" data-column="gap-4">
			<header data-column="gap-1">
				<h3>${escapeHtml(sig.name)}</h3>
				${sig.description ? `<p>${escapeHtml(sig.description)}</p>` : ''}
			</header>
			${sig.requirements ? `<ul>${sig.requirements.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
			${codeBlock('Signature Type', sig.type === 'message' ? 'Simple Message' : 'EIP-712 Typed Data')}
			${sig.message ? codeBlock('Message', sig.message, { wrap: true }) : ''}
			${sig.domain ? codeBlock('Domain', stringify(sig.domain), { wrap: true }) : ''}
			${sig.primaryType ? codeBlock('Primary Type', sig.primaryType) : ''}
			${sig.messageData ? codeBlock('Message Data', stringify(sig.messageData), { wrap: true }) : ''}
			${warning('WARNING: Only sign messages you trust. This page is for testing and educational purposes only.')}
			${actionButton('sign', result ? 'Signature Created' : `Sign ${sig.type === 'message' ? 'Message' : 'Typed Data'}`, !state.account || state.pendingId === sig.id)}
			${result ? codeBlock('Signature', result, { wrap: true }) : ''}
		</div>
	`
}

const renderEipSupport = (): string => {
	const step = testSteps[state.stepIndex] ?? testSteps[0]
	const result = state.stepResults[step.id]
	const completed = Object.values(state.stepResults).filter(item => item.status === 'passed').length

	return `
		<div data-column="gap-4">
			<header data-row="gap-3 wrap">
				<div data-column="gap-1">
					<h3>EIP Compliance Test</h3>
					<p>Step-by-step verification of wallet EIP support.</p>
				</div>
				<p data-badge="medium">${completed}/${testSteps.length} steps</p>
			</header>
			<div data-card="radius-8 padding-5" data-column="gap-4">
				<header data-column="gap-1">
					<h4>Step ${step.stepNumber}: ${escapeHtml(step.name)}</h4>
					<p>${escapeHtml(step.description)}</p>
				</header>
				<div data-row="gap-2 wrap">
					${step.eips.map(eip => `<a href="${escapeHtml(eip.specUrl)}" target="_blank" rel="noopener noreferrer" data-tag="eip">${escapeHtml(eip.eipNumber)}</a>`).join('')}
				</div>
				${step.eips
					.map(
						eip => `
							<section data-column="gap-2">
								<h5>${escapeHtml(eip.eipNumber)}</h5>
								${eip.checks
									.map(check => {
										const eipResult = result?.eipResults.find(
											item => item.eipNumber === eip.eipNumber,
										)
										const checkResult = eipResult?.checks.find(item => item.id === check.id)

										return `<p><strong>${checkResult ? (checkResult.passed ? 'Pass' : 'Fail') : 'Pending'}:</strong> ${escapeHtml(check.name)}${checkResult?.detail ? ` - ${escapeHtml(checkResult.detail)}` : ''}</p>`
									})
									.join('')}
							</section>
						`,
					)
					.join('')}
				${renderEipProviders()}
				${state.eipConnectedAddress ? codeBlock('Connected address', state.eipConnectedAddress) : ''}
				${state.eipChainId ? codeBlock('Chain ID', state.eipChainId) : ''}
				${state.eipBatchId ? codeBlock('Batch ID', state.eipBatchId, { wrap: true }) : ''}
				<div data-row="gap-2 wrap">
					${actionButton('run-eip-step', result?.status === 'running' ? 'Running...' : 'Run Step', result?.status === 'running')}
					${state.eipStatus === 'completed' || state.eipStatus === 'failed' ? actionButton('reset-eip-steps', 'Reset All Tests') : ''}
				</div>
				${result?.error ? `<p>${escapeHtml(result.error)}</p>` : ''}
			</div>
		</div>
	`
}

const renderEipProviders = (): string => {
	if (
		state.tab !== 'eip-support' ||
		state.providers.length === 0 ||
		testSteps[state.stepIndex]?.id !== 'step-1-detection'
	) {
		return ''
	}

	return `
		<section data-column="gap-2">
			<h5>Discovered Providers (${state.providers.length})</h5>
			${state.providers
				.map(
					({ info }) => `
						<button type="button" data-eip-provider="${escapeHtml(info.uuid)}">
							<span>${escapeHtml(info.name)}</span>
							<code>${escapeHtml(info.rdns)}</code>
							${state.eipSelectedProviderId === info.uuid ? '<span data-badge="small">Selected</span>' : ''}
						</button>
					`,
				)
				.join('')}
		</section>
	`
}

const renderAppIsolation = (): string => {
	const isWalletConnect = state.selectedAppIsolation === 'wallet-connect'
	const result = state.appIsolationResults[state.selectedAppIsolation]

	return `
		<div data-card="radius-8 padding-5" data-column="gap-4">
			<header data-column="gap-1">
				<h3>${isWalletConnect ? 'wallet_connect (ERC-7846)' : 'eth_accounts'}</h3>
				<p>${
					isWalletConnect
						? 'Calls the wallet_connect RPC defined by ERC-7846. If unsupported, the wallet should return an error.'
						: 'Requests accounts currently exposed to this page without prompting for new permission.'
				}</p>
			</header>
			${actionButton('run-app-isolation', `Call ${isWalletConnect ? 'wallet_connect' : 'eth_accounts'}`, !provider() || state.pendingId === state.selectedAppIsolation)}
			${result ? `<div data-card="secondary radius-4 padding-4">${codeBlock('Response', result, { wrap: true })}</div>` : ''}
		</div>
	`
}

const renderSimulation = (): string => {
	const tx = simulationTransaction()

	return `
		${renderSimulationInputs()}
		${renderTransaction(tx, 'send-transaction')}
	`
}

const renderSimulationInputs = (): string => {
	if (state.selectedSimulation === 'erc20-transfer') {
		return `
			<div data-card="secondary radius-4 padding-4" data-column="gap-3">
				<label>to (address)<input data-simulation-field="erc20To" value="${escapeHtml(state.erc20To)}" placeholder="0x..."></label>
				${codeBlock('amount (uint256)', '1000000000000000000 (1 token, 18 decimals)')}
			</div>
		`
	}

	if (state.selectedSimulation === 'erc721-transfer') {
		return `
			<div data-card="secondary radius-4 padding-4" data-column="gap-3">
				<label>from (address)<input data-simulation-field="erc721From" value="${escapeHtml(state.erc721From)}" placeholder="0x..."></label>
				<label>to (address)<input data-simulation-field="erc721To" value="${escapeHtml(state.erc721To)}" placeholder="0x..."></label>
				<label>tokenId (uint256)<input data-simulation-field="erc721TokenId" value="${escapeHtml(state.erc721TokenId)}" placeholder="1"></label>
			</div>
		`
	}

	if (state.selectedSimulation === 'erc1155-transfer') {
		return `
			<div data-card="secondary radius-4 padding-4" data-column="gap-3">
				<label>from (address)<input data-simulation-field="erc1155From" value="${escapeHtml(state.erc1155From)}" placeholder="0x..."></label>
				<label>to (address)<input data-simulation-field="erc1155To" value="${escapeHtml(state.erc1155To)}" placeholder="0x..."></label>
				<label>id (uint256)<input data-simulation-field="erc1155TokenId" value="${escapeHtml(state.erc1155TokenId)}" placeholder="1"></label>
				${codeBlock('amount (uint256)', '1')}
				${codeBlock('data (bytes)', '0x')}
			</div>
		`
	}

	return ''
}

const renderScamAlert = (): string => {
	const test = scamAlertForSigning(currentScamAlert())
	const result = state.hashes[test.id] ?? state.signatures[test.id]

	if (!state.scamDisclaimerAccepted) {
		return `
			<div data-card="radius-8 padding-5" data-column="gap-4">
				<h3>Scam Alert Testing</h3>
				<p>Every transaction on this tab should be treated as a scam transaction.</p>
				<p>Do not send real funds. Use only disposable wallets with no real assets.</p>
				<label><input type="checkbox" data-scam-disclaimer-checkbox> I understand the risks.</label>
				${actionButton('accept-scam-disclaimer', 'I Understand')}
			</div>
		`
	}

	return `
		<div data-card="radius-8 padding-5" data-column="gap-4">
			<header data-column="gap-1">
				<h3>${escapeHtml(test.name)}</h3>
				<p>${escapeHtml(test.description)}</p>
			</header>
			${test.customAddress ? '<label>Address to send to<input data-scam-custom-address placeholder="0x..."></label>' : codeBlock('Address', test.contractAddress)}
			${test.value !== undefined ? codeBlock('Value Sent', '0.0001 ETH') : ''}
			${codeBlock('Risk Type', test.riskType)}
			${test.messageData ? codeBlock('Permit Details', stringify(test.messageData), { wrap: true }) : ''}
			<p>${escapeHtml(test.expectedBehavior)}</p>
			${warning('WARNING: This page is for testing only. Do not send real transactions.')}
			${actionButton(test.testType === 'signature' ? 'sign-scam' : 'send-scam', result ? 'Completed' : test.testType === 'signature' ? 'Sign Message (Testing Only)' : 'Send Transaction (Testing Only)', !state.account || state.pendingId === test.id)}
			${result ? codeBlock(test.testType === 'signature' ? 'Signature' : 'Transaction Hash', result, { wrap: true }) : ''}
		</div>
	`
}

const renderErc8213 = (): string => {
	if (state.selectedErc8213 === 'calldata') {
		return `
			<div data-card="radius-8 padding-5" data-column="gap-4">
				<header data-column="gap-1">
					<h3>Calldata digest</h3>
					<p>ERC-8213 specifies keccak256(len(calldata) || calldata), with the length encoded as a 32-byte big-endian word.</p>
				</header>
				<label>Raw calldata<textarea data-calldata-input rows="5" spellcheck="false">${escapeHtml(state.calldataInput)}</textarea></label>
				${actionButton('digest-calldata', 'Compute digest')}
				${
					state.calldataDigest
						? `${codeBlock('Calldata digest', state.calldataDigest, { wrap: true })}
							<p>A wallet with ERC-8213 support should show this hash alongside or instead of raw hex.</p>`
						: ''
				}
				${state.calldataError ? `<p>${escapeHtml(state.calldataError)}</p>` : ''}
			</div>
		`
	}

	return `
		<div data-card="radius-8 padding-5" data-column="gap-4">
			<header data-column="gap-1">
				<h3>EIP-712 typed data digest</h3>
				<p>Computes the domain separator, message hash, and full typed-data digest.</p>
			</header>
			<label>Typed data JSON<textarea data-eip712-input rows="24" spellcheck="false">${escapeHtml(state.eip712Json)}</textarea></label>
			${actionButton('digest-eip712', 'Compute EIP-712 digest')}
			${
				state.eip712Digest
					? `${codeBlock('Domain separator', state.eip712Digest.domainSeparator, { wrap: true })}
						${codeBlock(`Message hash: hashStruct(${state.eip712Digest.primaryType})`, state.eip712Digest.messageHash, { wrap: true })}
						${codeBlock('Full EIP-712 digest', state.eip712Digest.fullDigest, { wrap: true })}`
					: ''
			}
			${state.eip712Error ? `<p>${escapeHtml(state.eip712Error)}</p>` : ''}
		</div>
	`
}

const renderEipResultsDialog = (): void => {
	const target = document.querySelector('[data-eip-results]')

	if (!target) {
		return
	}

	target.innerHTML = testSteps
		.map(step => {
			const result = state.stepResults[step.id]

			return `<section data-card="secondary radius-4 padding-4">
				<h3>${step.stepNumber}. ${escapeHtml(step.name)}</h3>
				<p>${escapeHtml(result?.status ?? 'pending')}</p>
				${result?.error ? `<p>${escapeHtml(result.error)}</p>` : ''}
			</section>`
		})
		.join('')
}

const render = (): void => {
	renderOuterTabs()
	renderProviderDialog()
	renderAccount()
	renderNavigation()
	renderDetail()
	setText('[data-error-message]', state.error)
}

const selectNav = (id: string): void => {
	if (state.tab === 'transactions') {
		state.selectedTx = id
	} else if (state.tab === 'signatures') {
		state.selectedSignature = id
	} else if (state.tab === 'eip-support') {
		state.stepIndex = Number(id)
	} else if (state.tab === 'app-isolation') {
		state.selectedAppIsolation = id === 'wallet-connect' ? 'wallet-connect' : 'eth-accounts'
	} else if (state.tab === 'tx-simulations') {
		const selected = simulationId(id)

		if (selected) {
			state.selectedSimulation = selected
		}
	} else if (state.tab === 'scam-alerts') {
		state.selectedScam = id
	} else {
		state.selectedErc8213 = id === 'eip712' ? 'eip712' : 'calldata'
	}
}

const handleAction = async (action: string): Promise<void> => {
	if (action === 'open-provider-dialog') {
		showDialog('provider-dialog')
	} else if (action === 'connect') {
		await connect()
	} else if (action === 'switch-mainnet') {
		await switchMainnet()
		closeDialog('chain-dialog')
	} else if (action === 'send-transaction') {
		await sendTestTransaction(currentTransaction())
	} else if (action === 'sign') {
		await signSelectedSignature()
	} else if (action === 'send-scam') {
		await sendScam()
	} else if (action === 'sign-scam') {
		await signScam()
	} else if (action === 'run-eip-step') {
		await runEipStep()
	} else if (action === 'reset-eip-steps') {
		resetEipSteps()
	} else if (action === 'run-app-isolation') {
		await callAppIsolation(state.selectedAppIsolation)
	} else if (action === 'accept-scam-disclaimer') {
		const checkbox = document.querySelector(
			'[data-tab-panel][data-tab="scam-alerts"] [data-scam-disclaimer-checkbox]',
		)

		state.scamDisclaimerAccepted = checkbox instanceof HTMLInputElement ? checkbox.checked : false
	} else if (action === 'digest-calldata') {
		computeCalldataDigest()
	} else if (action === 'digest-eip712') {
		computeEip712Digest()
	}
}

const selectDetails = (details: HTMLDetailsElement): void => {
	if (details.dataset.tab) {
		const selectedTab = tabId(details.dataset.tab)

		if (!selectedTab) {
			return
		}

		const previousTab = state.tab

		if (selectedTab === previousTab) {
			return
		}

		state.tab = selectedTab

		if (selectedTab === 'scam-alerts' && previousTab !== 'scam-alerts') {
			state.scamDisclaimerAccepted = false
		}

		render()
	} else if (details.dataset.navItem) {
		if (details.dataset.navTab !== state.tab) {
			return
		}

		if (selectedNav(details.dataset.navItem)) {
			return
		}

		selectNav(details.dataset.navItem)
		render()
	}
}

const syncSelectedDetails = (details: HTMLDetailsElement): void => {
	if (!details.open) {
		return
	}

	selectDetails(details)
}

document.addEventListener('click', event => {
	const target = event.target

	if (!(target instanceof Element)) {
		return
	}

	const summary = target.closest('summary')
	const providerButton = target.closest<HTMLButtonElement>('[data-provider-uuid]')
	const eipProviderButton = target.closest<HTMLButtonElement>('[data-eip-provider]')
	const actionButtonElement = target.closest<HTMLButtonElement>('[data-action]')

	const summaryDetails = summary?.parentElement

	if (summaryDetails instanceof HTMLDetailsElement) {
		if (summaryDetails.dataset.tab) {
			window.requestAnimationFrame(() => {
				selectDetails(summaryDetails)
			})
		} else {
			selectDetails(summaryDetails)
		}
	} else if (providerButton?.dataset.providerUuid) {
		void runAction(async () => {
			await connect(providerButton.dataset.providerUuid ?? null)
			closeDialog('provider-dialog')
		})
	} else if (eipProviderButton?.dataset.eipProvider) {
		state.eipSelectedProviderId = eipProviderButton.dataset.eipProvider
		state.selectedProviderUuid = eipProviderButton.dataset.eipProvider
		render()
	} else if (actionButtonElement?.dataset.action) {
		void runAction(() => handleAction(actionButtonElement.dataset.action ?? ''))
	}
})

document.addEventListener(
	'toggle',
	event => {
		const target = event.target

		if (!(target instanceof HTMLDetailsElement) || !target.open) {
			return
		}

		syncSelectedDetails(target)
	},
	true,
)

document.addEventListener('change', event => {
	const target = event.target

	if (!(target instanceof HTMLInputElement)) {
		return
	}

	if (target.dataset.scamDisclaimerCheckbox !== undefined) {
		state.scamDisclaimerAccepted = target.checked
		render()

		return
	}

	if (!target.dataset.simulationField) {
		return
	}

	const field = target.dataset.simulationField

	if (
		field === 'erc20To' ||
		field === 'erc721From' ||
		field === 'erc721To' ||
		field === 'erc721TokenId' ||
		field === 'erc1155From' ||
		field === 'erc1155To' ||
		field === 'erc1155TokenId'
	) {
		state[field] = target.value
		render()
	}
})

store.subscribe(
	providers => {
		state.providers = providers
		state.selectedProviderUuid ??= providers[0]?.info.uuid ?? null
		state.eipSelectedProviderId ??= state.selectedProviderUuid
		render()
	},
	{ emitImmediately: true },
)

void readAccount()
	.catch(() => undefined)
	.finally(render)
