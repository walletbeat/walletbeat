<script lang="ts">
  export type TransactionSimulationSubTab =
    | 'erc20-transfer'
    | 'erc721-transfer'
    | 'erc1155-transfer'
    | 'failing-transaction'
    | 'revert-determinism'
    | 'amount-determinism';

  interface Props {
    activeSubTab: TransactionSimulationSubTab;
    account: { address?: string } | null;
  }

  let { activeSubTab, account }: Props = $props();

  const PLACEHOLDER_ADDRESS = '0x0000000000000000000000000000000000000000';
  const PLACEHOLDER_CALLDATA = '0x';

  const simulations: Record<
    TransactionSimulationSubTab,
    { name: string; description: string; contractAddress: string; calldata: string }
  > = {
    'erc20-transfer': {
      name: 'ERC-20 Transfer',
      description: 'Placeholder ERC-20 token transfer simulation.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
    'erc721-transfer': {
      name: 'ERC-721 Transfer',
      description: 'Placeholder ERC-721 NFT transfer simulation.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
    'erc1155-transfer': {
      name: 'ERC-1155 Transfer',
      description: 'Placeholder ERC-1155 multi-token transfer simulation.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
    'failing-transaction': {
      name: 'Failing Transaction',
      description: 'Placeholder transaction expected to revert/fail.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
    'revert-determinism': {
      name: 'Revert Determinism',
      description:
        'Tests whether the wallet flags a transaction that could possibly fail if on-chain state changes before it is mined.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
    'amount-determinism': {
      name: 'Amount Determinism',
      description:
        'Tests whether the wallet warns when the number of tokens received by a transaction may change depending on on-chain state at execution time.',
      contractAddress: PLACEHOLDER_ADDRESS,
      calldata: PLACEHOLDER_CALLDATA,
    },
  };

  const current = $derived(simulations[activeSubTab]);
</script>

<div class="tx-simulations-tab" data-column="gap-4">
  <div class="detail-card" data-card="radius-8 padding-5">
    <header data-row="gap-2 start wrap">
      <div data-column="gap-1">
        <h3>{current.name}</h3>
        <p class="body-text">{current.description}</p>
      </div>
    </header>

    <div data-column="gap-4">
      <div class="detail-section">
        <span class="detail-label">📍 Contract Address:</span>
        <code class="detail-code">{current.contractAddress}</code>
      </div>

      <div class="detail-section">
        <span class="detail-label">📦 Calldata:</span>
        <code class="detail-code calldata">{current.calldata}</code>
      </div>

      <div class="warning-box">
        <p class="warning-text">
          <strong>⚠️ WARNING:</strong> This page is for testing only. Do NOT send real transactions.
        </p>
      </div>

      <button type="button" data-pressable disabled={!account?.address}>
        Send Transaction (Testing Only)
      </button>
    </div>
  </div>
</div>

<style>
  .tx-simulations-tab {
    width: 100%;
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
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
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
</style>
