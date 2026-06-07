<script lang="ts">
	export type TransactionSimulationSubTab =
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
		| 'failing-transaction';

	import type { TestTransaction } from '../../constants/test-transactions-signatures';
	import {
		WALLETBEAT_TEST_CONTRACT,
		WALLETBEAT_TEST_ERC721,
		WALLETBEAT_TEST_ERC1155,
		WALLETBEAT_TEST_ERC20,
		ZERO_ADDRESS,
	} from '../../constants/test-contracts';
	import { assertTransactionId } from '@/types/utils/ethereum-types';

	interface Props {
		activeSubTab: TransactionSimulationSubTab;
		account: { address?: string } | null;
		onSendTransaction: (tx: TestTransaction) => void;
	}

	let { activeSubTab, account, onSendTransaction }: Props = $props();

	const addr = $derived(assertTransactionId(account?.address ?? ZERO_ADDRESS));

	function padAddr(a: string): string {
		return a.toLowerCase().replace('0x', '').padStart(64, '0');
	}
	function padUint(v: bigint): string {
		return v.toString(16).padStart(64, '0');
	}
	function safeUint(s: string, fallback = 0n): bigint {
		try { return BigInt(s); } catch { return fallback; }
	}
	function isValidAddress(a: string): a is `0x${string}` {
		return /^0x[0-9a-fA-F]{40}$/.test(a);
	}

	// Editable params for transfer
	let erc20To = $state('');
	let erc20ToError = $state('');

	let erc721From = $state('');
	let erc721To = $state('');
	let erc721TokenId = $state('1');
	let erc721ToError = $state('');

	let erc1155From = $state('');
	let erc1155To = $state('');
	let erc1155TokenId = $state('1');
	let erc1155ToError = $state('');

	// Pre-fill 'from' fields when wallet connects
	$effect(() => {
		if (addr !== ZERO_ADDRESS) {
			if (!erc721From) erc721From = addr;

			if (!erc1155From) erc1155From = addr;
		}
	});

	function handleSend() {
		if (activeSubTab === 'erc20-transfer') {
			erc20ToError = '';

			if (!isValidAddress(erc20To)) { erc20ToError = 'Enter a valid Ethereum address (0x…)';

 return; }
		} else if (activeSubTab === 'erc721-transfer') {
			erc721ToError = '';

			if (!isValidAddress(erc721To)) { erc721ToError = 'Enter a valid Ethereum address (0x…)';

 return; }
		} else if (activeSubTab === 'erc1155-transfer') {
			erc1155ToError = '';

			if (!isValidAddress(erc1155To)) { erc1155ToError = 'Enter a valid Ethereum address (0x…)';

 return; }
		}

		onSendTransaction(simulations[activeSubTab]);
	}

	const simulations = $derived<Record<TransactionSimulationSubTab, TestTransaction>>({
		'erc20-mint': {
			id: 'erc20-mint',
			name: 'ERC-20 Mint',
			function: 'mintHundred()',
			parameters: [],
			description:
				'Mints exactly 100 tokens (100e18) to the caller via mintHundred(). Deterministic — the simulation result should always match execution.',
			contractAddress: WALLETBEAT_TEST_ERC20,
			calldata: '0x4838e647',
		},
		'erc721-mint': {
			id: 'erc721-mint',
			name: 'ERC-721 Mint',
			function: 'mintOne()',
			parameters: [],
			description:
				'Mints exactly one ERC-721 NFT to the caller via mintOne(). Deterministic — the simulation result should always match execution.',
			contractAddress: WALLETBEAT_TEST_ERC721,
			calldata: '0x0ced8637',
		},
		'erc1155-mint': {
			id: 'erc1155-mint',
			name: 'ERC-1155 Mint',
			function: 'mintOne()',
			parameters: [],
			description:
				'Mints exactly one ERC-1155 token to the caller via mintOne(). Deterministic — the simulation result should always match execution.',
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
			// transfer(address,uint256) selector: 0xa9059cbb
			calldata: assertTransactionId(`0xa9059cbb${padAddr(erc20To || ZERO_ADDRESS)}${padUint(1_000_000_000_000_000_000n)}`),
		},
		'erc721-transfer': {
			id: 'erc721-transfer',
			name: 'ERC-721 Transfer',
			function: 'safeTransferFrom(address from,address to,uint256 tokenId)',
			parameters: [],
			description:
				'Safe-transfers an ERC-721 NFT to a specified address. Tests how the wallet displays an NFT transfer in its simulation.',
			contractAddress: WALLETBEAT_TEST_ERC721,
			// safeTransferFrom(address,address,uint256) selector: 0x42842e0e
			calldata: assertTransactionId(`0x42842e0e${padAddr(erc721From || addr)}${padAddr(erc721To || ZERO_ADDRESS)}${padUint(safeUint(erc721TokenId, 1n))}`),
		},
		'erc1155-transfer': {
			id: 'erc1155-transfer',
			name: 'ERC-1155 Transfer',
			function: 'safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)',
			parameters: [],
			description:
				'Safe-transfers 1 unit of an ERC-1155 token to a specified address. Tests how the wallet displays a semi-fungible transfer in its simulation.',
			contractAddress: WALLETBEAT_TEST_ERC1155,
			// safeTransferFrom(address,address,uint256,uint256,bytes) selector: 0xf242432a
			// bytes: offset = 5*32 = 160, length = 0 (empty 0x)
			calldata: assertTransactionId(`0xf242432a${padAddr(erc1155From || addr)}${padAddr(erc1155To || ZERO_ADDRESS)}${padUint(safeUint(erc1155TokenId, 1n))}${padUint(1n)}${padUint(160n)}${padUint(0n)}`),
		},
		'all-token-transfer': {
			id: 'all-token-transfer',
			name: 'All Token Transfer',
			function: 'simulateFunctionV1()',
			parameters: [],
			description:
				'Mints ERC-20, ERC-721, and ERC-1155 tokens to the caller in a single transaction via simulateFunctionV1(). Tests whether the wallet correctly shows all three asset types in its simulation. Amounts vary by block number.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0xf88a1a98',
		},
		'misleading-selector': {
			id: 'misleading-selector',
			name: 'Misleading Selector',
			function: 'transfer(address,uint256)',
			parameters: [],
			description:
				'Uses the standard ERC-20 transfer() selector (0xa9059cbb) on a contract that actually mints tokens to the caller — ignoring the recipient and amount entirely. Tests whether wallets simulate actual behavior or assume behavior from the function signature.',
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
				"Burns the caller's entire ERC-20 balance while emitting a Transfer(0x0 → caller) event to suggest a mint. Tests whether wallets detect the real outcome (balance drain) behind a misleading event.",
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0x4e71d92d',
		},
		'volatile-outcome': {
			id: 'volatile-outcome',
			name: 'Volatile Outcome',
			function: 'simulateFunctionV2()',
			parameters: [],
			description:
				'Calls a function that mints tokens on even blocks and burns all tokens on odd blocks via simulateFunctionV2(). Tests whether wallets detect and warn about state-dependent outcomes that may differ at execution time.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0xa79c3153',
		},
		'failing-transaction': {
			id: 'failing-transaction',
			name: 'Failing Transaction',
			function: 'alwaysFails()',
			parameters: [],
			description:
				'Always reverts unconditionally via alwaysFails(). Tests whether wallets correctly identify and warn about transactions that are guaranteed to fail.',
			contractAddress: WALLETBEAT_TEST_CONTRACT,
			calldata: '0x128e6c37',
		},
	});

	const current = $derived(simulations[activeSubTab]);

