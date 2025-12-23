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

<div class="wallet-test">
  <h2>Wallet Tests</h2>

  {#if !account?.isConnected}
    <p>Please connect your wallet first</p>
    <button onclick={openConnectorModal} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
    {#if connectError}
      <p class="error">{connectError}</p>
    {/if}
  {:else}
    <div class="test-section">
      <h3>Send ETH Test</h3>
      <button 
        onclick={handleSendETH} 
        disabled={isPending || !account?.address}
      >
        {isPending ? 'Sending...' : 'Send 0.0001 ETH'}
      </button>
      {#if txHash}
        <p>Transaction Hash: {txHash}</p>
      {/if}
    </div>

    <div class="test-section">
      <h3>Sign Message Test</h3>
      <button 
        onclick={handleSignMessage} 
        disabled={isPending || !account?.address}
      >
        {isPending ? 'Signing...' : 'Sign "Hello"'}
      </button>
      {#if signature}
        <p>Signature: {signature.slice(0, 20)}...</p>
      {/if}
    </div>
  {/if}

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
      <div class="modal">
        <h3>Select a wallet</h3>
        {#if connectors.length}
          <div class="connector-list">
            {#each connectors as connector}
              <button
                class="connector-button"
                onclick={() => handleConnect(connector)}
                disabled={isConnecting}
              >
                {connector.name}
              </button>
            {/each}
          </div>
        {:else}
          <p>No wallet connectors available.</p>
        {/if}
        <button class="secondary-button" onclick={closeConnectorModal} disabled={isConnecting}>
          Cancel
        </button>
        {#if connectError}
          <p class="error">{connectError}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .wallet-test {
    padding: 2rem;
  }
  .test-section {
    margin: 2rem 0;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
  button {
    padding: 0.5rem 1rem;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .error {
    margin-top: 0.5rem;
    color: #dc2626;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  .modal {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
  .connector-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0 1.5rem;
  }
  .connector-button {
    width: 100%;
    text-align: left;
  }
  .secondary-button {
    background: #e5e7eb;
    color: #111827;
    margin-top: 0.5rem;
  }
</style>