<script lang="ts">
  import type { WalletEip } from '../../data/wallet-eips';

  export let eip: WalletEip;

  const statusColor: Record<string, string> = {
    Final: 'status-final',
    Review: 'status-review',
    Draft: 'status-draft',
    Stagnant: 'status-stagnant',
    Withdrawn: 'status-withdrawn',
    Living: 'status-living',
  };
</script>

<article class="eip-card">
  <header class="eip-card__header">
    <a
      class="eip-number"
      href={eip.specUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="EIP-{eip.number} specification"
    >
      EIP-{eip.number}
    </a>
    <span class="eip-status {statusColor[eip.status] ?? 'status-draft'}">{eip.status}</span>
  </header>

  <h3 class="eip-card__title">{eip.title}</h3>

  <p class="eip-card__summary">{eip.summary}</p>

  <div class="eip-card__relevance">
    <span class="relevance-label">Why it matters for wallets</span>
    <p>{eip.walletRelevance}</p>
  </div>

  <footer class="eip-card__footer">
    <a
      class="eip-card__spec-link"
      href={eip.specUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Read spec ↗
    </a>
    {#if eip.walletbeatAttributeSlug}
      <a
        class="eip-card__rating-link"
        href="/attributes/{eip.walletbeatAttributeSlug}"
      >
        See wallet ratings →
      </a>
    {/if}
  </footer>
</article>

<style>
  .eip-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--color-border, #2a2e37);
    border-radius: 0.75rem;
    background: var(--color-card-bg, #181c24);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .eip-card:hover {
    border-color: var(--color-accent, #7c6af7);
    box-shadow: 0 0 0 1px var(--color-accent, #7c6af7);
  }

 
  .eip-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .eip-number {
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-accent, #7c6af7);
    text-decoration: none;
    letter-spacing: 0.04em;
  }

  .eip-number:hover {
    text-decoration: underline;
  }

 
  .eip-status {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.2em 0.6em;
    border-radius: 99px;
  }

  .status-final    { background: #0f3d1e; color: #4ade80; }
  .status-review   { background: #2c2a0a; color: #facc15; }
  .status-draft    { background: #1e2230; color: #94a3b8; }
  .status-stagnant { background: #2a1a0a; color: #fb923c; }
  .status-withdrawn { background: #2a0f0f; color: #f87171; }
  .status-living   { background: #0f2a3d; color: #38bdf8; }

  
  .eip-card__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary, #e8eaf0);
    line-height: 1.4;
  }

 
  .eip-card__summary {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary, #8b90a0);
    line-height: 1.6;
  }

  .eip-card__relevance {
    padding: 0.75rem 1rem;
    background: var(--color-relevance-bg, #0f1218);
    border-left: 3px solid var(--color-accent, #7c6af7);
    border-radius: 0 0.375rem 0.375rem 0;
  }

  .relevance-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-accent, #7c6af7);
    margin-bottom: 0.375rem;
  }

  .eip-card__relevance p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #8b90a0);
    line-height: 1.6;
  }

  
  .eip-card__footer {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-top: auto;
    padding-top: 0.25rem;
  }

  .eip-card__spec-link,
  .eip-card__rating-link {
    font-size: 0.82rem;
    font-weight: 500;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }

  .eip-card__spec-link {
    color: var(--color-text-secondary, #8b90a0);
  }

  .eip-card__rating-link {
    color: var(--color-accent, #7c6af7);
  }

  .eip-card__spec-link:hover,
  .eip-card__rating-link:hover {
    opacity: 0.75;
  }
</style>
