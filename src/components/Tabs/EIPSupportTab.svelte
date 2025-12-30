<script lang="ts">
  import type { EIPTest, EIPTestStatus } from '../../constants/test-eip-support';

  interface Props {
    selectedEip: EIPTest | undefined;
    eipState: {
      activeId: string | null;
      isTesting: boolean;
      results: Record<string, Record<string, EIPTestStatus>>;
      discoveredProviders: Array<{
        uuid: string;
        name: string;
        icon: string;
        rdns: string;
        provider: unknown;
      }>;
    };
    onTestEIPSupport: (eip: EIPTest) => void;
  }

  let { selectedEip, eipState, onTestEIPSupport }: Props = $props();

  const isActive = $derived(selectedEip && eipState.activeId === selectedEip.id);
  const isTesting = $derived(eipState.isTesting && isActive);
  const testResults = $derived(selectedEip ? eipState.results[selectedEip.id] : undefined);
</script>

{#if selectedEip}
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
          <span class="detail-label"
            >🔍 Discovered Providers ({eipState.discoveredProviders.length}):</span
          >
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

      <button type="button" data-pressable onclick={() => onTestEIPSupport(selectedEip)} disabled={isTesting}>
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