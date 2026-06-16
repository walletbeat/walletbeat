<script lang="ts">
  import Modal from '../Modal.svelte';
  import type { StepResult } from '../../constants/test-eip-support';
  import { testSteps } from '../../constants/test-eip-support';
	import { SvelteSet } from 'svelte/reactivity'

  interface Props {
    isOpen: boolean;
    overallPassed: boolean;
    hasPartialResults: boolean;
    stepResults: StepResult[];
    onClose: () => void;
  }

  let { isOpen, overallPassed, hasPartialResults, stepResults, onClose }: Props = $props();

  // Determine the overall result type for display
  const overallResult = $derived(
    overallPassed && !hasPartialResults ? 'passed' :
    overallPassed && hasPartialResults ? 'partial' :
    'failed'
  );

  // Track which steps are expanded
  let expandedSteps = $state<Set<string>>(new Set());

  function toggleStep(stepId: string) {
    if (expandedSteps.has(stepId)) {
      expandedSteps.delete(stepId);
    } else {
      expandedSteps.add(stepId);
    }

    expandedSteps = new SvelteSet(expandedSteps);
  }

  function getStepName(stepId: string): string {
    return testSteps.find((s) => s.id === stepId)?.name ?? stepId;
  }

  function getStepNumber(stepId: string): number {
    return testSteps.find((s) => s.id === stepId)?.stepNumber ?? 0;
  }
</script>

