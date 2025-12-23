<script lang="ts">
  import { onMount } from 'svelte';
  import {
    connect,
    getAccount,
    sendTransaction,
    signMessage,
    watchAccount,
    type Connector,
  } from '@wagmi/core';
  import { parseEther } from 'viem';
  import config from '../lib/wagmi-config';

  type Account = ReturnType<typeof getAccount>;

  let account = $state<Account | null>(null);
  let txHash = $state<string>('');
  let signature = $state<string>('');
  let isPending = $state(false);
  let isConnecting = $state(false);
  let connectError = $state('');
  let isConnectorModalOpen = $state(false);

  // Some configs may not define connectors at all
  const connectors: readonly Connector[] = (config as { connectors?: readonly Connector[] }).connectors ?? [];

  onMount(() => {
    account = getAccount(config);
    
    const unwatch = watchAccount(config, {
      onChange(data) {
        account = data;
      },
    });

    return () => unwatch();
  });

  function openConnectorModal() {
    if (!connectors.length) {
      connectError = 'No wallet connector available';
      return;
    }

    // If there is only one connector, connect immediately without showing modal
    if (connectors.length === 1) {
      void handleConnect(connectors[0]);
      return;
    }

    isConnectorModalOpen = true;
  }

  function closeConnectorModal() {
    isConnectorModalOpen = false;
  }

  async function handleConnect(connector: Connector) {
    isConnecting = true;
    connectError = '';
    try {
      await connect(config, { connector });
      account = getAccount(config);
      isConnectorModalOpen = false;
    } catch (error) {
      console.error('Connection failed:', error);
      connectError = error instanceof Error ? error.message : 'Failed to connect wallet';
    } finally {
      isConnecting = false;
    }
  }

  async function handleSendETH() {
    if (!account?.address) return;

    isPending = true;
    try {
      const hash = await sendTransaction(config, {
        to: '0x0000000000000000000000000000000000000000', // Replace with actual address
        value: parseEther('0.0001')
      });
      txHash = hash;
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      isPending = false;
    }
  }

  async function handleSignMessage() {
    if (!account?.address) return;

    isPending = true;
    try {
      const sig = await signMessage(config, {
        message: 'Hello'
      });
      signature = sig;
    } catch (error) {
      console.error('Signing failed:', error);
    } finally {
      isPending = false;
    }
  }
</script>

<section
  class="wallet-test"
  data-scroll-item="inline-detached padding-match-start"
  data-column="gap-6"
