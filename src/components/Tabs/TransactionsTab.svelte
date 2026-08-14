<script lang="ts">
	import type { TestTransaction } from '../../constants/test-transactions-signatures'

	let {
		selectedTx,
		isCustom = false,
		transactionState,
		account,
		onSendTransaction,
		onOpenInExplorer,
		formatValue,
	}: {
		selectedTx: TestTransaction | undefined
		isCustom?: boolean
		transactionState: {
			activeId: string | null
			isPending: boolean
			hashes: Record<string, `0x${string}`>
		}
		account: { address?: string } | null
		onSendTransaction: (tx: TestTransaction) => void
		onOpenInExplorer: (txHash: string) => void
		formatValue: (value: string, type: string) => string
	} = $props()

	const customTxId = 'custom-tx'

	let customAddress = $state('')
	let customCalldata = $state('')
	let customAddressError = $state('')
	let customCalldataError = $state('')

	const isActive = $derived(
		isCustom
			? transactionState.activeId === customTxId
			: selectedTx && transactionState.activeId === selectedTx.id
	)
	const isPending = $derived(transactionState.isPending && isActive)
	const txHash = $derived(
		isCustom
			? transactionState.hashes[customTxId]
			: selectedTx
				? transactionState.hashes[selectedTx.id]
				: undefined
	)

	function isValidAddress(addr: string): addr is `0x${string}` {
		return /^0x[0-9a-fA-F]{40}$/.test(addr)
	}

	function isValidCalldata(data: string): data is `0x${string}` {
		return /^0x([0-9a-fA-F]{2})*$/.test(data)
	}

	function sendCustomTransaction() {
		customAddressError = ''
		customCalldataError = ''

		const address = customAddress.trim()
		const calldata = customCalldata.trim()

		if (!isValidAddress(address)) {
			customAddressError = 'Enter a valid Ethereum address (0x…)'

			return
		}

		if (!isValidCalldata(calldata)) {
			customCalldataError = 'Enter 0x-prefixed hex calldata with an even number of hex characters'

			return
		}

		onSendTransaction({
			id: customTxId,
			name: 'Custom Transaction',
			function: 'custom',
			parameters: [],
			calldata,
			contractAddress: address,
		})
	}
</script>

