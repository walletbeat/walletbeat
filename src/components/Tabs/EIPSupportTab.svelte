<script lang="ts">
  import type {
    TestStep,
    StepResult,
    StepStatus,
    DiscoveredProvider,
  } from '../../constants/test-eip-support';
  import { testSteps } from '../../constants/test-eip-support';

  interface Props {
    currentStep: TestStep;
    currentStepResult: StepResult | undefined;
    stepTestState: {
      currentStepIndex: number;
      overallStatus: 'idle' | 'in_progress' | 'completed' | 'failed';
      stepResults: Record<string, StepResult>;
      discoveredProviders: Array<DiscoveredProvider & { provider: unknown }>;
      selectedProviderId: string | null;
      connectedAddress: string | null;
      chainId: number | null;
      batchId: string | null;
    };
    onRunStep: () => void;
    onReset: () => void;
    onSelectProvider: (providerId: string) => void;
  }

  let { currentStep, currentStepResult, stepTestState, onRunStep, onReset, onSelectProvider }: Props =
    $props();

  const isRunning = $derived(currentStepResult?.status === 'running');
  const stepStatus = $derived<StepStatus>(currentStepResult?.status ?? 'pending');
  const completedSteps = $derived(
    Object.values(stepTestState.stepResults).filter((r) => r.status === 'passed').length
  );
  const totalSteps = testSteps.length;

  function getStepButtonText(): string {
    if (isRunning) return 'Running...';

    if (stepStatus === 'passed') return 'Step Passed ✅';

    if (stepStatus === 'partial') return 'Step Partial ⚠️';

    if (stepStatus === 'failed') return 'Retry Step 🔄';

    return 'Run Step';
  }

  function canRunCurrentStep(): boolean {
    if (isRunning) return false;

    if (stepTestState.currentStepIndex === 0) return true;

    const prevStep = testSteps[stepTestState.currentStepIndex - 1];
    const prevStatus = stepTestState.stepResults[prevStep.id]?.status;

    // Allow running if previous step completed (passed, partial, or failed)
    return prevStatus === 'passed' || prevStatus === 'partial' || prevStatus === 'failed';
  }
</script>