</script>

<div class="tx-simulations-tab" data-column="gap-4">
	<div class="detail-card" data-card="radius-8 padding-5">
		<header data-row="gap-2 start wrap">
			<div data-column="gap-1">
				<h3>{current.name}</h3>
				<p class="body-text">{current.description}</p>
			</div>
		</header>

		<div data-column="gap-4">
			<div class="detail-section">
				<span class="detail-label">📞 Function:</span>
				<code class="detail-code">{current.function}</code>
			</div>

			{#if activeSubTab === 'erc20-transfer'}
				<div class="detail-section">
					<label class="detail-label" for="erc20-to">to (address):</label>
					<input id="erc20-to" type="text" class="address-input" class:error={!!erc20ToError}
						placeholder="0x…" bind:value={erc20To} oninput={() => { erc20ToError = ''; }} />
					{#if erc20ToError}<span class="address-error">{erc20ToError}</span>{/if}
				</div>
				<div class="detail-section">
					<span class="detail-label">amount (uint256):</span>
					<code class="detail-code">1000000000000000000 (1 token, 18 decimals)</code>
				</div>
			{:else if activeSubTab === 'erc721-transfer'}
				<div class="detail-section">
					<label class="detail-label" for="erc721-from">from (address):</label>
					<input id="erc721-from" type="text" class="address-input"
						placeholder="0x…" bind:value={erc721From} />
				</div>
				<div class="detail-section">
					<label class="detail-label" for="erc721-to">to (address):</label>
					<input id="erc721-to" type="text" class="address-input" class:error={!!erc721ToError}
						placeholder="0x…" bind:value={erc721To} oninput={() => { erc721ToError = ''; }} />
					{#if erc721ToError}<span class="address-error">{erc721ToError}</span>{/if}
				</div>
				<div class="detail-section">
					<label class="detail-label" for="erc721-tokenid">tokenId (uint256):</label>
					<input id="erc721-tokenid" type="text" class="address-input"
						placeholder="1" bind:value={erc721TokenId} />
				</div>
			{:else if activeSubTab === 'erc1155-transfer'}
				<div class="detail-section">
					<label class="detail-label" for="erc1155-from">from (address):</label>
					<input id="erc1155-from" type="text" class="address-input"
						placeholder="0x…" bind:value={erc1155From} />
				</div>
				<div class="detail-section">
					<label class="detail-label" for="erc1155-to">to (address):</label>
					<input id="erc1155-to" type="text" class="address-input" class:error={!!erc1155ToError}
						placeholder="0x…" bind:value={erc1155To} oninput={() => { erc1155ToError = ''; }} />
					{#if erc1155ToError}<span class="address-error">{erc1155ToError}</span>{/if}
				</div>
				<div class="detail-section">
					<label class="detail-label" for="erc1155-id">id (uint256):</label>
					<input id="erc1155-id" type="text" class="address-input"
						placeholder="1" bind:value={erc1155TokenId} />
				</div>
				<div class="detail-section">
					<span class="detail-label">amount (uint256):</span>
					<code class="detail-code">1</code>
				</div>
				<div class="detail-section">
					<span class="detail-label">data (bytes):</span>
					<code class="detail-code">0x</code>
				</div>
			{/if}

			<div class="detail-section">
				<span class="detail-label">📍 Contract Address:</span>
				<code class="detail-code">{current.contractAddress}</code>
			</div>

			<div class="detail-section">
				<span class="detail-label">📦 Calldata:</span>
				<code class="detail-code calldata">{current.calldata}</code>
			</div>

			<div class="warning-box">
				<p class="warning-text">
					<strong>⚠️ WARNING:</strong> This page is for testing only. Do NOT send real transactions.
				</p>
			</div>

			<button type="button" data-pressable disabled={!account?.address} onclick={handleSend}>
				Send Transaction (Testing Only)
			</button>
		</div>
	</div>
</div>

<style>
	.tx-simulations-tab {
		width: 100%;
		min-width: 0;
		overflow: hidden;
	}

	.detail-card h3 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0 0 0.5rem 1rem;
	}

	.body-text {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.detail-code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		font-size: 0.8rem;
		background-color: var(--background-secondary);
		padding: 0.75rem;
		border-radius: 0.5rem;
		word-break: break-all;
		overflow-wrap: break-word;
		color: var(--text-primary);
		display: block;
		min-width: 0;
	}

	.detail-code.calldata {
		font-size: 0.75rem;
	}

	.parameters-list {
		margin-top: 0.5rem;
	}

	.parameter-item {
		padding: 0.75rem;
		background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
		border: 1px solid var(--background-secondary);
		border-radius: 0.5rem;
	}

	.parameter-header {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.parameter-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--accent);
	}

	.parameter-type {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.parameter-value {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		font-size: 0.75rem;
		color: var(--text-primary);
		word-break: break-all;
	}

	.address-input {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
		font-size: 0.85rem;
		background-color: var(--background-secondary);
		color: var(--text-primary);
		border: 1px solid var(--background-secondary);
		border-radius: 0.5rem;
		padding: 0.75rem;
		width: 100%;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.address-input:focus {
		border-color: var(--accent);
	}

	.address-input.error {
		border-color: var(--rating-fail);
	}

	.address-error {
		font-size: 0.8rem;
		color: var(--rating-fail);
	}

	.warning-box {
		padding: 0.75rem;
		background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
		border-radius: 0.5rem;
	}

	.warning-text {
		font-size: 0.8rem;
		color: var(--rating-fail);
		margin: 0;
		text-align: center;
	}
</style>