>
  <header data-row="gap-3 wrap">
    <div data-column="gap-2">
      <h2>Wallet interaction playground</h2>
      <p class="subtitle">
        Quickly test how your wallet behaves when connecting, sending a small ETH transfer, and signing a
        basic message. This runs on your current network and never stores results.
      </p>
    </div>

    <div class="header-actions" data-column="gap-2 end">
      {#if account?.isConnected && account.address}
        <div class="account-pill" data-badge="medium">
          <span class="status-dot" aria-hidden="true"></span>
          <span class="account-label">
            Connected as
            <code>{account.address.slice(0, 6)}…{account.address.slice(-4)}</code>
          </span>
        </div>
      {:else}
        <button
          type="button"
          data-pressable
          onclick={openConnectorModal}
          disabled={isConnecting || !connectors.length}
        >
          {#if isConnecting}
            Connecting…
          {:else if !connectors.length}
            No connectors available
          {:else}
            Connect wallet
          {/if}
        </button>

        {#if connectError}
          <p class="error" role="alert">{connectError}</p>
        {/if}
      {/if}
    </div>
  </header>

  <div class="card-grid" data-column="gap-4">
    {#if !account?.isConnected}
      <section data-card="radius-8 padding-5" class="card">
        <h3>Connect a wallet</h3>
        <p class="body-text">
          To run the tests below, first connect a compatible wallet using the
          <strong>Connect wallet</strong> button in the top‑right corner.
        </p>
        {#if connectors.length > 1}
          <p class="helper-text">
            Multiple providers found — you&apos;ll be able to pick one when connecting.
          </p>
        {/if}
      </section>
    {:else}
      <section data-card="radius-8 padding-5" class="card">
        <h3>Connection</h3>
        <p class="body-text">
          Your wallet is connected. You can now try sending a small ETH transfer or signing a message.
        </p>

        <div class="connection-meta" data-column="gap-2">
          <div data-row="gap-2 wrap">
            <span class="label">Address</span>
            <code class="mono">{account.address}</code>
          </div>
        </div>
      </section>
    {/if}

    <section data-card="radius-8 padding-5" class="card">
      <header data-row="gap-2 start wrap">
        <div data-column="gap-1">
          <h3>Send ETH test</h3>
          <p class="body-text">
            Sends a tiny transfer (0.0001 ETH) to the zero address. Useful for checking gas prompts and
            transaction confirmation flows.
          </p>
        </div>
      </header>

      <div data-column="gap-3">
        <button
          type="button"
          data-pressable
          onclick={handleSendETH}
          disabled={isPending || !account?.address}
        >
          {#if isPending}
            Sending…
          {:else}
            Send 0.0001 ETH
          {/if}
        </button>

        {#if !account?.address}
          <p class="helper-text">Connect a wallet above to enable this test.</p>
        {/if}

        {#if txHash}
          <p class="result">
            Transaction submitted:
            <code>{txHash}</code>
          </p>
        {/if}
      </div>
    </section>

    <section data-card="radius-8 padding-5" class="card">
      <header data-row="gap-2 start wrap">
        <div data-column="gap-1">
          <h3>Sign message test</h3>
          <p class="body-text">
            Asks your wallet to sign the static message <code>&quot;Hello&quot;</code>. Handy for checking
            signature prompts and domain separation behaviour.
          </p>
        </div>
      </header>

      <div data-column="gap-3">
        <button
          type="button"
          data-pressable
          onclick={handleSignMessage}
          disabled={isPending || !account?.address}
        >
          {#if isPending}
            Signing…
          {:else}
            Sign &quot;Hello&quot;
          {/if}
        </button>

        {#if !account?.address}
          <p class="helper-text">Connect a wallet above to enable this test.</p>
        {/if}

        {#if signature}
          <p class="result">
            Signature:
            <code>{signature.slice(0, 18)}…</code>
          </p>
        {/if}
      </div>
    </section>
  </div>

  {#if isConnectorModalOpen}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closeConnectorModal();
        }
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          closeConnectorModal();
        }
      }}
    >
      <div class="modal" data-card="radius-8 padding-5">
        <h3>Select a wallet</h3>

        {#if connectors.length}
          <div class="connector-list" data-column="gap-2">
            {#each connectors as connector}
              <button
                type="button"
                class="connector-button"
                data-pressable
                onclick={() => handleConnect(connector)}
                disabled={isConnecting}
              >
                <span class="connector-name">{connector.name}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="body-text">No wallet connectors available in this environment.</p>
        {/if}

        <div class="modal-footer" data-row="gap-2 end wrap">
          <button
            type="button"
            class="secondary-button"
            onclick={closeConnectorModal}
            disabled={isConnecting}
          >
            Close
          </button>

          {#if connectError}
            <p class="error" role="alert">{connectError}</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .wallet-test {
    max-width: 60rem;
    margin-inline: auto;
  }

  .header-actions {
    margin-inline-start: auto;
    align-items: flex-end;
  }

  .subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
    max-width: 38rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  }

  .card h3 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .body-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .helper-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .result {
    font-size: 0.85rem;
  }

  .mono,
  .result code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
    font-size: 0.8rem;
    background-color: var(--background-secondary);
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
  }

  .account-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 9999px;
    background-color: var(--rating-pass);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--rating-pass) 40%, transparent);
  }

  .account-label {
    font-size: 0.8rem;
  }

  button[data-pressable] {
    min-width: 0;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .modal {
    max-width: 26rem;
    width: 100%;
  }

  .connector-list {
    margin-block: 1rem 1.5rem;
  }

  .connector-button {
    width: 100%;
    justify-content: space-between;
  }

  .connector-name {
    font-weight: 500;
  }

  .modal-footer {
    margin-top: 0.5rem;
  }

  .secondary-button {
    background-color: var(--background-secondary);
  }

  .error {
    font-size: 0.8rem;
    color: var(--rating-fail);
  }
</style>