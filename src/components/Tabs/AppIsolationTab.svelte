<script lang="ts">
	import type { Eip1193Provider } from '../../types/eip';

	export type AppIsolationSubTab = 'eth-accounts' | 'wallet-connect';

	interface Props {
		activeSubTab: AppIsolationSubTab;
		provider: Eip1193Provider | null;
	}

	let { activeSubTab, provider }: Props = $props();

	const ethAccountsState = $state({
		isPending: false,
		result: null as string[] | null,
		error: '',
	});

	const walletConnectState = $state({
		isPending: false,
		result: null as unknown,
		error: '',
	});

	async function callEthAccounts() {
		if (!provider) {
			ethAccountsState.error = 'No provider available. Connect a wallet first.';

			return;
		}

		ethAccountsState.isPending = true;
		ethAccountsState.error = '';
		ethAccountsState.result = null;

		try {
			const accounts = await provider.request({ method: 'eth_accounts' });

			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- eth_accounts returns string[]
			ethAccountsState.result = accounts as string[];
		} catch (err) {
			ethAccountsState.error = err instanceof Error ? err.message : 'Request failed';
		} finally {
			ethAccountsState.isPending = false;
		}
	}

	async function callWalletConnect() {
		if (!provider) {
			walletConnectState.error = 'No provider available. Connect a wallet first.';

			return;
		}

		walletConnectState.isPending = true;
		walletConnectState.error = '';
		walletConnectState.result = null;

		try {
			const result = await provider.request({
				method: 'wallet_connect',
				params: [{ version: '1' }],
			});

			walletConnectState.result = result;
		} catch (err) {
			walletConnectState.error = err instanceof Error ? err.message : 'Request failed';
		} finally {
			walletConnectState.isPending = false;
		}
	}
</script>

<div class="app-isolation-tab" data-column="gap-4">
	{#if activeSubTab === 'eth-accounts'}
		<div class="rpc-card" data-card="radius-8 padding-5">
			<div data-column="gap-3">
				<div data-column="gap-1">
					<h3>eth_accounts</h3>
					<p class="body-text">
						Requests the list of accounts the wallet is currently exposing to this page. Unlike
						<code>eth_requestAccounts</code>, this call does <strong>not</strong> prompt the user for
						permission — it only returns accounts that have already been authorized. A
						privacy-conscious wallet should return an empty array until the user explicitly connects,
						and should only expose accounts selected for this specific origin.
					</p>
				</div>

				<button
					type="button"
					data-pressable
					onclick={callEthAccounts}
					disabled={ethAccountsState.isPending}
					class:running={ethAccountsState.isPending}
				>
					{ethAccountsState.isPending ? 'Calling...' : 'Call eth_accounts'}
				</button>

				{#if ethAccountsState.error}
					<div class="result-box error">
						<span class="result-label">Error</span>
						<code>{ethAccountsState.error}</code>
					</div>
				{/if}

				{#if ethAccountsState.result !== null}
					<div class="result-box" class:empty={ethAccountsState.result.length === 0}>
						<span class="result-label">
							{ethAccountsState.result.length === 0
								? 'No accounts exposed (wallet is isolated)'
								: `${ethAccountsState.result.length} account(s) exposed`}
						</span>
						{#if ethAccountsState.result.length === 0}
							<p class="empty-note">
								The wallet returned an empty array — it is not leaking accounts to this page
								without explicit user permission.
							</p>
						{:else}
							<div class="accounts-list" data-column="gap-1">
								{#each ethAccountsState.result as address (address)}
									<code class="address">{address}</code>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{:else if activeSubTab === 'wallet-connect'}
		<div class="rpc-card" data-card="radius-8 padding-5">
			<div data-column="gap-3">
				<div data-column="gap-1">
					<h3>wallet_connect (ERC-7846)</h3>
					<p class="body-text">
						Calls the <code>wallet_connect</code> RPC defined by
						<a
							href="https://eips.ethereum.org/EIPS/eip-7846"
							target="_blank"
							rel="noopener noreferrer"
						>ERC-7846</a>. This is a privacy-preserving alternative to
						<code>eth_requestAccounts</code>: the wallet presents a permission dialog where the user
						selectively chooses which accounts to share with this page, rather than revealing all
						accounts at once. If the wallet does not support ERC-7846, an error will be returned.
					</p>
				</div>

				<button
					type="button"
					data-pressable
					onclick={callWalletConnect}
					disabled={walletConnectState.isPending}
					class:running={walletConnectState.isPending}
				>
					{walletConnectState.isPending ? 'Calling...' : 'Call wallet_connect'}
				</button>

				{#if walletConnectState.error}
					<div class="result-box error">
						<span class="result-label">Error (wallet may not support ERC-7846)</span>
						<code>{walletConnectState.error}</code>
					</div>
				{/if}

				{#if walletConnectState.result !== null}
					<div class="result-box success">
						<span class="result-label">Response</span>
						<pre class="result-json">{JSON.stringify(walletConnectState.result, null, 2)}</pre>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.app-isolation-tab {
		width: 100%;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
	}

	.body-text {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.rpc-card {
		display: flex;
		flex-direction: column;
	}

	.result-box {
		padding: 1rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--background-secondary) 40%, transparent);
		border: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-box.error {
		background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
		border-color: color-mix(in srgb, var(--rating-fail) 30%, transparent);
	}

	.result-box.empty {
		background: color-mix(in srgb, var(--rating-pass) 10%, transparent);
		border-color: color-mix(in srgb, var(--rating-pass) 30%, transparent);
	}

	.result-box.success {
		background: color-mix(in srgb, var(--rating-pass) 10%, transparent);
		border-color: color-mix(in srgb, var(--rating-pass) 30%, transparent);
	}

	.result-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.result-box.error .result-label {
		color: var(--rating-fail);
	}

	.result-box.empty .result-label,
	.result-box.success .result-label {
		color: var(--rating-pass);
	}

	.empty-note {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.accounts-list {
		margin-top: 0.25rem;
	}

	.address {
		display: block;
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
		background: var(--background-secondary);
		border-radius: 0.25rem;
		word-break: break-all;
	}

	.result-json {
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-all;
		margin: 0;
		padding: 0.5rem;
		background: var(--background-secondary);
		border-radius: 0.25rem;
	}

	button[data-pressable] {
		background-color: var(--accent-color, #3b82f6);
		color: white;
		font-weight: 500;
		padding: 0.6em 1.2em;
		border: none;
		border-radius: 0.5em;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		transition: background-color 0.15s ease, box-shadow 0.15s ease;
		align-self: flex-start;

		&:hover:not(:disabled) {
			background-color: color-mix(in srgb, var(--accent-color, #3b82f6) 85%, black);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
		}

		&:disabled {
			background-color: var(--border-color);
			color: var(--text-secondary);
			cursor: not-allowed;
		}
	}

	button[data-pressable].running {
		opacity: 0.7;
	}
</style>
