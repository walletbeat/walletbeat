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
  import config from '../lib/wagmi-config';
  import { testSignatures, testTransactions } from '../constants/test-transactions-signatures';
  import type { TestTransaction, TestSignature } from '../constants/test-transactions-signatures';
  
  import Modal from './Modal.svelte';
  import SidebarItem from './SidebarItem.svelte';
  import ErrorComponent from './ErrorComponent.svelte';

  type Account = ReturnType<typeof getAccount>;

  // Consolidated state objects
  let account = $state<Account | null>(null);
  
  const connectionState = $state({
    isConnecting: false,
    error: '',
    isModalOpen: false,
  });

  const chainState = $state({
    isSwitching: false,
    error: '',
    isModalOpen: false,
    pendingTransaction: null as TestTransaction | null,
  });

  const transactionState = $state({
    activeId: null as string | null,
    isPending: false,
    hashes: {} as Record<string, `0x${string}`>,
    batchIds: {} as Record<string, string>,
    error: '',
  });

  const signatureState = $state({
    activeId: null as string | null,
    isPending: false,
    results: {} as Record<string, string>,
    error: '',
  });

  const uiState = $state({
    activeTab: 'transactions' as 'transactions' | 'signatures',
    selectedTxId: null as string | null,
    selectedSigId: null as string | null,
  });

  const connectors: readonly Connector[] = (config as { connectors?: readonly Connector[] }).connectors ?? [];

  onMount(() => {
    account = getAccount(config);
    const unwatch = watchAccount(config, { onChange: (data) => (account = data) });

    // Set default selections
    if (testTransactions.length > 0) uiState.selectedTxId = testTransactions[0].id;

    if (testSignatures.length > 0) uiState.selectedSigId = testSignatures[0].id;

    return unwatch;
  });

  // Helper functions
  function updateSIWEMessage() {
    const siweSig = testSignatures.find((s) => s.id === 'siwe-1');

    if (siweSig?.type === 'message') {
      const address = account?.address || '0x0000000000000000000000000000000000000000';

      siweSig.message = `https://beta.walletbeat.eth.limo/ wants you to sign in with your Ethereum account:
${address}

Sign in to authenticate your wallet. This is a test SIWE message.

URI: https://beta.walletbeat.eth.limo/
Version: 1
Chain ID: 1
Nonce: ${Math.random().toString(36).substring(2, 15)}
Issued At: ${new Date().toISOString()}`;
    }
  }

  function formatValue(value: string, type: string): string {
    if (type === 'uint256' && value.length > 10) {
      try {
        const num = BigInt(value);
        const ether = Number(num) / 1e18;

        if (ether >= 0.0001) {
          return `${value} (${ether.toFixed(4)} ETH)`;
        }
      } catch {
        // If parsing fails, just return the value
      }
    }

    return value;
  }

  function openInExplorer(txHash: string) {
    window.open(`https://etherscan.io/tx/${txHash}`, '_blank', 'noopener,noreferrer');
  }

  // Connection handlers
  function openConnectorModal() {
    if (!connectors.length) {
      connectionState.error = 'No wallet connector available';

      return;
    }

    if (connectors.length === 1) {
      void handleConnect(connectors[0]);

      return;
    }

    connectionState.isModalOpen = true;
  }

  async function handleConnect(connector: Connector) {
    connectionState.isConnecting = true;
    connectionState.error = '';

    try {
      await connect(config, { connector });
      account = getAccount(config);
      connectionState.isModalOpen = false;
    } catch (error) {
      connectionState.error = error instanceof Error ? error.message : 'Failed to connect wallet';
    } finally {
      connectionState.isConnecting = false;
    }
  }

  // Chain switch handlers
  function openChainSwitchModal(tx: TestTransaction) {
    chainState.pendingTransaction = tx;
    chainState.isModalOpen = true;
    chainState.error = '';
  }

  async function handleSwitchChain() {
    if (!chainState.pendingTransaction) return;

    chainState.isSwitching = true;
    chainState.error = '';

    try {
      await switchChain(config, { chainId: mainnet.id });
      await new Promise((resolve) => setTimeout(resolve, 500));
      account = getAccount(config);
      const tx = chainState.pendingTransaction;

      chainState.isModalOpen = false;
      chainState.pendingTransaction = null;
      await sendTransactionInternal(tx);
    } catch (error) {
      chainState.error = error instanceof Error ? error.message : 'Failed to switch to mainnet';
    } finally {
      chainState.isSwitching = false;
    }
  }

  // Transaction handlers
  async function sendTransactionInternal(tx: TestTransaction) {
    if (!account?.address) return;

    transactionState.isPending = true;
    transactionState.activeId = tx.id;
    transactionState.error = '';

    try {
      if (tx.calls && tx.calls.length > 0) {
        const result = await sendCalls(config, { calls: tx.calls });

        transactionState.batchIds[tx.id] = result.id;

        if ('hash' in result && typeof result.hash === 'string') {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we're just asserting the has as `0x{string}`
          transactionState.hashes[tx.id] = result.hash as `0x${string}`;
        } else {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we're just asserting the has as `0x{string}`
          transactionState.hashes[tx.id] = result.id as `0x${string}`;
        }
      } else {
        if (!tx.contractAddress) {
          transactionState.error = 'Contract address is required for this transaction';

          return;
        }

        const hash = await sendTransaction(config, {
          to: tx.contractAddress,
          data: tx.calldata,
          value: tx.value ? tx.value : undefined,
        });

        transactionState.hashes[tx.id] = hash;
      }
    } catch (error) {
      transactionState.error = error instanceof Error ? error.message : 'Transaction failed';
    } finally {
      transactionState.isPending = false;
      transactionState.activeId = null;
    }
  }

  async function handleSendTransaction(tx: TestTransaction) {
    if (!account?.address) return;

    if (account.chainId !== undefined && account.chainId !== mainnet.id) {
      openChainSwitchModal(tx);

      return;
    }

    await sendTransactionInternal(tx);
  }

  // Signature handlers
  async function handleSignMessage(sig: TestSignature) {
    if (!account?.address || !sig.message) return;

    signatureState.isPending = true;
    signatureState.activeId = sig.id;
    signatureState.error = '';

    try {
      const result = await signMessage(config, { message: sig.message });

      signatureState.results[sig.id] = result;
    } catch (error) {
      signatureState.error = error instanceof Error ? error.message : 'Signing failed';
    } finally {
      signatureState.isPending = false;
      signatureState.activeId = null;
    }
  }

  async function handleSignTypedData(sig: TestSignature) {
    if (!account?.address || !sig.domain || !sig.types || !sig.primaryType || !sig.messageData) {
      return;
    }

    signatureState.isPending = true;
    signatureState.activeId = sig.id;
    signatureState.error = '';

    try {
      if (!sig.types || !sig.messageData) {
        signatureState.error = 'Missing types or messageData for typed data signature';

        return;
      }

      const result = await signTypedData(config, {
        domain: sig.domain,
        types: sig.types,
        primaryType: sig.primaryType,
        message: sig.messageData,
      });

      signatureState.results[sig.id] = result;
    } catch (error) {
      signatureState.error = error instanceof Error ? error.message : 'Typed data signing failed';
    } finally {
      signatureState.isPending = false;
      signatureState.activeId = null;
    }
  }

  // Update SIWE message when account changes
  $effect(() => {
    updateSIWEMessage();
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
          disabled={connectionState.isConnecting || !connectors.length}
        >
          {#if connectionState.isConnecting}
            Connecting…
          {:else if !connectors.length}
            No connectors available
          {:else}
            Connect wallet
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <!-- Tab Selector -->
  <div class="tab-selector" data-row="gap-2">
    {#each ['transactions', 'signatures'] as tab (tab)}
      <button
        type="button"
        class="tab-button"
        class:active={uiState.activeTab === tab}
        onclick={() => {
          uiState.activeTab = tab === 'transactions' ? 'transactions' : 'signatures';

          if (tab === 'transactions' && !uiState.selectedTxId && testTransactions.length) {
            uiState.selectedTxId = testTransactions[0].id;
          } else if (tab === 'signatures' && !uiState.selectedSigId && testSignatures.length) {
            uiState.selectedSigId = testSignatures[0].id;
          }
        }}
      >
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    {/each}
  </div>

  <!-- Content Area -->
  <div class="content-wrapper" data-row="gap-6">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-content" data-card="radius-8 padding-2">
        {#if uiState.activeTab === 'transactions'}
          {#each testTransactions as tx}
            <SidebarItem
              title={tx.name}
              description={tx.description}
              isSelected={uiState.selectedTxId === tx.id}
              isCompleted={!!transactionState.hashes[tx.id]}
              onclick={() => (uiState.selectedTxId = tx.id)}
            />
          {/each}
        {:else}
          {#each testSignatures as sig}
            <SidebarItem
              title={sig.name}
              description={sig.description}
              isSelected={uiState.selectedSigId === sig.id}
              isCompleted={!!signatureState.results[sig.id]}
              onclick={() => (uiState.selectedSigId = sig.id)}
            />
          {/each}
        {/if}
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      {#if uiState.activeTab === 'transactions' && uiState.selectedTxId}
        {@const selectedTx = testTransactions.find((tx) => tx.id === uiState.selectedTxId)}
        {#if selectedTx}
          {@const isActive = transactionState.activeId === selectedTx.id}
          {@const isPending = transactionState.isPending && isActive}
          {@const txHash = transactionState.hashes[selectedTx.id]}
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
                disabled={!account?.address || isPending || (!selectedTx.calls && !selectedTx.contractAddress) || (selectedTx.calls && selectedTx.calls.length === 0)}
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
                  <button type="button" class="result-link" onclick={() => openInExplorer(txHash)}>
                    {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {:else if uiState.activeTab === 'signatures' && uiState.selectedSigId}
        {@const selectedSig = testSignatures.find((sig) => sig.id === uiState.selectedSigId)}
        {#if selectedSig}
          {@const isActive = signatureState.activeId === selectedSig.id}
          {@const isPending = signatureState.isPending && isActive}
          {@const sigResult = signatureState.results[selectedSig.id]}
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
                disabled={!account?.address || isPending}
              >
                {#if isPending}
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
    </div>
  </div>

  <!-- Connector Modal -->
  <Modal
    isOpen={connectionState.isModalOpen}
    title="Select a wallet"
    onClose={() => (connectionState.isModalOpen = false)}
  >
    {#if connectors.length}
      <div class="connector-list" data-column="gap-2">
        {#each connectors as connector (connector.uid)}
          <button
            type="button"
            class="connector-button"
            data-pressable
            onclick={() => handleConnect(connector)}
            disabled={connectionState.isConnecting}
          >
            <span class="connector-name">{connector.name}</span>
          </button>
        {/each}
      </div>
    {:else}
      <p class="body-text">No wallet connectors available in this environment.</p>
    {/if}
    {#snippet footer()}
      <button
        type="button"
        class="secondary-button"
        onclick={() => (connectionState.isModalOpen = false)}
        disabled={connectionState.isConnecting}
      >
        Close
      </button>
    {/snippet}
  </Modal>

  <!-- Chain Switch Modal -->
  <Modal
    isOpen={chainState.isModalOpen}
    title="Switch to Ethereum Mainnet"
    onClose={() => {
      chainState.isModalOpen = false;
      chainState.pendingTransaction = null;
      chainState.error = '';
    }}
  >
    <div class="body-text" data-column="gap-2">
      <p>
        You are currently on chain ID <strong>{account?.chainId ?? 'unknown'}</strong>.
        These test transactions require Ethereum mainnet (chain ID 1).
      </p>
      <p>Would you like to switch to mainnet?</p>
    </div>
    {#snippet footer()}
      <button
        type="button"
        class="secondary-button"
        onclick={() => {
          chainState.isModalOpen = false;
          chainState.pendingTransaction = null;
        }}
        disabled={chainState.isSwitching}
      >
        Cancel
      </button>
      <button
        type="button"
        data-pressable
        onclick={handleSwitchChain}
        disabled={chainState.isSwitching}
      >
        {chainState.isSwitching ? 'Switching…' : 'Switch to Mainnet'}
      </button>
    {/snippet}
  </Modal>

  <!-- Error Components -->
  <ErrorComponent error={connectionState.error} onClose={() => (connectionState.error = '')} />
  <ErrorComponent error={chainState.error} onClose={() => (chainState.error = '')} />
  <ErrorComponent error={transactionState.error} onClose={() => (transactionState.error = '')} />
  <ErrorComponent error={signatureState.error} onClose={() => (signatureState.error = '')} />
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
		margin-bottom: 1.5rem;
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

  .main-content {
    flex: 1;
    min-width: 0;
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

  .secondary-button {
    background-color: var(--background-secondary);
  }
</style>