<Modal {isOpen} title={overallResult === 'passed' ? 'All Tests Passed!' : overallResult === 'partial' ? 'Tests Passed with Warnings' : 'Test Results'} {onClose}>
  <div class="results-content" data-column="gap-3">
    <!-- Summary -->
    <div class="summary" class:passed={overallResult === 'passed'} class:partial={overallResult === 'partial'} class:failed={overallResult === 'failed'}>
      <div class="summary-icon">
        {#if overallResult === 'passed'}
          ✓
        {:else if overallResult === 'partial'}
          ⚠
        {:else}
          !
        {/if}
      </div>
      <div class="summary-text">
        {#if overallResult === 'passed'}
          <p>Your wallet passed all EIP compliance tests!</p>
          <p class="summary-detail">
            All {stepResults.length} steps completed successfully. The wallet supports EIP-1193,
            EIP-2700, EIP-6963, and EIP-5792.
          </p>
        {:else if overallResult === 'partial'}
          <p>Your wallet passed all critical tests with some warnings.</p>
          <p class="summary-detail">
            All {stepResults.length} steps completed. Some non-critical checks failed.
            Review the results below for details.
          </p>
        {:else}
          <p>Some tests did not pass.</p>
          <p class="summary-detail">
            Review the results below to see which checks failed.
          </p>
        {/if}
      </div>
    </div>

    <!-- Step Results -->
    <div class="step-results" data-column="gap-2">
      <h4 class="section-title">Step-by-Step Results</h4>
      {#each stepResults as result (result.stepId)}
        {@const stepStatus = result.status === 'passed' ? 'passed' : result.status === 'partial' ? 'partial' : 'failed'}
        <div class="step-result" class:passed={stepStatus === 'passed'} class:partial={stepStatus === 'partial'} class:failed={stepStatus === 'failed'}>
          <button
            type="button"
            class="step-header"
            onclick={() => toggleStep(result.stepId)}
            aria-expanded={expandedSteps.has(result.stepId)}
          >
            <span class="step-status">
              {#if stepStatus === 'passed'}
                ✓
              {:else if stepStatus === 'partial'}
                ⚠
              {:else}
                ✗
              {/if}
            </span>
            <span class="step-name">
              Step {getStepNumber(result.stepId)}: {getStepName(result.stepId)}
            </span>
            <span class="expand-icon" class:expanded={expandedSteps.has(result.stepId)}>
              ▸
            </span>
          </button>

          {#if expandedSteps.has(result.stepId)}
            <div class="step-details" data-column="gap-2">
              {#each result.eipResults as eipResult (eipResult.eipNumber)}
                <div class="eip-result" class:passed={eipResult.overallPassed} class:failed={!eipResult.overallPassed}>
                  <div class="eip-header">
                    <span class="eip-status">
                      {#if eipResult.overallPassed}
                        ✓
                      {:else}
                        ✗
                      {/if}
                    </span>
                    <span class="eip-number">{eipResult.eipNumber}</span>
                    <span class="eip-name">{eipResult.name}</span>
                  </div>
                  <div class="checks-list" data-column="gap-1">
                    {#each eipResult.checks as check (check.id)}
                      <div class="check-row" class:passed={check.passed} class:failed={!check.passed}>
                        <span class="check-icon">
                          {#if check.passed}
                            ✓
                          {:else}
                            ✗
                          {/if}
                        </span>
                        <span class="check-name">{check.name}</span>
                        {#if check.detail}
                          <span class="check-detail">{check.detail}</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  {#snippet footer()}
    <button type="button" data-pressable onclick={onClose}>Close</button>
  {/snippet}
</Modal>

<style>
  .results-content {
    margin-block: 1rem 1.5rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .summary {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .summary.passed {
    background: color-mix(in srgb, var(--rating-pass) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-pass) 30%, transparent);
  }

  .summary.partial {
    background: color-mix(in srgb, var(--rating-partial) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-partial) 30%, transparent);
  }

  .summary.failed {
    background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
  }

  .summary-icon {
    font-size: 2rem;
    font-weight: bold;
    line-height: 1;
  }

  .summary.passed .summary-icon {
    color: var(--rating-pass);
  }

  .summary.partial .summary-icon {
    color: var(--rating-partial);
  }

  .summary.failed .summary-icon {
    color: var(--rating-fail);
  }

  .summary-text p {
    margin: 0;
    font-size: 0.9rem;
  }

  .summary-text p:first-child {
    font-weight: 600;
  }

  .summary-detail {
    font-size: 0.8rem !important;
    color: var(--text-secondary);
    margin-top: 0.25rem !important;
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .step-result {
    border: 1px solid var(--background-secondary);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .step-result.passed {
    border-color: color-mix(in srgb, var(--rating-pass) 30%, transparent);
  }

  .step-result.partial {
    border-color: color-mix(in srgb, var(--rating-partial) 30%, transparent);
  }

  .step-result.failed {
    border-color: color-mix(in srgb, var(--rating-fail) 30%, transparent);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
  }

  .step-header:hover {
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
  }

  .step-status {
    font-weight: bold;
    font-size: 1rem;
  }

  .step-result.passed .step-status {
    color: var(--rating-pass);
  }

  .step-result.partial .step-status {
    color: var(--rating-partial);
  }

  .step-result.failed .step-status {
    color: var(--rating-fail);
  }

  .step-name {
    flex: 1;
    font-weight: 500;
  }

  .expand-icon {
    color: var(--text-secondary);
    transition: transform 0.2s;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .step-details {
    padding: 0.75rem 1rem 1rem;
    background: color-mix(in srgb, var(--background-secondary) 30%, transparent);
  }

  .eip-result {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-primary) 50%, transparent);
    border-radius: 0.375rem;
  }

  .eip-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .eip-status {
    font-size: 0.85rem;
    font-weight: bold;
  }

  .eip-result.passed .eip-status {
    color: var(--rating-pass);
  }

  .eip-result.failed .eip-status {
    color: var(--rating-fail);
  }

  .eip-number {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--accent);
  }

  .eip-name {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .checks-list {
    padding-left: 1.25rem;
  }

  .check-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .check-icon {
    font-size: 0.7rem;
    font-weight: bold;
  }

  .check-row.passed .check-icon {
    color: var(--rating-pass);
  }

  .check-row.failed .check-icon {
    color: var(--rating-fail);
  }

  .check-name {
    color: var(--text-primary);
  }

  .check-detail {
    color: var(--text-secondary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.7rem;
  }
</style>