<div class="step-test-container" data-column="gap-4">
  <!-- Progress Header -->
  <div class="progress-header" data-row="gap-3 wrap">
    <div data-column="gap-1">
      <h3>EIP Compliance Test</h3>
      <p class="subtitle">
        Step-by-step verification of wallet EIP support. Each step tests specific EIP
        implementations.
      </p>
    </div>
    <div class="progress-indicator">
      <span class="progress-text">{completedSteps}/{totalSteps} steps</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(completedSteps / totalSteps) * 100}%"></div>
      </div>
    </div>
  </div>

  <!-- Current Step Card -->
  <div class="step-card" data-card="radius-8 padding-5">
    <header data-row="gap-2 start wrap">
      <div class="step-number" class:running={isRunning} class:passed={stepStatus === 'passed'} class:partial={stepStatus === 'partial'} class:failed={stepStatus === 'failed'}>
        {#if stepStatus === 'passed'}
          ✓
        {:else if stepStatus === 'partial'}
          ⚠
        {:else if stepStatus === 'failed'}
          ✗
        {:else if isRunning}
          <span class="spinner"></span>
        {:else}
          {currentStep.stepNumber}
        {/if}
      </div>
      <div data-column="gap-1">
        <h4>Step {currentStep.stepNumber}: {currentStep.name}</h4>
        <p class="body-text">{currentStep.description}</p>
      </div>
    </header>

    <!-- EIPs being tested -->
    <div class="eips-tested" data-column="gap-1">
      <span class="section-label">Testing:</span>
      <div class="eip-tags">
        {#each currentStep.eips as eip (eip.eipNumber)}
          <a
            href={eip.specUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="eip-tag"
            title={eip.name}
          >
            {eip.eipNumber} ↗
          </a>
        {/each}
      </div>
    </div>

    <!-- Checks for current step -->
    <div class="checks-section" data-column="gap-2">
      <span class="section-label">Checks:</span>
      {#each currentStep.eips as eip (eip.eipNumber)}
        {@const eipResult = currentStepResult?.eipResults.find((r) => r.eipNumber === eip.eipNumber)}
        <div class="eip-checks-group" data-column="gap-2">
          <span class="eip-group-label">{eip.eipNumber}</span>
          {#each eip.checks as check (check.id)}
            {@const checkResult = eipResult?.checks.find((c) => c.id === check.id)}
            {@const checkStatus = checkResult ? (checkResult.passed ? 'pass' : 'fail') : 'pending'}
            <div class="check-item" data-row="gap-2 start">
              <span class="check-status status-{checkStatus}" title={checkStatus}>
                {#if checkStatus === 'pass'}
                  ✓
                {:else if checkStatus === 'fail'}
                  ✗
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
                {#if checkResult?.detail}
                  <div class="check-detail">{checkResult.detail}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>

    <!-- Discovered providers for step 1 -->
    {#if currentStep.id === 'step-1-detection' && stepTestState.discoveredProviders.length > 0}
      <div class="providers-section" data-column="gap-2">
        <span class="section-label">
          Discovered Providers ({stepTestState.discoveredProviders.length}):
          {#if stepTestState.discoveredProviders.length > 1}
            <span class="section-hint">Click to select which provider to test</span>
          {/if}
        </span>
        <div class="providers-list" data-column="gap-2">
          {#each stepTestState.discoveredProviders as provider (provider.uuid)}
            {@const isSelected = stepTestState.selectedProviderId === provider.uuid}
            <button
              type="button"
              class="provider-item"
              class:selected={isSelected}
              onclick={() => onSelectProvider(provider.uuid)}
            >
              <div class="provider-header" data-row="gap-2 start">
                {#if provider.icon}
                  <img src={provider.icon} alt={provider.name} class="provider-icon" />
                {/if}
                <div>
                  <div class="provider-name">{provider.name}</div>
                  <div class="provider-rdns">{provider.rdns}</div>
                </div>
                {#if isSelected}
                  <span class="selected-badge">Selected</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Step info display -->
    {#if stepTestState.connectedAddress && currentStep.stepNumber >= 2}
      <div class="step-info" data-row="gap-2 wrap">
        <span class="info-item">
          <span class="info-label">Address:</span>
          <code>{stepTestState.connectedAddress.slice(0, 6)}...{stepTestState.connectedAddress.slice(-4)}</code>
        </span>
        {#if stepTestState.chainId}
          <span class="info-item">
            <span class="info-label">Chain:</span>
            <code>{stepTestState.chainId}</code>
          </span>
        {/if}
        {#if stepTestState.batchId}
          <span class="info-item">
            <span class="info-label">Batch ID:</span>
            <code>{stepTestState.batchId.slice(0, 12)}...</code>
          </span>
        {/if}
      </div>
    {/if}

    <!-- Action buttons -->
    <div class="actions" data-row="gap-2 wrap">
      <button
        type="button"
        data-pressable
        onclick={onRunStep}
        disabled={!canRunCurrentStep() || isRunning}
        class:running={isRunning}
      >
        {getStepButtonText()}
      </button>

      {#if stepTestState.overallStatus === 'completed' || stepTestState.overallStatus === 'failed'}
        <button type="button" data-pressable="secondary" onclick={onReset}>
          Reset All Tests
        </button>
      {/if}
    </div>

    <!-- Step error -->
    {#if currentStepResult?.error}
      <div class="step-error">
        <strong>Error:</strong> {currentStepResult.error}
      </div>
    {/if}
  </div>

  <!-- Overall status -->
  {#if stepTestState.overallStatus === 'completed'}
    <div class="completion-banner success">
      <span class="banner-icon">✓</span>
      <span>All steps completed successfully! Your wallet supports the tested EIPs.</span>
    </div>
  {:else if stepTestState.overallStatus === 'failed'}
    <div class="completion-banner failed">
      <span class="banner-icon">!</span>
      <span>Testing stopped. Fix the issues and retry, or reset to start over.</span>
    </div>
  {/if}
</div>

<style>
  .step-test-container {
    width: 100%;
  }

  .progress-header {
    justify-content: space-between;
  }

  .progress-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  .subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    max-width: 32rem;
  }

  .progress-indicator {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .progress-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .progress-bar {
    width: 8rem;
    height: 0.5rem;
    background: var(--background-secondary);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--rating-pass);
    transition: width 0.3s ease;
  }

  .step-card {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step-card header {
    align-items: flex-start;
  }

  .step-card h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .body-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .step-number {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 1.1rem;
    font-weight: 600;
    background: var(--background-secondary);
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .step-number.passed {
    background: color-mix(in srgb, var(--rating-pass) 20%, transparent);
    color: var(--rating-pass);
  }

  .step-number.partial {
    background: color-mix(in srgb, var(--rating-partial) 20%, transparent);
    color: var(--rating-partial);
  }

  .step-number.failed {
    background: color-mix(in srgb, var(--rating-fail) 20%, transparent);
    color: var(--rating-fail);
  }

  .step-number.running {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    color: var(--accent);
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .section-label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .eip-tags {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-start;
  }

  .eip-tag {
    padding: 0.375rem 0.75rem;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    border-radius: 0.375rem;
    font-size: 0.8rem;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.2s;
  }

  .eip-tag:hover {
    background: color-mix(in srgb, var(--accent) 25%, transparent);
  }

  .eip-checks-group {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-secondary) 30%, transparent);
    border-radius: 0.5rem;
  }

  .eip-group-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 0.5rem;
  }

  .check-item {
    padding: 0.5rem;
    background: color-mix(in srgb, var(--background-primary) 50%, transparent);
    border-radius: 0.375rem;
  }

  .check-status {
    font-size: 1rem;
    font-weight: bold;
    width: 1.25rem;
    height: 1.25rem;
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

  .check-status.status-pending {
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
  }

  .check-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .check-description {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .check-detail {
    font-size: 0.7rem;
    color: var(--accent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .critical-badge {
    font-size: 0.6rem;
    padding: 0.1rem 0.3rem;
    background: color-mix(in srgb, var(--rating-fail) 20%, transparent);
    color: var(--rating-fail);
    border-radius: 0.2rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .providers-section,
  .step-info {
    padding: 1rem;
    background: color-mix(in srgb, var(--background-secondary) 30%, transparent);
    border-radius: 0.5rem;
  }

  .providers-list {
    margin-top: 0.5rem;
  }

  .section-hint {
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--text-secondary);
    font-style: italic;
    margin-left: 0.5rem;
  }

  .provider-item {
    width: 100%;
    padding: 0.5rem;
    background: color-mix(in srgb, var(--background-primary) 50%, transparent);
    border: 1px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .provider-item:hover {
    background: color-mix(in srgb, var(--background-secondary) 70%, transparent);
    border-color: var(--border-color);
  }

  .provider-item.selected {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: var(--accent);
  }

  .provider-header {
    width: 100%;
    justify-content: flex-start;
  }

  .selected-badge {
    margin-left: auto;
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    background: var(--accent);
    color: white;
    border-radius: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .provider-icon {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
  }

  .provider-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .provider-rdns {
    font-size: 0.7rem;
    color: var(--text-secondary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .info-label {
    color: var(--text-secondary);
  }

  .info-item code {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: var(--background-secondary);
    border-radius: 0.25rem;
  }

  .actions {
    margin-top: 0.5rem;
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

  button[data-pressable='secondary'] {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);

    &:hover:not(:disabled) {
      background: var(--background-secondary);
      box-shadow: none;
    }
  }

  .step-error {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
    border-radius: 0.5rem;
    font-size: 0.8rem;
    color: var(--rating-fail);
  }

  .completion-banner {
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
  }

  .completion-banner.success {
    background: color-mix(in srgb, var(--rating-pass) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-pass) 30%, transparent);
    color: var(--rating-pass);
  }

  .completion-banner.failed {
    background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
    color: var(--rating-fail);
  }

  .banner-icon {
    font-size: 1.25rem;
    font-weight: bold;
  }
</style>
