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
  import { eipTests } from '../constants/test-eip-support';
  import type { EIPTest, EIPTestStatus } from '../constants/test-eip-support';

  import ErrorComponent from './ErrorComponent.svelte';
  import SideBarItem from './SideBarItem.svelte';
  import ConnectorModal from './Modals/ConnectorModal.svelte';
  import ChainSwitchModal from './Modals/ChainSwitchModal.svelte';
  import EIPResultsModal from './Modals/EIPResultsModal.svelte';

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

  const eipState = $state({
    activeId: null as string | null,
    isTesting: false,
    results: {} as Record<string, Record<string, EIPTestStatus>>,
    error: '',
    discoveredProviders: [] as Array<{
      uuid: string;
      name: string;
      icon: string;
      rdns: string;
      provider: unknown;
    }>,
    resultsModal: {
      isOpen: false,
      eipId: null as string | null,
      passed: false,
      failedChecks: [] as Array<{ name: string; description: string }>,
    },
  });

  const uiState = $state({
    activeTab: 'transactions' as 'transactions' | 'signatures' | 'eip-support',
    selectedTxId: null as string | null,
    selectedSigId: null as string | null,
    selectedEipId: null as string | null,
  });

  const connectors: readonly Connector[] = (config as { connectors?: readonly Connector[] }).connectors ?? [];

  onMount(() => {
    account = getAccount(config);
    const unwatch = watchAccount(config, { onChange: (data) => (account = data) });

    // Set default selections
    if (testTransactions.length > 0) uiState.selectedTxId = testTransactions[0].id;

    if (testSignatures.length > 0) uiState.selectedSigId = testSignatures[0].id;

    if (eipTests.length > 0) uiState.selectedEipId = eipTests[0].id;

    // Discover EIP-6963 providers
    discoverProviders();

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

  // EIP Support Testing
  function getProvider() {
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      return window.ethereum;
    }

    return null;
  }

  function discoverProviders() {
    if (typeof window === 'undefined') return;

    // Listen for EIP-6963 provider announcements
    window.addEventListener('eip6963:announceProvider', (event: Event) => {
      const customEvent = event as CustomEvent<{
        info: { uuid: string; name: string; icon: string; rdns: string };
        provider: unknown;
      }>;

      const { info, provider } = customEvent.detail;

      // Check if we already have this provider
      const exists = eipState.discoveredProviders.some((p) => p.uuid === info.uuid);

      if (!exists) {
        eipState.discoveredProviders.push({
          uuid: info.uuid,
          name: info.name,
          icon: info.icon,
          rdns: info.rdns,
          provider,
        });
      }
    });

    // Request providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  async function testEIPSupport(eip: EIPTest) {
    eipState.isTesting = true;
    eipState.activeId = eip.id;
    eipState.error = '';

    const results: Record<string, EIPTestStatus> = {};

    try {
      // Check if there are multiple connectors
      if (connectors.length > 1) {
        throw new Error('Multiple wallets/connectors detected. Please ensure only one wallet extension is active when running EIP tests.');
      }

      if (eip.id === 'eip-1193') {
        await testEIP1193(results);
      } else if (eip.id === 'eip-2700') {
        await testEIP2700(results);
      } else if (eip.id === 'eip-6963') {
        await testEIP6963(results);
      } else if (eip.id === 'eip-5792') {
        await testEIP5792(results);
      }

      eipState.results[eip.id] = results;

      // Analyze results and show modal
      analyzeAndShowResults(eip, results);
    } catch (error) {
      eipState.error = error instanceof Error ? error.message : 'EIP testing failed';
    } finally {
      eipState.isTesting = false;
      eipState.activeId = null;
    }
  }

  function analyzeAndShowResults(eip: EIPTest, results: Record<string, EIPTestStatus>) {
    // Find all critical (required) checks that failed
    const failedChecks: Array<{ name: string; description: string }> = [];

    for (const check of eip.checks) {
      if (check.critical) {
        const status = results[check.id];
        if (status === 'fail' || status === 'untested') {
          failedChecks.push({
            name: check.name,
            description: check.description,
          });
        }
      }
    }

    // Test passes if all required checks passed
    const passed = failedChecks.length === 0;

    // Show results modal
    eipState.resultsModal.eipId = eip.id;
    eipState.resultsModal.passed = passed;
    eipState.resultsModal.failedChecks = failedChecks;
    eipState.resultsModal.isOpen = true;
  }

  async function testEIP1193(results: Record<string, EIPTestStatus>) {
    const provider = getProvider() as {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, listener: () => void) => void;
      removeListener?: (event: string, listener: () => void) => void;
    } | null;

    // Check provider existence
    results['has-provider'] = provider ? 'pass' : 'fail';

    if (!provider) return;

    // Check request method
    results['has-request'] = typeof provider.request === 'function' ? 'pass' : 'fail';

    // Check on method
    results['has-on'] = typeof provider.on === 'function' ? 'pass' : 'fail';

    // Check removeListener method
    results['has-removeListener'] =
      typeof provider.removeListener === 'function' ? 'pass' : 'fail';

    // Check event support (we can only check if the methods exist, not if events actually fire)
    results['supports-accountsChanged'] = typeof provider.on === 'function' ? 'pass' : 'fail';
    results['supports-chainChanged'] = typeof provider.on === 'function' ? 'pass' : 'fail';
    results['supports-connect'] = typeof provider.on === 'function' ? 'pass' : 'fail';
    results['supports-disconnect'] = typeof provider.on === 'function' ? 'pass' : 'fail';

    // Try eth_accounts
    try {
      if (provider.request) {
        await provider.request({ method: 'eth_accounts' });
        results['eth-accounts'] = 'pass';
      } else {
        results['eth-accounts'] = 'fail';
      }
    } catch {
      results['eth-accounts'] = 'fail';
    }

    // Don't auto-test eth_requestAccounts as it shows a prompt
    results['eth-requestAccounts'] = 'untested';
  }

  async function testEIP2700(results: Record<string, EIPTestStatus>) {
    const provider = getProvider() as {
      on?: (event: string, listener: () => void) => void;
      removeListener?: (event: string, listener: () => void) => void;
      addListener?: (event: string, listener: () => void) => void;
      removeAllListeners?: (event?: string) => void;
      listeners?: (event: string) => unknown[];
      once?: (event: string, listener: () => void) => void;
      emit?: (event: string, ...args: unknown[]) => boolean;
    } | null;

    if (!provider) {
      // Mark all as fail if no provider
      results['has-on'] = 'fail';
      results['has-removeListener'] = 'fail';
      results['has-addListener'] = 'fail';
      results['has-removeAllListeners'] = 'fail';
      results['has-listeners'] = 'fail';
      results['has-once'] = 'fail';
      results['has-emit'] = 'fail';
      results['supports-message-event'] = 'fail';

      return;
    }

    // Check on method
    results['has-on'] = typeof provider.on === 'function' ? 'pass' : 'fail';

    // Check removeListener method
    results['has-removeListener'] =
      typeof provider.removeListener === 'function' ? 'pass' : 'fail';

    // Check addListener method (alias for on)
    results['has-addListener'] = typeof provider.addListener === 'function' ? 'pass' : 'fail';

    // Check removeAllListeners method
    results['has-removeAllListeners'] =
      typeof provider.removeAllListeners === 'function' ? 'pass' : 'fail';

    // Check listeners method
    results['has-listeners'] = typeof provider.listeners === 'function' ? 'pass' : 'fail';

    // Check once method
    results['has-once'] = typeof provider.once === 'function' ? 'pass' : 'fail';

    // Check emit method
    results['has-emit'] = typeof provider.emit === 'function' ? 'pass' : 'fail';

    // Test message event support (we can only check if the on method exists for now)
    results['supports-message-event'] = typeof provider.on === 'function' ? 'pass' : 'fail';
  }

  async function testEIP6963(results: Record<string, EIPTestStatus>) {
    // Check if any providers were discovered
    results['announces-provider'] =
      eipState.discoveredProviders.length > 0 ? 'pass' : 'fail';
    results['responds-to-request'] =
      eipState.discoveredProviders.length > 0 ? 'pass' : 'fail';

    if (eipState.discoveredProviders.length > 0) {
      const provider = eipState.discoveredProviders[0];

      // Check provider info
      results['has-provider-info'] =
        provider.name && provider.uuid && provider.rdns ? 'pass' : 'fail';

      // Check UUID
      results['unique-uuid'] = provider.uuid && provider.uuid.length > 0 ? 'pass' : 'fail';

      // Check icon
      results['valid-icon'] =
        provider.icon &&
        (provider.icon.startsWith('data:') || provider.icon.startsWith('https://'))
          ? 'pass'
          : 'fail';

      // Check RDNS format (should be reverse domain name like com.example.wallet)
      const rdnsRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i;

      results['rdns-format'] = rdnsRegex.test(provider.rdns) ? 'pass' : 'fail';
    } else {
      results['has-provider-info'] = 'fail';
      results['unique-uuid'] = 'fail';
      results['valid-icon'] = 'fail';
      results['rdns-format'] = 'fail';
    }
  }

  async function testEIP5792(results: Record<string, EIPTestStatus>) {
    const provider = getProvider() as {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    } | null;

    if (!provider || !provider.request) {
      // Mark all as fail if no provider
      results['has-sendCalls'] = 'fail';
      results['has-getCallsStatus'] = 'fail';
      results['has-showCallsStatus'] = 'fail';
      results['has-getCapabilities'] = 'fail';
      results['atomicity-support'] = 'fail';
      results['atomicity-enforcement'] = 'untested';

      return;
    }

    // Test wallet_getCapabilities
    try {
      const capabilities = (await provider.request({
        method: 'wallet_getCapabilities',
        params: [account?.address],
      })) as Record<string, { atomicBatch?: { supported: boolean } }>;

      results['has-getCapabilities'] = 'pass';

      // Check for atomicity support
      const chainId = account?.chainId?.toString() || '0x1';
      const hasAtomicBatch = capabilities?.[chainId]?.atomicBatch?.supported === true;

      results['atomicity-support'] = hasAtomicBatch ? 'pass' : 'fail';
    } catch {
      results['has-getCapabilities'] = 'fail';
      results['atomicity-support'] = 'untested';
    }

    // Test wallet_sendCalls (just check if method exists, don't actually send)
    try {
      // We can't actually test this without sending a transaction
      // So we check if the error message indicates the method exists but params are wrong
      await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0.0',
            chainId: '0x1',
            from: account?.address || '0x0000000000000000000000000000000000000000',
            calls: [
              {
                to: '0x0000000000000000000000000000000000000000',
                data: '0x00',
                value: '0x0',
              },
            ],
            atomicRequired: false,
          },
        ],
      });
      results['has-sendCalls'] = 'pass';
    } catch (error) {
      // If error mentions invalid params, method exists
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

      results['has-sendCalls'] =
        errorMessage.includes('param') || errorMessage.includes('argument')
          ? 'partial'
          : 'fail';
    }

    // Test wallet_getCallsStatus
    try {
      await provider.request({
        method: 'wallet_getCallsStatus',
        params: ['0x1234567890abcdef'],
      });
      results['has-getCallsStatus'] = 'pass';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

      results['has-getCallsStatus'] =
        errorMessage.includes('param') || errorMessage.includes('argument') || errorMessage.includes('not found')
          ? 'partial'
          : 'fail';
    }

    // Test wallet_showCallsStatus (optional method)
    try {
      await provider.request({
        method: 'wallet_showCallsStatus',
        params: [''],
      });
      results['has-showCallsStatus'] = 'pass';
    } catch {
      results['has-showCallsStatus'] = 'fail';
    }

    // Atomicity enforcement test requires actual transaction testing
    results['atomicity-enforcement'] = 'untested';
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
    {#each ['transactions', 'signatures', 'eip-support'] as tab (tab)}
      <button
        type="button"
        class="tab-button"
        class:active={uiState.activeTab === tab}
        onclick={() => {
          if (tab === 'transactions') {
            uiState.activeTab = 'transactions';

            if (!uiState.selectedTxId && testTransactions.length) {
              uiState.selectedTxId = testTransactions[0].id;
            }
          } else if (tab === 'signatures') {
            uiState.activeTab = 'signatures';

            if (!uiState.selectedSigId && testSignatures.length) {
              uiState.selectedSigId = testSignatures[0].id;
            }
          } else if (tab === 'eip-support') {
            uiState.activeTab = 'eip-support';

            if (!uiState.selectedEipId && eipTests.length) {
              uiState.selectedEipId = eipTests[0].id;
            }
          }
        }}
      >
        {tab === 'eip-support' ? 'EIP Support' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            <SideBarItem
              title={tx.name}
              description={tx.description}
              isSelected={uiState.selectedTxId === tx.id}
              isCompleted={!!transactionState.hashes[tx.id]}
              onclick={() => (uiState.selectedTxId = tx.id)}
            />
          {/each}
        {:else if uiState.activeTab === 'signatures'}
          {#each testSignatures as sig}
            <SideBarItem
              title={sig.name}
              description={sig.description}
              isSelected={uiState.selectedSigId === sig.id}
              isCompleted={!!signatureState.results[sig.id]}
              onclick={() => (uiState.selectedSigId = sig.id)}
            />
          {/each}
        {:else if uiState.activeTab === 'eip-support'}
          {#each eipTests as eipTest}
            <SideBarItem
              title={eipTest.eipNumber}
              description={eipTest.description}
              isSelected={uiState.selectedEipId === eipTest.id}
              isCompleted={!!eipState.results[eipTest.id]}
              onclick={() => (uiState.selectedEipId = eipTest.id)}
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
      {:else if uiState.activeTab === 'eip-support' && uiState.selectedEipId}
        {@const selectedEip = eipTests.find((eip) => eip.id === uiState.selectedEipId)}
        {#if selectedEip}
          {@const isActive = eipState.activeId === selectedEip.id}
          {@const isTesting = eipState.isTesting && isActive}
          {@const testResults = eipState.results[selectedEip.id]}
          <div class="detail-card" data-card="radius-8 padding-5">
            <header data-row="gap-2 start wrap">
              <div data-column="gap-1">
                <h3>{selectedEip.eipNumber}: {selectedEip.name}</h3>
                {#if selectedEip.description}
                  <p class="body-text">{selectedEip.description}</p>
                {/if}
              </div>
              <a
                href={selectedEip.specUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="spec-link"
                title="View specification"
              >
                Spec ↗
              </a>
            </header>

            <div data-column="gap-4">
              {#if selectedEip.requirements && selectedEip.requirements.length > 0}
                <div class="requirements-box">
                  <h4 class="requirements-title">📋 Requirements:</h4>
                  <ul class="requirements-list">
                    {#each selectedEip.requirements as requirement}
                      <li>{requirement}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <div class="detail-section">
                <span class="detail-label">🧪 Compliance Checks:</span>
                <div class="eip-checks" data-column="gap-2">
                  {#each selectedEip.checks as check}
                    {@const status = testResults?.[check.id] || 'untested'}
                    <div class="check-item" data-row="gap-2 start">
                      <span class="check-status status-{status}" title={status}>
                        {#if status === 'pass'}
                          ✓
                        {:else if status === 'fail'}
                          ✗
                        {:else if status === 'partial'}
                          ◐
                        {:else}
                          ○
                        {/if}
                      </span>
                      <div data-column="gap-1">
                        <div class="check-name">
                          {check.name}
                          {#if check.critical}
                            <span class="critical-badge">required</span>
                          {/if}
                        </div>
                        <div class="check-description">{check.description}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              {#if eipState.discoveredProviders.length > 0 && selectedEip.id === 'eip-6963'}
                <div class="detail-section">
                  <span class="detail-label">🔍 Discovered Providers ({eipState.discoveredProviders.length}):</span>
                  <div class="providers-list" data-column="gap-2">
                    {#each eipState.discoveredProviders as provider}
                      <div class="provider-item">
                        <div class="provider-header" data-row="gap-2 start">
                          {#if provider.icon}
                            <img src={provider.icon} alt={provider.name} class="provider-icon" />
                          {/if}
                          <div>
                            <div class="provider-name">{provider.name}</div>
                            <div class="provider-rdns">{provider.rdns}</div>
                          </div>
                        </div>
                        <div class="provider-uuid">UUID: {provider.uuid}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <button
                type="button"
                data-pressable
                onclick={() => testEIPSupport(selectedEip)}
                disabled={isTesting}
              >
                {#if isTesting}
                  Testing…
                {:else if testResults}
                  Re-run Tests
                {:else}
                  Run Tests
                {/if}
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Connector Modal -->
  <ConnectorModal
    isOpen={connectionState.isModalOpen}
    {connectors}
    isConnecting={connectionState.isConnecting}
    onClose={() => (connectionState.isModalOpen = false)}
    onConnect={handleConnect}
  />

  <!-- Chain Switch Modal -->
  <ChainSwitchModal
    isOpen={chainState.isModalOpen}
    isSwitching={chainState.isSwitching}
    currentChainId={account?.chainId}
    onClose={() => {
      chainState.isModalOpen = false;
      chainState.pendingTransaction = null;
      chainState.error = '';
    }}
    onSwitch={handleSwitchChain}
  />

  <!-- Error Components -->
  <ErrorComponent error={connectionState.error} onClose={() => (connectionState.error = '')} />
  <ErrorComponent error={chainState.error} onClose={() => (chainState.error = '')} />
  <ErrorComponent error={transactionState.error} onClose={() => (transactionState.error = '')} />
  <ErrorComponent error={signatureState.error} onClose={() => (signatureState.error = '')} />
  <ErrorComponent error={eipState.error} onClose={() => (eipState.error = '')} />

  <!-- EIP Results Modal -->
  <EIPResultsModal
    isOpen={eipState.resultsModal.isOpen}
    passed={eipState.resultsModal.passed}
    failedChecks={eipState.resultsModal.failedChecks}
    onClose={() => (eipState.resultsModal.isOpen = false)}
  />
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

  .spec-link {
    background: transparent;
    border: none;
    color: var(--accent);
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;
    margin-left: auto;
  }

  .spec-link:hover {
    opacity: 0.8;
  }

  .eip-checks {
    margin-top: 0.5rem;
  }

  .check-item {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
    border: 1px solid var(--background-secondary);
    border-radius: 0.5rem;
  }

  .check-status {
    font-size: 1.2rem;
    font-weight: bold;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .check-status.status-pass {
    color: var(--rating-pass);
    background: color-mix(in srgb, var(--rating-pass) 20%, transparent);
  }

  .check-status.status-fail {
    color: var(--rating-fail);
    background: color-mix(in srgb, var(--rating-fail) 20%, transparent);
  }

  .check-status.status-partial {
    color: var(--rating-partial);
    background: color-mix(in srgb, var(--rating-partial) 20%, transparent);
  }

  .check-status.status-untested {
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
  }

  .check-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .check-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .critical-badge {
    font-size: 0.65rem;
    padding: 0.125rem 0.375rem;
    background: color-mix(in srgb, var(--rating-fail) 20%, transparent);
    color: var(--rating-fail);
    border-radius: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .providers-list {
    margin-top: 0.5rem;
  }

  .provider-item {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
    border: 1px solid var(--background-secondary);
    border-radius: 0.5rem;
  }

  .provider-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
  }

  .provider-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .provider-rdns {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
  }

  .provider-uuid {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace;
  }
</style>