<script lang="ts">
  import type { TestSignature } from '../../constants/test-transactions-signatures';

  interface Props {
    selectedSig: TestSignature | undefined;
    signatureState: {
      activeId: string | null;
      isPending: boolean;
      results: Record<string, string>;
    };
    account: { address?: string } | null;
    onSignMessage: (sig: TestSignature) => void;
    onSignTypedData: (sig: TestSignature) => void;
  }

  let { selectedSig, signatureState, account, onSignMessage, onSignTypedData }: Props = $props();

  const isActive = $derived(selectedSig && signatureState.activeId === selectedSig.id);
  const isPending = $derived(signatureState.isPending && isActive);
  const sigResult = $derived(selectedSig ? signatureState.results[selectedSig.id] : undefined);
</script>

{#if selectedSig}
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
            {#each selectedSig.requirements as requirement (requirement)}
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
              <span class="domain-key">Name:</span>
              {selectedSig.domain.name}
            </div>
            <div class="domain-item">
              <span class="domain-key">Version:</span>
              {selectedSig.domain.version}
            </div>
            <div class="domain-item">
              <span class="domain-key">Chain ID:</span>
              {selectedSig.domain.chainId}
            </div>
            <div class="domain-item">
              <span class="domain-key">Verifying Contract:</span>
              {selectedSig.domain.verifyingContract}
            </div>
            <div class="domain-item">
              <span class="domain-key">Salt:</span>
              {selectedSig.domain.salt}
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
            onSignMessage(selectedSig);
          } else {
            onSignTypedData(selectedSig);
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

<style>
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

  .detail-code.message-content {
    white-space: pre-wrap;
    font-size: 0.75rem;
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
</style>