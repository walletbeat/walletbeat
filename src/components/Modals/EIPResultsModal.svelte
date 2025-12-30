<script lang="ts">
  import Modal from '../Modal.svelte';

  interface Props {
    isOpen: boolean;
    passed: boolean;
    failedChecks: Array<{ name: string; description: string }>;
    onClose: () => void;
  }

  let { isOpen, passed, failedChecks, onClose }: Props = $props();
</script>

<Modal {isOpen} title={passed ? 'Test Passed ✓' : 'Test Failed ✗'} {onClose}>
  {#if passed}
    <div class="eip-results-content" data-column="gap-3">
      <div class="eip-success-message" data-column="gap-2">
        <div class="eip-success-icon">✓</div>
        <p class="eip-success-text">
          All required compliance checks passed! This wallet fully supports the tested EIP standard.
        </p>
      </div>
    </div>
  {:else}
    <div class="eip-results-content" data-column="gap-3">
      <div class="eip-fail-message" data-column="gap-2">
        <div class="eip-fail-icon">✗</div>
        <p class="eip-fail-text">
          Some required compliance checks failed. The wallet does not fully support this EIP
          standard.
        </p>
      </div>

      {#if failedChecks.length > 0}
        <div class="eip-failed-checks" data-column="gap-2">
          <h4 class="failed-checks-title">Missing Required Features:</h4>
          <ul class="failed-checks-list">
            {#each failedChecks as check (check.name)}
              <li class="failed-check-item">
                <span class="failed-check-name">{check.name}</span>
                <span class="failed-check-description">{check.description}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
  {#snippet footer()}
    <button type="button" data-pressable onclick={onClose}>Close</button>
  {/snippet}
</Modal>

<style>
  .eip-results-content {
    margin-block: 1rem 1.5rem;
  }

  .eip-success-message {
    align-items: center;
    text-align: center;
    padding: 1.5rem;
  }

  .eip-success-icon {
    font-size: 4rem;
    color: var(--rating-pass);
    line-height: 1;
  }

  .eip-success-text {
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0;
  }

  .eip-fail-message {
    align-items: center;
    text-align: center;
    padding: 1.5rem 1.5rem 1rem;
  }

  .eip-fail-icon {
    font-size: 4rem;
    color: var(--rating-fail);
    line-height: 1;
  }

  .eip-fail-text {
    font-size: 1rem;
    color: var(--text-primary);
    margin: 0;
  }

  .eip-failed-checks {
    padding: 1rem;
    background: color-mix(in srgb, var(--rating-fail) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--rating-fail) 20%, transparent);
    border-radius: 0.5rem;
  }

  .failed-checks-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--rating-fail);
    margin: 0 0 0.75rem 0;
  }

  .failed-checks-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .failed-check-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--background-primary) 50%, transparent);
    border-radius: 0.375rem;
  }

  .failed-check-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .failed-check-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
</style>