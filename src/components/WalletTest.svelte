<script lang="ts">
  import { onMount } from 'svelte';
  import {
    connect,
    getAccount,
    sendCalls,
    sendTransaction,
    signMessage,
    signTypedData,
    switchChain,
    watchAccount,
    type Connector,
  } from '@wagmi/core';
  import { mainnet } from '@wagmi/core/chains';
  import { parseEther } from 'viem';
  import config from '../lib/wagmi-config';
	import { testSignatures, testTransactions } from '../constants/test-transactions-signatures'
	import type { TestTransaction, TestSignature } from '../constants/test-transactions-signatures'

  type Account = ReturnType<typeof getAccount>;


  let account = $state<Account | null>(null);
  let isConnecting = $state(false);
  let connectError = $state('');
  let isConnectorModalOpen = $state(false);
  let isChainSwitchModalOpen = $state(false);
  let pendingTransaction = $state<TestTransaction | null>(null);
  let isSwitchingChain = $state(false);
  let chainSwitchError = $state('');

  // Tab state
  let activeTab = $state<'transactions' | 'signatures'>('transactions');
  let selectedTxId = $state<string | null>(null);
  let selectedSigId = $state<string | null>(null);

  // Transaction state
  let activeTxId = $state<string | null>(null);
  let isTxPending = $state(false);
  let transactionHashes = $state<Record<string, `0x${string}`>>({});
  let batchIds = $state<Record<string, string>>({});

  // Signature state
  let activeSigId = $state<string | null>(null);
  let isSigPending = $state(false);
  let signatureResults = $state<Record<string, string>>({});

  // Some configs may not define connectors at all
  const connectors: readonly Connector[] = (config as { connectors?: readonly Connector[] }).connectors ?? [];

  // Test transactions

  // Test signatures


  onMount(() => {
    account = getAccount(config);
    
    const unwatch = watchAccount(config, {
      onChange(data) {
        account = data;
      },
    });

    // Set default selections
    if (activeTab === 'transactions' && testTransactions.length > 0) {
      selectedTxId = testTransactions[0].id;
    } else if (activeTab === 'signatures' && testSignatures.length > 0) {
      selectedSigId = testSignatures[0].id;
    }

    return () => unwatch();
  });

  function openConnectorModal() {
    if (!connectors.length) {
      connectError = 'No wallet connector available';

      return;
    }

    // If there is only one connector, users should connect immediately
    if (connectors.length === 1) {
      void handleConnect(connectors[0]);

      return;
    }

    isConnectorModalOpen = true;
  }

  function closeConnectorModal() {
    isConnectorModalOpen = false;
  }

  function openChainSwitchModal(tx: TestTransaction) {
    pendingTransaction = tx;
    isChainSwitchModalOpen = true;
    chainSwitchError = '';
  }

  function closeChainSwitchModal() {
    isChainSwitchModalOpen = false;
    pendingTransaction = null;
    chainSwitchError = '';
  }

  async function handleSwitchChain() {
    if (!pendingTransaction) return;

    isSwitchingChain = true;
    chainSwitchError = '';

    try {
      await switchChain(config, { chainId: mainnet.id });
      await new Promise((resolve) => setTimeout(resolve, 500));
      account = getAccount(config);
      closeChainSwitchModal();
      await sendTransactionAfterChainSwitch(pendingTransaction);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      chainSwitchError = error instanceof Error ? error.message : 'Failed to switch to mainnet';
    } finally {
      isSwitchingChain = false;
    }
  }

  async function sendTransactionAfterChainSwitch(tx: TestTransaction) {
    if (!account?.address) return;

    isTxPending = true;
    activeTxId = tx.id;

    try {
      // Handle multi-call transactions (EIP-7702)
      if (tx.calls && tx.calls.length > 0) {
        const result = await sendCalls(config, {
          calls: tx.calls,
        });

        // sendCalls returns a batch ID, not a transaction hash
        batchIds[tx.id] = result.id;

        // Try to extract hash if available, otherwise use batch ID
        if ('hash' in result && typeof result.hash === 'string') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          transactionHashes[tx.id] = result.hash as `0x${string}`;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          transactionHashes[tx.id] = result.id as `0x${string}`;
        }
      } else {
        if (!tx.contractAddress) {
          console.error('Contract address is required for this transaction');

          return;
        }

        const hash = await sendTransaction(config, {
          to: tx.contractAddress,
          data: tx.calldata,
          value: tx.value ? parseEther(tx.value) : undefined,
        });

        transactionHashes[tx.id] = hash;
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      isTxPending = false;
      activeTxId = null;
    }
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

  async function handleSendTransaction(tx: TestTransaction) {
    if (!account?.address) return;

    // All transactions should be on mainnet
    if (account.chainId !== undefined && account.chainId !== mainnet.id) {
      openChainSwitchModal(tx);

      return;
    }

    isTxPending = true;
    activeTxId = tx.id;

    try {
      // Handle multi-call transactions (EIP-7702)
      if (tx.calls && tx.calls.length > 0) {
        const result = await sendCalls(config, {
          calls: tx.calls,
        });

        // sendCalls returns a batch ID, not a transaction hash
        batchIds[tx.id] = result.id;

        // Try to extract hash if available, otherwise use batch ID
        if ('hash' in result && typeof result.hash === 'string') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          transactionHashes[tx.id] = result.hash as `0x${string}`;
        } else {
          // Store batch ID as a placeholder - wallets may provide hash later
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          transactionHashes[tx.id] = result.id as `0x${string}`;
        }
      } else {
        // Regular single transaction
        if (!tx.contractAddress) {
          console.error('Contract address is required for this transaction');

          return;
        }

        const hash = await sendTransaction(config, {
          to: tx.contractAddress,
          data: tx.calldata,
          value: tx.value ? parseEther(tx.value) : undefined,
        });

        transactionHashes[tx.id] = hash;
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      isTxPending = false;
      activeTxId = null;
    }
  }

  async function handleSignMessage(sig: TestSignature) {
    if (!account?.address || !sig.message) return;

    isSigPending = true;
    activeSigId = sig.id;

    try {
      const result = await signMessage(config, {
        message: sig.message,
      });

      signatureResults[sig.id] = result;
    } catch (error) {
      console.error('Signing failed:', error);
    } finally {
      isSigPending = false;
      activeSigId = null;
    }
  }

  async function handleSignTypedData(sig: TestSignature) {
    if (
      !account?.address ||
      !sig.domain ||
      !sig.types ||
      !sig.primaryType ||
      !sig.messageData
    ) {
      return;
    }

    isSigPending = true;
    activeSigId = sig.id;

    try {
      const result = await signTypedData(config, {
        domain: sig.domain,
        types: sig.types,
        primaryType: sig.primaryType,
        message: sig.messageData,
      });

      signatureResults[sig.id] = result;
    } catch (error) {
      console.error('Typed data signing failed:', error);
    } finally {
      isSigPending = false;
      activeSigId = null;
    }
  }

  function getTransactionHash(txId: string): `0x${string}` | undefined {
    return transactionHashes[txId];
  }

  function getSignatureResult(sigId: string): string | undefined {
    return signatureResults[sigId];
  }

  function openInExplorer(txHash: string) {
    const explorerUrl = `https://etherscan.io/tx/${txHash}`;

    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
  }

  function formatValue(value: string, type: string): string {
    if (type === 'uint256' && value.length > 10) {
      try {
        const num = BigInt(value);
        const ether = Number(num) / 1e18;

        if (ether >= 0.0001) {
          return `${value} (${ether.toFixed(4)} ETH)`;
        }
      } catch (e) {
        // If parsing fails, just return the value
      }
    }

    return value;
  }

  // Update SIWE message when account changes
  $effect(() => {
    const siweSig = testSignatures.find((s) => s.id === 'siwe-1');

    if (siweSig && siweSig.type === 'message') {
      const address = account?.address || '0x0000000000000000000000000000000000000000';

      siweSig.message = `https://portfolio.mjtpediglorio.com wants you to sign in with your Ethereum account:
${address}

Sign in to authenticate your wallet. This is a test SIWE message.

URI: https://portfolio.mjtpediglorio.com
Version: 1
Chain ID: 1
Nonce: ${Math.random().toString(36).substring(2, 15)}
Issued At: ${new Date().toISOString()}`;
    }
  });
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
        Quickly test how your wallet behaves when connecting, sending transactions, and signing messages.
        This runs on your current network and never stores results.
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

  <!-- Main Tab Selector -->
  <div class="tab-selector" data-row="gap-2">
    <button
      type="button"
      class="tab-button"
      class:active={activeTab === 'transactions'}
      onclick={() => {
        activeTab = 'transactions';

        if (testTransactions.length > 0 && !selectedTxId) {
          selectedTxId = testTransactions[0].id;
        }
      }}
    >
      Transactions
    </button>
    <button
      type="button"
      class="tab-button"
      class:active={activeTab === 'signatures'}
      onclick={() => {
        activeTab = 'signatures';

        if (testSignatures.length > 0 && !selectedSigId) {
          selectedSigId = testSignatures[0].id;
        }
      }}
    >
      Signatures
    </button>
  </div>

  <!-- Content Area -->
  <div class="content-wrapper" data-row="gap-6">
    <!-- Left Sidebar - Transaction/Signature List -->
    <div class="sidebar">
      <div class="sidebar-content" data-card="radius-8 padding-2">
        {#if activeTab === 'transactions'}
          {#each testTransactions as tx}
            {@const isSelected = selectedTxId === tx.id}
            {@const txHash = getTransactionHash(tx.id)}
            <button
              type="button"
              class="sidebar-item"
              class:selected={isSelected}
              onclick={() => (selectedTxId = tx.id)}
            >
              <div class="sidebar-item-header">
                <h3 class="sidebar-item-title">{tx.name}</h3>
                {#if txHash}
                  <span class="sidebar-item-check">✓</span>
                {/if}
              </div>
              {#if tx.description}
                <p class="sidebar-item-desc">{tx.description}</p>
              {/if}
            </button>
          {/each}
        {:else}
          {#each testSignatures as sig}
            {@const isSelected = selectedSigId === sig.id}
            {@const sigResult = getSignatureResult(sig.id)}
            <button
              type="button"
              class="sidebar-item"
              class:selected={isSelected}
              onclick={() => (selectedSigId = sig.id)}
            >
              <div class="sidebar-item-header">
                <h3 class="sidebar-item-title">{sig.name}</h3>
                {#if sigResult}
                  <span class="sidebar-item-check">✓</span>
                {/if}
              </div>
              {#if sig.description}
                <p class="sidebar-item-desc">{sig.description}</p>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Content - Selected Details -->
    <div class="main-content">
      {#if activeTab === 'transactions'}
        {#if selectedTxId}
          {@const selectedTx = testTransactions.find((tx) => tx.id === selectedTxId)}
          {#if selectedTx}
            {@const isActive = activeTxId === selectedTx.id}
            {@const isTxPendingLocal = isTxPending && isActive}
            {@const txHash = getTransactionHash(selectedTx.id)}
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
                    onclick={() => openInExplorer(txHash)}
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
                      {#each selectedTx.requirements as requirement}
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
                      {#each selectedTx.parameters as param}
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
                      {#each selectedTx.calls as call, idx}
                        <div class="parameter-item">
                          <div class="parameter-header">
                            <span class="parameter-name">Call {idx + 1}</span>
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
                  onclick={() => handleSendTransaction(selectedTx)}
                  disabled={!account?.address || isTxPendingLocal || (!selectedTx.calls && !selectedTx.contractAddress) || (selectedTx.calls && selectedTx.calls.length === 0)}
                >
                  {#if isTxPendingLocal}
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
                    <button
                      type="button"
                      class="result-link"
                      onclick={() => openInExplorer(txHash)}
                    >
                      {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/if}
      {:else}
        {#if selectedSigId}
          {@const selectedSig = testSignatures.find((sig) => sig.id === selectedSigId)}
          {#if selectedSig}
            {@const isActive = activeSigId === selectedSig.id}
            {@const isSigPendingLocal = isSigPending && isActive}
            {@const sigResult = getSignatureResult(selectedSig.id)}
            <div class="detail-card" data-card="radius-8 padding-5">
              <header data-row="gap-2 start wrap">
                <div data-column="gap-1">
                  <h3>{selectedSig.name}</h3>
                  {#if selectedSig.description}
                    <p class="body-text">{selectedSig.description}</p>
                  {/if}
                </div>
              </header>

              <div data-column="gap-4">
                {#if selectedSig.requirements && selectedSig.requirements.length > 0}
                  <div class="requirements-box">
                    <h4 class="requirements-title">📋 Safety Notes:</h4>
                    <ul class="requirements-list">
                      {#each selectedSig.requirements as requirement}
                        <li>{requirement}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                <div class="detail-section">
                  <span class="detail-label">📝 Signature Type:</span>
                  <code class="detail-code">
                    {selectedSig.type === 'message' ? 'Simple Message' : 'EIP-712 Typed Data'}
                  </code>
                </div>

                {#if selectedSig.type === 'message' && selectedSig.message}
                  <div class="detail-section">
                    <span class="detail-label">💬 Message:</span>
                    <code class="detail-code message-content">{selectedSig.message}</code>
                  </div>
                {/if}

                {#if selectedSig.type === 'typed' && selectedSig.domain}
                  <div class="detail-section">
                    <span class="detail-label">🏷️ Domain:</span>
                    <div class="domain-box">
                      <div class="domain-item">
                        <span class="domain-key">Name:</span> {selectedSig.domain.name}
                      </div>
                      <div class="domain-item">
                        <span class="domain-key">Version:</span> {selectedSig.domain.version}
                      </div>
                      <div class="domain-item">
                        <span class="domain-key">Chain ID:</span> {selectedSig.domain.chainId}
                      </div>
                      <div class="domain-item">
                        <span class="domain-key">Verifying Contract:</span> {selectedSig.domain.verifyingContract}
                      </div>
                      <div class="domain-item">
                        <span class="domain-key">Salt:</span> {selectedSig.domain.salt}
                      </div>
                    </div>
                  </div>

                  {#if selectedSig.primaryType}
                    <div class="detail-section">
                      <span class="detail-label">📋 Primary Type:</span>
                      <code class="detail-code">{selectedSig.primaryType}</code>
                    </div>
                  {/if}

                  {#if selectedSig.messageData}
                    <div class="detail-section">
                      <span class="detail-label">💬 Message Data:</span>
                      <code class="detail-code message-content">
                        {JSON.stringify(selectedSig.messageData, null, 2)}
                      </code>
                    </div>
                  {/if}
                {/if}

                <div class="warning-box warning-yellow">
                  <p class="warning-text">
                    <strong>⚠️ WARNING:</strong> Only sign messages you trust. This page is for testing and
                    educational purposes only.
                  </p>
                </div>

                <button
                  type="button"
                  data-pressable
                  onclick={() => {
                    if (selectedSig.type === 'message') {
                      void handleSignMessage(selectedSig);
                    } else {
                      void handleSignTypedData(selectedSig);
                    }
                  }}
                  disabled={!account?.address || isSigPendingLocal}
                >
                  {#if isSigPendingLocal}
                    Signing…
                  {:else if sigResult}
                    Signature Created ✓
                  {:else}
                    Sign {selectedSig.type === 'message' ? 'Message' : 'Typed Data'}
                  {/if}
                </button>

                {#if sigResult}
                  <div class="result-box">
                    <span class="result-label">Signature:</span>
                    <code class="signature-result">{sigResult}</code>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/if}
      {/if}
    </div>
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

  {#if isChainSwitchModalOpen}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closeChainSwitchModal();
        }
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          closeChainSwitchModal();
        }
      }}
    >
      <div class="modal" data-card="radius-8 padding-5">
        <h3>Switch to Ethereum Mainnet</h3>

        <div class="body-text" data-column="gap-2">
          <p>
            You are currently on chain ID <strong>{account?.chainId ?? 'unknown'}</strong>.
            These test transactions require Ethereum mainnet (chain ID 1).
          </p>
          <p>
            Would you like to switch to mainnet?
          </p>
        </div>

        <div class="modal-footer" data-row="gap-2 end wrap">
          <button
            type="button"
            class="secondary-button"
            onclick={closeChainSwitchModal}
            disabled={isSwitchingChain}
          >
            Cancel
          </button>
          <button
            type="button"
            data-pressable
            onclick={handleSwitchChain}
            disabled={isSwitchingChain}
          >
            {#if isSwitchingChain}
              Switching…
            {:else}
              Switch to Mainnet
            {/if}
          </button>

          {#if chainSwitchError}
            <p class="error" role="alert">{chainSwitchError}</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .wallet-test {
    max-width: 80rem;
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

  .tab-selector {
		justify-content: flex-start;
    gap: 0.75rem;
    border-bottom: 1px solid var(--background-secondary);
    padding-bottom: 0.5rem;
  }

  .tab-button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -0.5rem;
    transition: all 0.2s;
  }

  .tab-button:hover {
    color: var(--text-primary);
  }

  .tab-button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .content-wrapper {
    align-items: flex-start;
  }

  .sidebar {
    width: 18rem;
    flex-shrink: 0;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sidebar-item {
    width: 100%;
    text-align: left;
    padding: 1rem;
    border: none;
    background: var(--background-secondary);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sidebar-item:hover {
    background: color-mix(in srgb, var(--background-secondary) 80%, var(--accent));
  }

  .sidebar-item.selected {
    background: var(--accent);
    color: var(--background-primary);
  }

  .sidebar-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .sidebar-item-title {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
  }

  .sidebar-item-check {
    font-size: 0.8rem;
    color: var(--rating-pass);
  }

  .sidebar-item.selected .sidebar-item-check {
    color: var(--background-primary);
  }

  .sidebar-item-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .sidebar-item.selected .sidebar-item-desc {
    color: color-mix(in srgb, var(--background-primary) 70%, transparent);
  }

  .main-content {
    flex: 1;
    min-width: 0;
  }

  .detail-card h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
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

  .detail-code.message-content {
    white-space: pre-wrap;
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
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
    font-size: 0.75rem;
    color: var(--text-primary);
    word-break: break-all;
  }

  .domain-box {
    padding: 0.75rem;
    background: var(--background-secondary);
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .domain-item {
    font-size: 0.8rem;
    color: var(--text-primary);
  }

  .domain-key {
    font-weight: 500;
    color: var(--accent);
  }

  .warning-box {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
    border-radius: 0.5rem;
  }

  .warning-box.warning-yellow {
    background: color-mix(in srgb, #fbbf24 10%, transparent);
    border-color: color-mix(in srgb, #fbbf24 30%, transparent);
  }

  .warning-text {
    font-size: 0.8rem;
    color: var(--rating-fail);
    margin: 0;
    text-align: center;
  }

  .warning-box.warning-yellow .warning-text {
    color: #fbbf24;
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

  .signature-result {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
    font-size: 0.75rem;
    background: color-mix(in srgb, var(--background-primary) 50%, transparent);
    padding: 0.75rem;
    border-radius: 0.5rem;
    word-break: break-all;
    color: var(--text-primary);
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