{#if isCustom}
	<div class="detail-card" data-card="radius-8 padding-5">
		<header data-row="gap-2 start wrap">
			<div data-column="gap-1">
				<h3>Custom Transaction</h3>
				<p class="body-text">
					Send your own transaction by providing a contract address and calldata.
				</p>
			</div>
			{#if txHash}
				<button
					type="button"
					class="explorer-link"
					onclick={() => onOpenInExplorer(txHash)}
					title="View on Etherscan"
				>
					↗
				</button>
			{/if}
		</header>

		<div data-column="gap-4">
			<div class="detail-section">
				<label class="detail-label" for="custom-tx-address">📍 Contract Address:</label>
				<input
					id="custom-tx-address"
					type="text"
					class="address-input"
					class:error={!!customAddressError}
					placeholder="0x…"
					bind:value={customAddress}
					oninput={() => { customAddressError = ''; }}
				/>
				{#if customAddressError}
					<span class="address-error">{customAddressError}</span>
				{/if}
			</div>

			<div class="detail-section">
				<label class="detail-label" for="custom-tx-calldata">📦 Calldata:</label>
				<textarea
					id="custom-tx-calldata"
					class="address-input calldata-input"
					class:error={!!customCalldataError}
					placeholder="0x…"
					rows="4"
					bind:value={customCalldata}
					oninput={() => { customCalldataError = ''; }}
				></textarea>
				{#if customCalldataError}
					<span class="address-error">{customCalldataError}</span>
				{/if}
			</div>

			<div class="warning-box">
				<p class="warning-text">
					<strong>⚠️ WARNING:</strong> This page is for testing only. Do NOT send real transactions.
				</p>
			</div>

			<button
				type="button"
				data-pressable
				onclick={sendCustomTransaction}
				disabled={!account?.address || isPending}
			>
				{#if isPending}
					Preparing…
				{:else if txHash}
					Transaction Sent ✓
				{:else}
					Send Transaction (Testing Only)
				{/if}
			</button>

			{#if txHash}
				<div class="result-box">
					<span class="result-label">Transaction Hash:</span>
					<button type="button" class="result-link" onclick={() => onOpenInExplorer(txHash)}>
						{txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
					</button>
				</div>
			{/if}
		</div>
	</div>
{:else if selectedTx}
	<div class="detail-card" data-card="radius-8 padding-5">
		<header data-row="gap-2 start wrap">
			<div data-column="gap-1">
				<h3>{selectedTx.name}</h3>
				{#if selectedTx.description}
					<p class="body-text">{selectedTx.description}</p>
				{/if}
			</div>
			{#if txHash}
				<button
					type="button"
					class="explorer-link"
					onclick={() => onOpenInExplorer(txHash)}
					title="View on Etherscan"
				>
					↗
				</button>
			{/if}
		</header>

		<div data-column="gap-4">
			{#if selectedTx.requirements && selectedTx.requirements.length > 0}
				<div class="requirements-box">
					<h4 class="requirements-title">📋 Requirements:</h4>
					<ul class="requirements-list">
						{#each selectedTx.requirements as requirement (requirement)}
							<li>{requirement}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="detail-section">
				<span class="detail-label">📞 Function:</span>
				<code class="detail-code">{selectedTx.function}</code>
			</div>

			{#if selectedTx.parameters.length > 0}
				<div class="detail-section">
					<span class="detail-label">📋 Parameters:</span>
					<div class="parameters-list" data-column="gap-2">
						{#each selectedTx.parameters as param (param.name)}
							<div class="parameter-item">
								<div class="parameter-header">
									<span class="parameter-name">{param.name}:</span>
									<span class="parameter-type">({param.type})</span>
								</div>
								<code class="parameter-value">{formatValue(param.value, param.type)}</code>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if selectedTx.calls && selectedTx.calls.length > 0}
				<div class="detail-section">
					<span class="detail-label">🔗 Calls ({selectedTx.calls.length}):</span>
					<div class="parameters-list" data-column="gap-3">
						{#each selectedTx.calls as call, i (i)}
							<div class="parameter-item">
								<div class="parameter-header">
									<span class="parameter-name">Call {i + 1}</span>
								</div>
								<div data-column="gap-2">
									<div>
										<span class="parameter-type">To:</span>
										<code class="parameter-value">{call.to}</code>
									</div>
									<div>
										<span class="parameter-type">Data:</span>
										<code class="parameter-value calldata">{call.data}</code>
									</div>
									{#if call.value !== undefined && call.value > 0n}
										<div>
											<span class="parameter-type">Value:</span>
											<code class="parameter-value">{call.value.toString()} Wei</code>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="detail-section">
					<span class="detail-label">📦 Calldata:</span>
					<code class="detail-code calldata">{selectedTx.calldata}</code>
				</div>

				{#if selectedTx.contractAddress}
					<div class="detail-section">
						<span class="detail-label">📍 Contract Address:</span>
						<code class="detail-code">{selectedTx.contractAddress}</code>
					</div>
				{/if}
			{/if}

			<div class="warning-box">
				<p class="warning-text">
					<strong>⚠️ WARNING:</strong> This page is for testing only. Do NOT send real transactions.
				</p>
			</div>

			<button
				type="button"
				data-pressable
				onclick={() => onSendTransaction(selectedTx)}
				disabled={!account?.address ||
					isPending ||
					(!selectedTx.calls && !selectedTx.contractAddress) ||
					(selectedTx.calls && selectedTx.calls.length === 0)}
			>
				{#if isPending}
					Preparing…
				{:else if txHash}
					Transaction Sent ✓
				{:else}
					Send Transaction (Testing Only)
				{/if}
			</button>

			{#if txHash}
				<div class="result-box">
					<span class="result-label">Transaction Hash:</span>
					<button type="button" class="result-link" onclick={() => onOpenInExplorer(txHash)}>
						{txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
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

	.explorer-link {
		background: transparent;
		border: none;
		color: var(--accent);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.25rem;
		margin-left: auto;
	}

	.explorer-link:hover {
		opacity: 0.8;
	}

	.requirements-box {
		padding: 1rem;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 0.5rem;
	}

	.requirements-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
		margin: 0 0 0.75rem 0;
	}

	.requirements-list {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.requirements-list li {
		font-size: 0.85rem;
		color: var(--text-secondary);
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
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.8rem;
		background-color: var(--background-secondary);
		padding: 0.75rem;
		border-radius: 0.5rem;
		word-break: break-all;
		color: var(--text-primary);
	}

	.detail-code.calldata {
		font-size: 0.75rem;
	}

	.address-input {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
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

	.calldata-input {
		font-size: 0.75rem;
		resize: vertical;
		word-break: break-all;
	}

	.address-error {
		font-size: 0.8rem;
		color: var(--rating-fail);
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
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 0.75rem;
		color: var(--text-primary);
		word-break: break-all;
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

	.result-box {
		padding: 0.75rem;
		background: var(--background-secondary);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.result-link {
		background: transparent;
		border: none;
		color: var(--accent);
		font-size: 0.8rem;
		cursor: pointer;
		text-align: left;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
	}

	.result-link:hover {
		opacity: 0.8;
	}
</style>
