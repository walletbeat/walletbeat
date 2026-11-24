<script lang="ts">
	import { onMount } from 'svelte'
	import {
		connect,
		getConnection,
		sendTransaction,
		switchChain,
		watchConnection,
		writeContract,
		type Connector,
	} from '@wagmi/core'
	import { mainnet } from '@wagmi/core/chains'

	import config from '@/lib/wagmi-config'
	import {
		DonationAsset,
		donationAssetInfo,
		donationAssets,
		erc20Abi,
		givethProjectUrl,
		parseAssetAmount,
		treasuryAddress,
	} from '@/lib/donations'
	import { getErrorMessage } from '@/types/errors'
	import ConnectorModal from '@/components/Modals/ConnectorModal.svelte'
	import Select from '@/components/Select.svelte'

	type DonationStatus =
		| { kind: 'idle' }
		| { kind: 'pending'; message: string }
		| { kind: 'sent'; txHash: `0x${string}` }
		| { kind: 'error'; message: string }

	let connection = $state<ReturnType<typeof getConnection> | null>(null)
	let asset = $state<DonationAsset>(DonationAsset.ETH)
	let amountInput = $state('')
	let status = $state<DonationStatus>({ kind: 'idle' })
	let isConnectorModalOpen = $state(false)
	let isConnecting = $state(false)
	let copied = $state(false)

	const presets: Record<DonationAsset, string[]> = {
		[DonationAsset.ETH]: ['0.01', '0.05', '0.1', '0.5'],
		[DonationAsset.USDC]: ['10', '50', '100', '500'],
		[DonationAsset.USDT]: ['10', '50', '100', '500'],
		[DonationAsset.DAI]: ['10', '50', '100', '500'],
	}

	const amount = $derived(parseAssetAmount(asset, amountInput))
	const isBusy = $derived(status.kind === 'pending' || isConnecting)

	onMount(() => {
		connection = getConnection(config)

		return watchConnection(config, {
			onChange: data => {
				connection = data
			},
		})
	})

	async function connectWith(connector: Connector): Promise<boolean> {
		isConnecting = true

		try {
			await connect(config, { connector })
			isConnectorModalOpen = false

			return true
		} catch (error) {
			status = { kind: 'error', message: firstLine(getErrorMessage(error)) }

			return false
		} finally {
			isConnecting = false
		}
	}

	async function ensureConnected(): Promise<boolean> {
		if (connection?.isConnected) {
			return true
		}

		if (config.connectors.length === 1) {
			return await connectWith(config.connectors[0])
		}

		isConnectorModalOpen = true

		return false
	}

	async function donate(): Promise<void> {
		if (amount === null || !(await ensureConnected())) {
			return
		}

		try {
			if (getConnection(config).chainId !== mainnet.id) {
				status = { kind: 'pending', message: 'Switch your wallet to Ethereum mainnet…' }
				await switchChain(config, { chainId: mainnet.id })
			}

			status = { kind: 'pending', message: 'Confirm the donation in your wallet…' }

			const { token } = donationAssetInfo[asset]
			const txHash =
				token === null
					? await sendTransaction(config, {
							chainId: mainnet.id,
							to: treasuryAddress,
							value: amount,
						})
					: await writeContract(config, {
							chainId: mainnet.id,
							address: token,
							abi: erc20Abi,
							functionName: 'transfer',
							args: [treasuryAddress, amount],
						})

			status = { kind: 'sent', txHash }
			amountInput = ''
		} catch (error) {
			status = { kind: 'error', message: firstLine(getErrorMessage(error)) }
		}
	}

	/** Wallet errors carry multi-line request dumps; the first line is the readable part. */
	function firstLine(message: string): string {
		return message.split('\n')[0]
	}

	async function copyAddress(): Promise<void> {
		await navigator.clipboard.writeText(treasuryAddress)
		copied = true
		setTimeout(() => {
			copied = false
		}, 2000)
	}
</script>


