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
    EIPTestResult,
    EIPCheckResult,
    DiscoveredProvider,
    TestStep,
  } from '../constants/test-eip-support';

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
    isRecord,
    type Eip1193Provider,
  } from '@/types/utils/assertions'

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
  function getProvider(): Eip1193Provider | null {
    if (typeof window !== 'undefined' && 'ethereum' in window) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- window.ethereum is the EIP-1193 provider
      return window.ethereum as Eip1193Provider;
    }

    return null;
  }

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
  function createStepResult(step: TestStep, status: StepStatus, eipResults: EIPTestResult[], error?: string): StepResult {
    return {
      stepId: step.id,
      status,
      eipResults,
      error,
      timestamp: Date.now(),
    };
  }

  function createEIPResult(eipNumber: string, name: string, specUrl: string, checks: EIPCheckResult[]): EIPTestResult {
    const overallPassed = checks.filter((c) => c.passed === false).length === 0;

    return { eipNumber, name, specUrl, checks, overallPassed };
  }

  function getCurrentStep(): TestStep {
    return testSteps[stepTestState.currentStepIndex];
  }

  function canRunStep(stepIndex: number): boolean {
    if (stepIndex === 0) return true;

    const previousStep = testSteps[stepIndex - 1];
    const previousResult = stepTestState.stepResults[previousStep.id];

    // Allow running if previous step completed (passed or failed)
    return previousResult?.status === 'passed' || previousResult?.status === 'failed';
  }

  function getStepStatus(stepId: string): StepStatus {
    return stepTestState.stepResults[stepId]?.status ?? 'pending';
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

    try {
      let result: StepResult;

      switch (step.id) {
        case 'step-1-detection':
          result = await runStep1Detection(step);
          break;
        case 'step-2-connect':
          result = await runStep2Connect(step);
          break;
        case 'step-3-account':
          result = await runStep3Account(step);
          break;
        case 'step-4-network':
          result = await runStep4Network(step);
          break;
        case 'step-5-batch-send':
          result = await runStep5BatchSend(step);
          break;
        case 'step-6-batch-status':
          result = await runStep6BatchStatus(step);
          break;
        default:
          throw new Error(`Unknown step: ${step.id}`);
      }

      stepTestState.stepResults[step.id] = result;

      // Check if this was the last step
      const isLastStep = step.id === testSteps[testSteps.length - 1].id;

      if (isLastStep) {
        // Show final results after last step regardless of pass/fail
        stepTestState.overallStatus = result.status === 'passed' ? 'completed' : 'failed';
        showFinalResults();
      } else {
        // Auto-advance to next step regardless of pass/fail
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
    const allPassed = allResults.every((r) => r.status === 'passed');

    stepTestState.resultsModal.overallPassed = allPassed;
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

  // Step 1: Wallet Detection
  async function runStep1Detection(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];

    // Re-request providers to ensure we have the latest
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // EIP-6963 checks
    const eip6963Checks: EIPCheckResult[] = [];
    const hasProviders = stepTestState.discoveredProviders.length > 0;

    eip6963Checks.push({
      id: 'announces-provider',
      name: 'Provider announcement',
      description: 'Wallet announces itself via eip6963:announceProvider event',
      passed: hasProviders,
      detail: hasProviders ? `Found ${stepTestState.discoveredProviders.length} provider(s)` : 'No providers discovered',
    });

    eip6963Checks.push({
      id: 'responds-to-request',
      name: 'Responds to discovery',
      description: 'Wallet responds to eip6963:requestProvider event',
      passed: hasProviders,
    });

    if (hasProviders) {
      const provider = stepTestState.discoveredProviders[0];

      eip6963Checks.push({
        id: 'has-provider-info',
        name: 'Provider info object',
        description: 'Includes valid provider info (uuid, name, icon, rdns)',
        passed: !!(provider.name && provider.uuid && provider.rdns),
        detail: provider.name || 'Unknown',
      });

      eip6963Checks.push({
        id: 'valid-icon',
        name: 'Valid icon URI',
        description: 'Provider icon is a valid data URI or HTTPS URL',
        passed: provider.icon?.startsWith('data:') || provider.icon?.startsWith('https://'),
      });

      const rdnsRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i;

      eip6963Checks.push({
        id: 'rdns-format',
        name: 'RDNS format',
        description: 'Provider rdns follows reverse domain name format',
        passed: rdnsRegex.test(provider.rdns),
        detail: provider.rdns,
      });

      // Auto-select first provider
      stepTestState.selectedProviderId = provider.uuid;
    }

    eipResults.push(createEIPResult('EIP-6963', 'Multi Injected Provider Discovery', 'https://eips.ethereum.org/EIPS/eip-6963', eip6963Checks));

    // EIP-1193 basic checks
    const eip1193Checks: EIPCheckResult[] = [];
    const rawProvider = getProvider();
    const providerExists = !!rawProvider || hasProviders;

    eip1193Checks.push({
      id: 'has-provider',
      name: 'Provider exists',
      description: 'window.ethereum or provider discovered via EIP-6963',
      passed: providerExists,
    });

    eip1193Checks.push({
      id: 'has-request',
      name: 'request() method',
      description: 'Provider implements the request(args) method',
      passed: providerExists && typeof rawProvider?.request === 'function',
    });

    eipResults.push(createEIPResult('EIP-1193', 'Ethereum Provider JavaScript API', 'https://eips.ethereum.org/EIPS/eip-1193', eip1193Checks));

    // Step passes if we found at least one provider
    const stepPassed = hasProviders || providerExists;

    return createStepResult(step, stepPassed ? 'passed' : 'failed', eipResults);
  }

  // Step 2: Connect Wallet
  async function runStep2Connect(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];
    const eip1193Checks: EIPCheckResult[] = [];

    const provider = getProvider();

    if (!provider) {
      return createStepResult(step, 'failed', [], 'No provider found');
    }

    // Check on() method
    eip1193Checks.push({
      id: 'has-on',
      name: 'on() method',
      description: 'Provider implements the on(eventName, listener) method',
      passed: typeof provider.on === 'function',
    });

    // Check removeListener() method
    eip1193Checks.push({
      id: 'has-removeListener',
      name: 'removeListener() method',
      description: 'Provider implements the removeListener(eventName, listener) method',
      passed: typeof provider.removeListener === 'function',
    });

    // Set up connect event listener BEFORE requesting accounts
    let connectEventFired = false;
    let connectEventData: unknown = null;
    const connectListener = (info: unknown) => {
      connectEventFired = true;
      connectEventData = info;
    };

    // Set up disconnect event listener to verify subscription works
    let disconnectEventSubscribable = false;
    const disconnectListener = () => {};

    try {
      if (typeof provider.on === 'function') {
        provider.on('connect', connectListener);
        provider.on('disconnect', disconnectListener);
        disconnectEventSubscribable = true;
      }
    } catch {
      // Provider doesn't support event subscription
    }

    // Actually connect via eth_requestAccounts
    let connectPassed = false;
    let connectDetail = '';

    try {
      if (provider.request) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];

        if (accounts && accounts.length > 0) {
          connectPassed = true;
          stepTestState.connectedAddress = accounts[0];
          connectDetail = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
        } else {
          connectDetail = 'No accounts returned';
        }
      }
    } catch (error) {
      connectDetail = error instanceof Error ? error.message : 'Connection rejected';
    }

    // Give a brief moment for connect event to fire (some wallets emit asynchronously)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clean up listeners
    try {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('connect', connectListener);
        provider.removeListener('disconnect', disconnectListener);
      }
    } catch {
      // Ignore cleanup errors
    }

    eip1193Checks.push({
      id: 'eth-requestAccounts',
      name: 'eth_requestAccounts',
      description: 'Successfully prompts user to connect and returns accounts',
      passed: connectPassed,
      detail: connectDetail,
    });

    // Check if connect event actually fired (EIP-1193 MUST emit when connected)
    let connectEventDetail = '';

    if (connectEventFired) {
      // Validate connect event data has chainId per EIP-1193
      const hasChainId = connectEventData && typeof connectEventData === 'object' && 'chainId' in connectEventData;

      connectEventDetail = hasChainId
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- connectEventData validated above
        ? `Event fired with chainId: ${(connectEventData as { chainId: string }).chainId}`
        : 'Event fired (missing chainId in payload)';
    } else {
      connectEventDetail = 'Event did not fire during connection';
    }

    eip1193Checks.push({
      id: 'connect-event',
      name: 'connect event',
      description: 'Connect event fires when wallet connects (MUST per EIP-1193)',
      passed: connectEventFired,
      detail: connectEventDetail,
    });

    // For disconnect, we can only verify subscription works (can't trigger actual disconnect)
    eip1193Checks.push({
      id: 'disconnect-event',
      name: 'disconnect event',
      description: 'Can subscribe to disconnect event (fires with error 4900/4901 on disconnect)',
      passed: disconnectEventSubscribable,
      detail: disconnectEventSubscribable ? 'Subscription supported' : 'Cannot subscribe to event',
    });

    eipResults.push(createEIPResult('EIP-1193', 'Ethereum Provider JavaScript API', 'https://eips.ethereum.org/EIPS/eip-1193', eip1193Checks));

    return createStepResult(step, connectPassed ? 'passed' : 'failed', eipResults);
  }

  // Step 3: Check Account
  async function runStep3Account(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];
    const eip1193Checks: EIPCheckResult[] = [];

    const provider = getProvider();

    if (!provider) {
      return createStepResult(step, 'failed', [], 'No provider found');
    }

    // Call eth_accounts
    let accountsPassed = false;
    let accountsDetail = '';
    let returnedAddress = '';

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];

      if (accounts && accounts.length > 0) {
        accountsPassed = true;
        returnedAddress = accounts[0];
        accountsDetail = `${accounts.length} account(s) returned`;
      } else {
        accountsDetail = 'No accounts returned (wallet may be disconnected)';
      }
    } catch (error) {
      accountsDetail = error instanceof Error ? error.message : 'Failed to get accounts';
    }

    eip1193Checks.push({
      id: 'eth-accounts',
      name: 'eth_accounts',
      description: 'Returns connected account addresses',
      passed: accountsPassed,
      detail: accountsDetail,
    });

    // Validate address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    const validAddress = addressRegex.test(returnedAddress);

    eip1193Checks.push({
      id: 'valid-address',
      name: 'Valid address format',
      description: 'Returned address is a valid Ethereum address (0x + 40 hex chars)',
      passed: validAddress,
      detail: validAddress ? returnedAddress : 'Invalid or no address',
    });

    // Check accountsChanged event subscription
    let eventSubscribable = false;

    try {
      if (typeof provider.on === 'function') {
        const noop = () => {};

        provider.on('accountsChanged', noop);
        eventSubscribable = true;
      }
    } catch {
      eventSubscribable = false;
    }

    eip1193Checks.push({
      id: 'accountsChanged-event',
      name: 'accountsChanged event',
      description: 'Can subscribe to accountsChanged event',
      passed: eventSubscribable,
    });

    eipResults.push(createEIPResult('EIP-1193', 'Ethereum Provider JavaScript API', 'https://eips.ethereum.org/EIPS/eip-1193', eip1193Checks));

    const stepPassed = accountsPassed && validAddress;

    return createStepResult(step, stepPassed ? 'passed' : 'failed', eipResults);
  }

  // Step 4: Check Network
  async function runStep4Network(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];

    const provider = getProvider();

    if (!provider) {
      return createStepResult(step, 'failed', [], 'No provider found');
    }

    // EIP-1193 checks
    const eip1193Checks: EIPCheckResult[] = [];

    // Get chain ID
    let chainIdPassed = false;
    let chainIdDetail = '';

    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' });

      if (typeof chainIdHex === 'string') {
        const chainId = parseInt(chainIdHex, 16);

        stepTestState.chainId = chainId;
        chainIdPassed = true;
        chainIdDetail = `Chain ID: ${chainId} (${chainIdHex})`;
      }
    } catch (error) {
      chainIdDetail = error instanceof Error ? error.message : 'Failed to get chain ID';
    }

    eip1193Checks.push({
      id: 'eth-chainId',
      name: 'eth_chainId',
      description: 'Returns current chain ID',
      passed: chainIdPassed,
      detail: chainIdDetail,
    });

    // Check chainChanged event
    let chainEventSubscribable = false;

    try {
      if (typeof provider.on === 'function') {
        const noop = () => {};

        provider.on('chainChanged', noop);
        chainEventSubscribable = true;
      }
    } catch {
      chainEventSubscribable = false;
    }

    eip1193Checks.push({
      id: 'chainChanged-event',
      name: 'chainChanged event',
      description: 'Can subscribe to chainChanged event',
      passed: chainEventSubscribable,
    });

    eipResults.push(createEIPResult('EIP-1193', 'Ethereum Provider JavaScript API', 'https://eips.ethereum.org/EIPS/eip-1193', eip1193Checks));

    // EIP-2700 EventEmitter checks
    const eip2700Checks: EIPCheckResult[] = [];

    eip2700Checks.push({
      id: 'has-on',
      name: 'on() method',
      description: 'Provider implements on(eventName, listener)',
      passed: typeof provider.on === 'function',
    });

    eip2700Checks.push({
      id: 'has-removeListener',
      name: 'removeListener() method',
      description: 'Provider implements removeListener(eventName, listener)',
      passed: typeof provider.removeListener === 'function',
    });

    eip2700Checks.push({
      id: 'has-once',
      name: 'once() method',
      description: 'Provider implements once(eventName, listener)',
      passed: typeof provider.once === 'function',
    });

    eip2700Checks.push({
      id: 'has-removeAllListeners',
      name: 'removeAllListeners() method',
      description: 'Provider implements removeAllListeners([eventName])',
      passed: typeof provider.removeAllListeners === 'function',
    });

    eipResults.push(createEIPResult('EIP-2700', 'JavaScript Provider Event Emitter', 'https://eips.ethereum.org/EIPS/eip-2700', eip2700Checks));

    // Step passes if chain ID was retrieved
    return createStepResult(step, chainIdPassed ? 'passed' : 'failed', eipResults);
  }

  // Step 5: Send Batch Calls
  async function runStep5BatchSend(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];
    const eip5792Checks: EIPCheckResult[] = [];

    const provider = getProvider();

    if (!provider) {
      return createStepResult(step, 'failed', [], 'No provider found');
    }

    const connectedAddress = stepTestState.connectedAddress || account?.address;

    if (!connectedAddress) {
      return createStepResult(step, 'failed', [], 'No connected address');
    }

    // Check wallet_getCapabilities
    let capabilitiesPassed = false;
    let atomicitySupported = false;
    let capabilitiesDetail = '';

    try {
      const capabilities = await provider.request({
        method: 'wallet_getCapabilities',
        params: [connectedAddress],
      });

      if (isRecord(capabilities)) {
        capabilitiesPassed = true;
        capabilitiesDetail = 'Capabilities retrieved';

        // Check atomicity for current chain
        const chainIdHex = stepTestState.chainId ? `0x${stepTestState.chainId.toString(16)}` : '0x1';
        const chainCapabilities = capabilities[chainIdHex];

        if (isRecord(chainCapabilities)) {
          const atomicBatch = chainCapabilities['atomicBatch'];

          if (isRecord(atomicBatch)) {
            atomicitySupported = atomicBatch['supported'] === true;
          }
        }
      }
    } catch (error) {
      capabilitiesDetail = error instanceof Error ? error.message : 'Method not supported';
    }

    eip5792Checks.push({
      id: 'has-getCapabilities',
      name: 'wallet_getCapabilities',
      description: 'Provider implements wallet_getCapabilities method',
      passed: capabilitiesPassed,
      detail: capabilitiesDetail,
    });

    eip5792Checks.push({
      id: 'atomicity-support',
      name: 'Atomicity support',
      description: 'Wallet declares atomicBatch capability',
      passed: atomicitySupported,
      detail: atomicitySupported ? 'Atomic batching supported' : 'Not supported or not declared',
    });

    // Actually send batched calls
    let sendCallsPassed = false;
    let sendCallsDetail = '';

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const result = (await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0.0',
            chainId: stepTestState.chainId ? `0x${stepTestState.chainId.toString(16)}` : '0x1',
            from: connectedAddress,
            atomicRequired: false, // Required for EIP-5792 v2.0.0
            calls: [
              {
                to: '0x0000000000000000000000000000000000000000',
                data: '0x00',
                value: '0x0',
              },
            ],
          },
        ],
      })) as string | { id: string };

      // Handle both string and object response formats
      let batchId: string;

      if (typeof result === 'string') {
        batchId = result;
      } else if (result && typeof result === 'object' && 'id' in result) {
        batchId = result.id;
      } else {
        throw new Error('Unexpected response format from wallet_sendCalls');
      }

      if (batchId) {
        sendCallsPassed = true;
        stepTestState.batchId = batchId;
        sendCallsDetail = `Batch ID: ${batchId.slice(0, 16)}...`;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a user rejection vs method not supported
      if (errorMsg.toLowerCase().includes('reject') || errorMsg.toLowerCase().includes('denied')) {
        sendCallsDetail = 'User rejected the transaction';
      } else if (errorMsg.toLowerCase().includes('not supported') || errorMsg.toLowerCase().includes('not implemented')) {
        sendCallsDetail = 'wallet_sendCalls not supported by this wallet';
      } else {
        sendCallsDetail = errorMsg;
      }
    }

    eip5792Checks.push({
      id: 'has-sendCalls',
      name: 'wallet_sendCalls',
      description: 'Successfully sends batched calls and returns batch ID',
      passed: sendCallsPassed,
      detail: sendCallsDetail,
    });

    eipResults.push(createEIPResult('EIP-5792', 'Wallet Function Call API', 'https://eips.ethereum.org/EIPS/eip-5792', eip5792Checks));

    return createStepResult(step, sendCallsPassed ? 'passed' : 'failed', eipResults);
  }

  // Step 6: Check Batch Status
  async function runStep6BatchStatus(step: TestStep): Promise<StepResult> {
    const eipResults: EIPTestResult[] = [];
    const eip5792Checks: EIPCheckResult[] = [];

    const provider = getProvider();

    if (!provider) {
      return createStepResult(step, 'failed', [], 'No provider found');
    }

    if (!stepTestState.batchId) {
      return createStepResult(step, 'failed', [], 'No batch ID from previous step');
    }

    // Check wallet_getCallsStatus
    let statusPassed = false;
    let statusDetail = '';
    let validResponse = false;
    let hasAtomicField = false;
    let hasValidReceipts = false;
    let atomicDetail = '';
    let receiptsDetail = '';

    // Define the expected receipt structure per EIP-5792
    interface CallsStatusReceipt {
      logs?: unknown[];
      status?: string;
      chainId?: string;
      blockHash?: string;
      blockNumber?: string;
      gasUsed?: string;
      transactionHash?: string;
    }

    interface CallsStatusResponse {
      status: number | string;
      receipts?: CallsStatusReceipt[];
      version?: string;
      atomic?: boolean;
      id?: unknown;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const status = (await provider.request({
        method: 'wallet_getCallsStatus',
        params: [stepTestState.batchId],
      })) as CallsStatusResponse;

      statusPassed = true;

      // EIP-5792 v2.0.0 uses numeric status codes (like HTTP: 200 = success)
      // Earlier versions used string status ("CONFIRMED", "PENDING", etc.)
      if (typeof status.status === 'number') {
        statusDetail = `Status: ${status.status} (${status.status >= 200 && status.status < 300 ? 'success' : 'pending/failed'})`;
        validResponse = true;
      } else if (typeof status.status === 'string') {
        statusDetail = `Status: ${status.status}`;
        validResponse = true;
      } else {
        statusDetail = 'Status field missing or invalid type';
        validResponse = false;
      }

      // Check for atomic field (EIP-5792 MUST include this)
      // For atomicMultiTransactions feature, we need atomic to be true
      if ('atomic' in status && typeof status.atomic === 'boolean') {
        hasAtomicField = status.atomic === true;
        atomicDetail = status.atomic
          ? 'Batch executed atomically'
          : 'Batch executed non-atomically (atomic: false)';
      } else {
        atomicDetail = 'Atomic field missing or invalid type';
      }

      // Check for valid receipts array structure
      if (Array.isArray(status.receipts)) {
        if (status.receipts.length > 0) {
          // Validate first receipt has expected fields
          const firstReceipt = status.receipts[0];
          const hasRequiredFields =
            firstReceipt &&
            typeof firstReceipt === 'object' &&
            ('transactionHash' in firstReceipt || 'status' in firstReceipt);

          if (hasRequiredFields) {
            hasValidReceipts = true;
            receiptsDetail = `${status.receipts.length} receipt(s) with valid structure`;
          } else {
            receiptsDetail = 'Receipts missing required fields (transactionHash, status)';
          }
        } else {
          // Empty array is valid for pending transactions
          hasValidReceipts = true;
          receiptsDetail = 'Empty receipts array (transaction may be pending)';
        }
      } else {
        receiptsDetail = 'Receipts field missing or not an array';
      }
    } catch (error) {
      statusDetail = error instanceof Error ? error.message : 'Failed to get status';
    }

    eip5792Checks.push({
      id: 'has-getCallsStatus',
      name: 'wallet_getCallsStatus',
      description: 'Successfully retrieves batch status',
      passed: statusPassed,
      detail: statusDetail,
    });

    eip5792Checks.push({
      id: 'valid-status-response',
      name: 'Valid status response',
      description: 'Status response includes status field (number or string)',
      passed: validResponse,
    });

    eip5792Checks.push({
      id: 'atomic-batch-execution',
      name: 'Atomic batch execution',
      description: 'Wallet executes batches atomically (all-or-nothing)',
      passed: hasAtomicField,
      detail: atomicDetail,
    });

    eip5792Checks.push({
      id: 'valid-receipts',
      name: 'Valid receipts array',
      description: 'Response includes receipts array with transaction receipt fields',
      passed: hasValidReceipts,
      detail: receiptsDetail,
    });

    // Test wallet_showCallsStatus (optional)
    let showStatusPassed = false;

    try {
      await provider.request({
        method: 'wallet_showCallsStatus',
        params: [stepTestState.batchId],
      });
      showStatusPassed = true;
    } catch {
      showStatusPassed = false;
    }

    eip5792Checks.push({
      id: 'has-showCallsStatus',
      name: 'wallet_showCallsStatus',
      description: 'Provider implements wallet_showCallsStatus (optional)',
      passed: showStatusPassed,
      detail: showStatusPassed ? 'Supported' : 'Not supported (optional)',
    });

    eipResults.push(createEIPResult('EIP-5792', 'Wallet Function Call API', 'https://eips.ethereum.org/EIPS/eip-5792', eip5792Checks));

    return createStepResult(step, statusPassed ? 'passed' : 'failed', eipResults);
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
              isFailed={status === 'failed'}
              isDisabled={!isClickable && !isCurrent}
              onclick={() => {
                if (isClickable || status === 'passed' || status === 'failed') {
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
          {account}
          onRunStep={runCurrentStep}
          onReset={resetStepTests}
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
  }
</style>