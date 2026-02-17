<script lang="ts">
  import type { ScamAlertTest } from '../../constants/test-scam-alerts';

  interface Props {
    selectedTest: ScamAlertTest | undefined;
    scamAlertState: {
      activeId: string | null;
      isPending: boolean;
      hashes: Record<string, `0x${string}`>;
    };
    disclaimerAccepted: boolean;
    account: { address?: string } | null;
    onAcceptDisclaimer: () => void;
    onSendScamAlert: (test: ScamAlertTest) => void;
    onOpenInExplorer: (txHash: string) => void;
  }

  let {
    selectedTest,
    scamAlertState,
    disclaimerAccepted,
    account,
    onAcceptDisclaimer,
    onSendScamAlert,
    onOpenInExplorer,
  }: Props = $props();

  let checkboxChecked = $state(false);

  const isActive = $derived(
    selectedTest && scamAlertState.activeId === selectedTest.id
  );
  const isPending = $derived(scamAlertState.isPending && isActive);
  const txHash = $derived(selectedTest ? scamAlertState.hashes[selectedTest.id] : undefined);

  function getRiskLabel(riskType: ScamAlertTest['riskType']): string {
    switch (riskType) {
      case 'recent-deploy': return 'Recently Deployed';
      case 'previous-interaction': return 'Previous Interaction';
      case 'known-scam': return 'Known Scam';
    }
  }
</script>

{#if !disclaimerAccepted}
  <div class="disclaimer-fullscreen">
    <div class="disclaimer-overlay" data-card="radius-8 padding-5">
      <div class="disclaimer-content" data-column="gap-4">
        <div class="disclaimer-icon">&#9888;</div>
        <h3 class="disclaimer-title">Scam Alert Testing</h3>
        <div class="disclaimer-warnings" data-column="gap-3">
          <p class="disclaimer-rule">
            Every transaction should be treated as a <strong>SCAM</strong> transaction.
          </p>
          <p class="disclaimer-rule">
            Do <strong>NOT</strong> send real funds &mdash; nothing should ever be sent.
          </p>
          <p class="disclaimer-rule">
            Use only <strong>disposable wallets</strong> with no real assets.
          </p>
        </div>
        <label class="disclaimer-checkbox">
          <input
            type="checkbox"
            bind:checked={checkboxChecked}
          />
          <span>I understand the risks and will only use disposable wallets for testing</span>
        </label>
        <button
          type="button"
          class="disclaimer-button"
          data-pressable
          disabled={!checkboxChecked}
          onclick={onAcceptDisclaimer}
        >
          I Understand
        </button>
      </div>
    </div>
  </div>
{:else if selectedTest}
  <div class="detail-card" data-card="radius-8 padding-5">
    <header data-row="gap-2 start wrap">
      <div data-column="gap-1">
        <h3>{selectedTest.name}</h3>
        {#if selectedTest.description}
          <p class="body-text">{selectedTest.description}</p>
        {/if}
      </div>
      {#if txHash}
        <button
          type="button"
          class="explorer-link"
          onclick={() => onOpenInExplorer(txHash)}
          title="View on Etherscan"
        >
          &#8599;
        </button>
      {/if}
    </header>

    <div data-column="gap-4">
      {#if selectedTest.requirements && selectedTest.requirements.length > 0}
        <div class="requirements-box">
          <h4 class="requirements-title">Requirements:</h4>
          <ul class="requirements-list">
            {#each selectedTest.requirements as requirement (requirement)}
              <li>{requirement}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="detail-section">
        <span class="detail-label">Contract Address:</span>
        <code class="detail-code">{selectedTest.contractAddress}</code>
      </div>

      <div class="detail-section">
        <span class="detail-label">Risk Type:</span>
        <span class="risk-badge risk-{selectedTest.riskType}">
          {getRiskLabel(selectedTest.riskType)}
        </span>
      </div>

      <div class="detail-section">
        <span class="detail-label">Expected Wallet Behavior:</span>
        <p class="expected-behavior">{selectedTest.expectedBehavior}</p>
      </div>

      <div class="warning-box">
        <p class="warning-text">
          <strong>&#9888;&#65039; WARNING:</strong> This page is for testing only. Do NOT send real transactions.
        </p>
      </div>

      <button
        type="button"
        data-pressable
        onclick={() => onSendScamAlert(selectedTest)}
        disabled={!account?.address || isPending}
      >
        {#if isPending}
          Preparing...
        {:else if txHash}
          Transaction Sent
        {:else}
          Send Transaction (Testing Only)
        {/if}
      </button>

      {#if txHash}
        <div class="result-box">
          <span class="result-label">Transaction Hash:</span>
          <button type="button" class="result-link" onclick={() => onOpenInExplorer(txHash)}>
            {txHash.slice(0, 10)}...{txHash.slice(-8)} &#8599;
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .disclaimer-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .disclaimer-overlay {
    border: 2px solid var(--rating-fail);
    background: var(--background-primary);
    max-width: 36rem;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .disclaimer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 32rem;
    margin: 0 auto;
  }

  .disclaimer-icon {
    font-size: 3rem;
    color: var(--rating-fail);
  }

  .disclaimer-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--rating-fail);
    margin: 0;
  }

  .disclaimer-warnings {
    width: 100%;
  }

  .disclaimer-rule {
    font-size: 0.95rem;
    color: var(--text-primary);
    margin: 0;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--rating-fail) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 25%, transparent);
    border-radius: 0.5rem;
  }

  .disclaimer-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .disclaimer-checkbox input {
    width: 1.1rem;
    height: 1.1rem;
    cursor: pointer;
    appearance: auto;
    accent-color: var(--rating-fail);
  }

  .disclaimer-button {
    background-color: var(--rating-fail);
    color: white;
    font-weight: 600;
    padding: 0.7em 2em;
    border: none;
    border-radius: 0.5em;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .disclaimer-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .disclaimer-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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

  .risk-badge {
    display: inline-block;
    padding: 0.3em 0.75em;
    border-radius: 0.4em;
    font-size: 0.8rem;
    font-weight: 600;
    width: fit-content;
  }

  .risk-badge.risk-recent-deploy {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    color: #f59e0b;
    border: 1px solid color-mix(in srgb, #f59e0b 40%, transparent);
  }

  .risk-badge.risk-previous-interaction {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .risk-badge.risk-known-scam {
    background: color-mix(in srgb, var(--rating-fail) 15%, transparent);
    color: var(--rating-fail);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 40%, transparent);
  }

  .expected-behavior {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-secondary) 50%, transparent);
    border: 1px solid var(--background-secondary);
    border-radius: 0.5rem;
  }

  .warning-box {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--rating-fail) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 30%, transparent);
    border-radius: 0.5rem;
  }

  .warning-text {
    font-size: 0.8rem;
    color: var(--rating-fail);
    margin: 0;
    text-align: center;
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
</style>