<div class="donate" data-column="gap-8">
	<form
		class="donate-card"
		data-card="padding-6"
		data-column="gap-5"
		onsubmit={event => {
			event.preventDefault()
			void donate()
		}}
	>
		<hgroup data-column="gap-2">
			<h2>Donate with your wallet</h2>
			<p class="muted">
				Your donation goes straight to the Walletbeat treasury on Ethereum mainnet.
			</p>
		</hgroup>

		<div data-column="gap-3">
			<div class="amount-field" data-row="gap-2">
				<label for="donation-amount" data-visually-hidden>Amount</label>
				<input
					id="donation-amount"
					class="amount-input"
					type="text"
					inputmode="decimal"
					placeholder="0.00"
					autocomplete="off"
					bind:value={amountInput}
					disabled={isBusy}
				/>

				<label for="donation-asset" data-visually-hidden>Asset</label>
				<Select
					id="donation-asset"
					class="asset-select"
					bind:value={
						() => asset,
						value => {
							if (donationAssets.is(value)) asset = value
						}
					}
					options={donationAssets.items.map(item => ({ value: item, label: item }))}
					disabled={isBusy}
				/>
			</div>

			<div class="presets" data-row="start gap-2 wrap">
				{#each presets[asset] as preset (preset)}
					<button
						type="button"
						class="preset"
						class:active={amountInput.trim() === preset}
						disabled={isBusy}
						onclick={() => {
							amountInput = preset
						}}
					>
						{preset} {asset}
					</button>
				{/each}
			</div>

			{#if amountInput.trim() !== '' && amount === null}
				<p class="message error">
					Enter a positive amount with at most {donationAssetInfo[asset].decimals} decimals.
				</p>
			{/if}
		</div>

		<button
			type="submit"
			class="primary"
			disabled={isBusy || amount === null}
		>
			{#if status.kind === 'pending'}
				{status.message}
			{:else if amount === null}
				Enter an amount
			{:else if connection?.isConnected}
				Donate {amountInput.trim()} {asset}
			{:else}
				Connect wallet to donate {amountInput.trim()} {asset}
			{/if}
		</button>

		{#if status.kind === 'sent'}
			<p class="message success">
				Thank you for supporting Walletbeat!
				<a
					href={`https://eth.blockscout.com/tx/${status.txHash}`}
					target="_blank"
					rel="noopener noreferrer">View your transaction ↗</a
				>
			</p>
		{:else if status.kind === 'error'}
			<p class="message error">{status.message}</p>
		{/if}
	</form>

	<section data-column="gap-4">
		<h2 class="section-title">Other ways to give</h2>

		<div class="options">
			<div class="option" data-card="padding-6" data-column="gap-4">
				<hgroup data-column="gap-2">
					<h3>Send directly</h3>
					<p class="muted">Send ETH, USDC, USDT, or DAI to the treasury from any wallet.</p>
				</hgroup>

				<div class="address-box" data-row="gap-2">
					<code>{treasuryAddress}</code>
					<button type="button" class="copy" onclick={() => void copyAddress()}>
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>

				<p class="message warning">
					Ethereum mainnet only. Funds sent on any other chain may be lost.
				</p>
			</div>

			<div class="option" data-card="padding-6" data-column="gap-4">
				<hgroup data-column="gap-2">
					<h3>Donate on Giveth</h3>
					<p class="muted">
						Give from many chains and tokens. During quadratic funding rounds, Giveth matches
						your donation.
					</p>
				</hgroup>

				<a
					class="secondary-link"
					href={givethProjectUrl}
					target="_blank"
					rel="noopener noreferrer"
					data-link="camouflaged"
				>
					Open Walletbeat on Giveth ↗
				</a>
			</div>
		</div>
	</section>
</div>

<ConnectorModal
	isOpen={isConnectorModalOpen}
	connectors={config.connectors}
	{isConnecting}
	onClose={() => {
		isConnectorModalOpen = false
	}}
	onConnect={(connector: Connector) => {
		void connectWith(connector).then(connected => {
			if (connected) {
				void donate()
			}
		})
	}}
/>


<style>
	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		font-size: 1.4rem;
	}

	h3 {
		font-size: 1.1rem;
	}

	.muted {
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.section-title {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.amount-field {
		align-items: stretch;

		.amount-input {
			flex: 1;
			min-inline-size: 0;
			font-size: 1.1rem;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
			text-align: start;
		}

		:global(.asset-select) {
			flex-shrink: 0;
			font-weight: 600;
		}
	}

	.preset {
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		font-size: 0.85rem;
		color: var(--text-secondary);

		&.active {
			color: var(--accent);
			border-color: var(--accent);
			background-color: var(--accent-backgroundColor);
		}
	}

	.primary {
		inline-size: 100%;
		padding-block: 0.75rem;
		justify-content: center;
		border: none;
		background-color: var(--accent);
		color: var(--background-primary);
		font-size: 1rem;
		font-weight: 700;

		&:disabled {
			background-color: var(--background-tertiary);
			color: var(--text-secondary);
		}
	}

	.options {
		display: grid;
		gap: 1rem;
	}

	.address-box {
		padding: 0.5rem 0.5rem 0.5rem 0.85rem;
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		background-color: var(--background-primary);

		code {
			flex: 1;
			min-inline-size: 0;
			font-size: 0.85rem;
			overflow-wrap: anywhere;
		}

		.copy {
			flex-shrink: 0;
			font-size: 0.8rem;
		}
	}

	.secondary-link {
		align-self: flex-start;
		padding: 0.75rem 1rem;
		border: 1px solid var(--accent);
		border-radius: 0.5rem;
		text-align: center;
		font-weight: 600;
		color: var(--accent);
	}

	.message {
		font-size: 0.9rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.warning {
		color: var(--rating-partial-text);
	}

	.error {
		color: var(--rating-fail-text);
	}

	.success {
		color: var(--rating-pass-text);
	}
</style>
