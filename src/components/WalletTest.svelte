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
  import { getBaseUrl } from '../base-url';
  import { testSignatures, testTransactions } from '../constants/test-transactions-signatures';
  import type { TestTransaction, TestSignature } from '../constants/test-transactions-signatures';
  import { testSteps } from '../constants/test-eip-support';
  import type {
    StepStatus,
    StepResult,
    DiscoveredProvider,
    TestStep,
  } from '../constants/test-eip-support';
  import {
    createStepResult,
    runStep1Detection,
    runStep2Connect,
    runStep3Account,
    runStep4Network,
    runStep5BatchSend,
    runStep6BatchStatus,
    type EIPTestContext,
  } from '../lib/eip-test-runners';

  import ErrorComponent from './ErrorComponent.svelte';
  import WalletTesterNavigationItem from './WalletTesterNavigationItem.svelte';
  import ConnectorModal from './Modals/ConnectorModal.svelte';
  import ChainSwitchModal from './Modals/ChainSwitchModal.svelte';
  import EIPResultsModal from './Modals/EIPResultsModal.svelte';
  import TransactionsTab from './Tabs/TransactionsTab.svelte';
  import SignaturesTab from './Tabs/SignaturesTab.svelte';
  import EIPSupportTab from './Tabs/EIPSupportTab.svelte';
  import {
    assertTransactionId,
    isEip6963AnnounceProviderEvent,
  } from '@/types/utils/ethereum-types'

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

  // Step-based EIP testing state
  const stepTestState = $state({
    currentStepIndex: 0,
    overallStatus: 'idle' as 'idle' | 'in_progress' | 'completed' | 'failed',
    error: '',
    stepResults: {} as Record<string, StepResult>,

    // Step-specific data persisted across steps
    discoveredProviders: [] as Array<DiscoveredProvider & { provider: unknown }>,
    selectedProviderId: null as string | null,
    connectedAddress: null as string | null,
    chainId: null as number | null,
    batchId: null as string | null,

    // Results modal
    resultsModal: {
      isOpen: false,
      overallPassed: false,
      hasPartialResults: false,
      stepResults: [] as StepResult[],
    },
  });

  const uiState = $state({
    activeTab: 'transactions' as 'transactions' | 'signatures' | 'eip-support',
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

    // Discover EIP-6963 providers for step 1
    discoverProviders();

    return unwatch;
  });

  // Helper functions
  function updateSIWEMessage() {
    const siweSig = testSignatures.find((s) => s.id === 'siwe-1');

    if (siweSig?.type === 'message') {
      const address = account?.address || '0x0000000000000000000000000000000000000000';
      const baseUrl = getBaseUrl();

      siweSig.message = `${baseUrl}/ wants you to sign in with your Ethereum account:
${address}

Sign in to authenticate your wallet. This is a test SIWE message.

URI: ${baseUrl}/
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
    window.open(`https://eth.blockscount.com/tx/${txHash}`, '_blank', 'noopener,noreferrer');
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
          transactionState.hashes[tx.id] = assertTransactionId(result.hash);
        } else {
          transactionState.hashes[tx.id] = assertTransactionId(result.id);
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
  function discoverProviders() {
    if (typeof window === 'undefined') return;

    // Listen for EIP-6963 provider announcements
    window.addEventListener('eip6963:announceProvider', (event: Event) => {
      // Type guard for EIP-6963 announce provider event
      if (!isEip6963AnnounceProviderEvent(event)) return;

      const { info, provider } = event.detail;

      // Check if we already have this provider
      const exists = stepTestState.discoveredProviders.some((p) => p.uuid === info.uuid);

      if (!exists) {
        stepTestState.discoveredProviders.push({
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

  // Step-based EIP testing functions
  function getCurrentStep(): TestStep {
    return testSteps[stepTestState.currentStepIndex];
  }

  function canRunStep(stepIndex: number): boolean {
    if (stepIndex === 0) return true;

    const previousStep = testSteps[stepIndex - 1];
    const previousResult = stepTestState.stepResults[previousStep.id];

    // Allow running if previous step completed (passed, partial, or failed)
    return previousResult?.status === 'passed' || previousResult?.status === 'partial' || previousResult?.status === 'failed';
  }

  function getStepStatus(stepId: string): StepStatus {
    return stepTestState.stepResults[stepId]?.status ?? 'pending';
  }

  // Create the context for EIP test runners
  function createEIPTestContext(): EIPTestContext {
    return {
      getDiscoveredProviders: () => stepTestState.discoveredProviders,
      getSelectedProviderId: () => stepTestState.selectedProviderId,
      getConnectedAddress: () => stepTestState.connectedAddress,
      getChainId: () => stepTestState.chainId,
      getBatchId: () => stepTestState.batchId,
      getAccountAddress: () => account?.address,
      setSelectedProviderId: (id: string) => { stepTestState.selectedProviderId = id; },
      setConnectedAddress: (address: string) => { stepTestState.connectedAddress = address; },
      setChainId: (chainId: number) => { stepTestState.chainId = chainId; },
      setBatchId: (batchId: string) => { stepTestState.batchId = batchId; },
    };
  }

  async function runCurrentStep() {
    const step = getCurrentStep();

    if (!canRunStep(stepTestState.currentStepIndex)) {
      stepTestState.error = 'Please complete the previous step first';

      return;
    }

    stepTestState.overallStatus = 'in_progress';
    stepTestState.error = '';

    // Mark step as running
    stepTestState.stepResults[step.id] = createStepResult(step, 'running', []);

    const ctx = createEIPTestContext();

    try {
      let result: StepResult;

      switch (step.id) {
        case 'step-1-detection':
          result = await runStep1Detection(step, ctx);
          break;
        case 'step-2-connect':
          result = await runStep2Connect(step, ctx);
          break;
        case 'step-3-account':
          result = await runStep3Account(step, ctx);
          break;
        case 'step-4-network':
          result = await runStep4Network(step, ctx);
          break;
        case 'step-5-batch-send':
          result = await runStep5BatchSend(step, ctx);
          break;
        case 'step-6-batch-status':
          result = await runStep6BatchStatus(step, ctx);
          break;
        default:
          throw new Error(`Unknown step: ${step.id}`);
      }

      stepTestState.stepResults[step.id] = result;

      // Check if this was the last step
      const isLastStep = step.id === testSteps[testSteps.length - 1].id;

      if (isLastStep) {
        // Show final results after last step regardless of pass/fail
        stepTestState.overallStatus = result.status === 'passed' || result.status === 'partial' ? 'completed' : 'failed';
        showFinalResults();
      } else {
        // Auto-advance to next step regardless of pass/fail/partial
        if (stepTestState.currentStepIndex < testSteps.length - 1) {
          stepTestState.currentStepIndex++;
        }

        stepTestState.overallStatus = 'idle';
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Step execution failed';

      stepTestState.stepResults[step.id] = createStepResult(step, 'failed', [], errorMsg);
      stepTestState.error = errorMsg;

      // Check if this was the last step
      const isLastStep = step.id === testSteps[testSteps.length - 1].id;

      if (isLastStep) {
        // Show final results after last step even on error
        stepTestState.overallStatus = 'failed';
        showFinalResults();
      } else {
        // Auto-advance to next step even on error
        if (stepTestState.currentStepIndex < testSteps.length - 1) {
          stepTestState.currentStepIndex++;
        }

        stepTestState.overallStatus = 'idle';
      }
    }
  }

  function showFinalResults() {
    const allResults = testSteps.map((step) => stepTestState.stepResults[step.id]).filter(Boolean);
    const allPassed = allResults.every((r) => r.status === 'passed' || r.status === 'partial');
    const hasPartial = allResults.some((r) => r.status === 'partial');

    stepTestState.resultsModal.overallPassed = allPassed;
    stepTestState.resultsModal.hasPartialResults = hasPartial;
    stepTestState.resultsModal.stepResults = allResults;
    stepTestState.resultsModal.isOpen = true;
  }

  function resetStepTests() {
    stepTestState.currentStepIndex = 0;
    stepTestState.overallStatus = 'idle';
    stepTestState.error = '';
    stepTestState.stepResults = {};
    stepTestState.selectedProviderId = null;
    stepTestState.connectedAddress = null;
    stepTestState.chainId = null;
    stepTestState.batchId = null;
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
          {#each testTransactions as tx (tx.id)}
            <WalletTesterNavigationItem
              title={tx.name}
              description={tx.description}
              isSelected={uiState.selectedTxId === tx.id}
              isCompleted={!!transactionState.hashes[tx.id]}
              onclick={() => (uiState.selectedTxId = tx.id)}
            />
          {/each}
        {:else if uiState.activeTab === 'signatures'}
          {#each testSignatures as sig (sig.id)}
            <WalletTesterNavigationItem
              title={sig.name}
              description={sig.description}
              isSelected={uiState.selectedSigId === sig.id}
              isCompleted={!!signatureState.results[sig.id]}
              onclick={() => (uiState.selectedSigId = sig.id)}
            />
          {/each}
        {:else if uiState.activeTab === 'eip-support'}
          {#each testSteps as step, index (step.id)}
            {@const status = getStepStatus(step.id)}
            {@const isCurrent = stepTestState.currentStepIndex === index}
            {@const isClickable = canRunStep(index)}
            <WalletTesterNavigationItem
              title={`${step.stepNumber}. ${step.name}`}
              description={step.eips.map((e) => e.eipNumber).join(', ')}
              isSelected={isCurrent}
              isCompleted={status === 'passed'}
              isPartial={status === 'partial'}
              isFailed={status === 'failed'}
              isDisabled={!isClickable && !isCurrent}
              onclick={() => {
                if (isClickable || status === 'passed' || status === 'partial' || status === 'failed') {
                  stepTestState.currentStepIndex = index;
                }
              }}
            />
          {/each}
        {/if}
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      {#if uiState.activeTab === 'transactions'}
        {@const selectedTx = testTransactions.find((tx) => tx.id === uiState.selectedTxId)}
        <TransactionsTab
          {selectedTx}
          {transactionState}
          {account}
          onSendTransaction={handleSendTransaction}
          onOpenInExplorer={openInExplorer}
          {formatValue}
        />
      {:else if uiState.activeTab === 'signatures'}
        {@const selectedSig = testSignatures.find((sig) => sig.id === uiState.selectedSigId)}
        <SignaturesTab
          {selectedSig}
          {signatureState}
          {account}
          onSignMessage={handleSignMessage}
          onSignTypedData={handleSignTypedData}
        />
      {:else if uiState.activeTab === 'eip-support'}
        {@const currentStep = getCurrentStep()}
        {@const currentStepResult = stepTestState.stepResults[currentStep.id]}
        <EIPSupportTab
          {currentStep}
          {currentStepResult}
          {stepTestState}
          onRunStep={runCurrentStep}
          onReset={resetStepTests}
          onSelectProvider={(providerId) => { stepTestState.selectedProviderId = providerId; }}
        />
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
  <ErrorComponent error={stepTestState.error} onClose={() => (stepTestState.error = '')} />

  <!-- EIP Results Modal -->
  <EIPResultsModal
    isOpen={stepTestState.resultsModal.isOpen}
    overallPassed={stepTestState.resultsModal.overallPassed}
    hasPartialResults={stepTestState.resultsModal.hasPartialResults}
    stepResults={stepTestState.resultsModal.stepResults}
    onClose={() => (stepTestState.resultsModal.isOpen = false)}
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
    background-color: var(--accent-color, #3b82f6);
    color: white;
    font-weight: 500;
    padding: 0.6em 1.2em;
    border: none;
    border-radius: 0.5em;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transition: background-color 0.15s ease, box-shadow 0.15s ease;

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
</style>