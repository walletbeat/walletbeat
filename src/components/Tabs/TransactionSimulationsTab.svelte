<script lang="ts">
  export type TransactionSimulationSubTab =
    | 'erc20-mint'
    | 'erc721-mint'
    | 'erc1155-mint'
    | 'all-token-transfer'
    | 'misleading-selector'
    | 'fake-airdrop'
    | 'volatile-outcome'
    | 'failing-transaction';

  interface Props {
    activeSubTab: TransactionSimulationSubTab;
    account: { address?: string } | null;
  }

  let { activeSubTab, account }: Props = $props();

  import {
    WALLETBEAT_TEST_CONTRACT,
    WALLETBEAT_TEST_ERC721,
    WALLETBEAT_TEST_ERC1155,
    WALLETBEAT_TEST_ERC20,
  } from '../../constants/test-contracts';

  const simulations: Record<
    TransactionSimulationSubTab,
    { name: string; description: string; contractAddress: string; calldata: string }
  > = {
    'erc20-mint': {
      name: 'ERC-20 Mint',
      description:
        'Mints exactly 100 tokens (100e18) to the caller via mintHundred(). Deterministic — the simulation result should always match execution.',
      contractAddress: WALLETBEAT_TEST_ERC20,
      calldata: '0x4838e647',
    },
    'erc721-mint': {
      name: 'ERC-721 Mint',
      description:
        'Mints exactly one ERC-721 NFT to the caller via mintOne(). Deterministic — the simulation result should always match execution.',
      contractAddress: WALLETBEAT_TEST_ERC721,
      calldata: '0x0ced8637',
    },
    'erc1155-mint': {
      name: 'ERC-1155 Mint',
      description:
        'Mints exactly one ERC-1155 token to the caller via mintOne(). Deterministic — the simulation result should always match execution.',
      contractAddress: WALLETBEAT_TEST_ERC1155,
      calldata: '0x0ced8637',
    },
    'all-token-transfer': {
      name: 'All Token Transfer',
      description:
        'Mints ERC-20, ERC-721, and ERC-1155 tokens to the caller in a single transaction via simulateFunctionV1(). Tests whether the wallet correctly shows all three asset types in its simulation. Amounts vary by block number.',
      contractAddress: WALLETBEAT_TEST_CONTRACT,
      calldata: '0xf88a1a98',
    },
    'misleading-selector': {
      name: 'Misleading Selector',
      description:
        'Uses the standard ERC-20 transfer() selector (0xa9059cbb) on a contract that actually mints tokens to the caller — ignoring the recipient and amount entirely. Tests whether wallets simulate actual behavior or assume behavior from the function signature.',
      contractAddress: WALLETBEAT_TEST_CONTRACT,
      calldata:
        '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    },
    'fake-airdrop': {
      name: 'Fake Airdrop',
      description:
        'Burns the caller\'s entire ERC-20 balance while emitting a Transfer(0x0 → caller) event to suggest a mint. Tests whether wallets detect the real outcome (balance drain) behind a misleading event.',
      contractAddress: WALLETBEAT_TEST_CONTRACT,
      calldata: '0x4e71d92d',
    },
    'volatile-outcome': {
      name: 'Volatile Outcome',
      description:
        'Calls a function that mints tokens on even blocks and burns all tokens on odd blocks via simulateFunctionV2(). Tests whether wallets detect and warn about state-dependent outcomes that may differ at execution time.',
      contractAddress: WALLETBEAT_TEST_CONTRACT,
      calldata: '0xa79c3153',
    },
    'failing-transaction': {
      name: 'Failing Transaction',
      description:
        'Always reverts unconditionally via alwaysFails(). Tests whether wallets correctly identify and warn about transactions that are guaranteed to fail.',
      contractAddress: WALLETBEAT_TEST_CONTRACT,
      calldata: '0x128e6c37',
    },
  };

  const current = $derived(simulations[activeSubTab]);

  async function sendTransaction() {
    if (!account?.address) return;
    const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      alert('No wallet detected. Please connect a wallet first.');
      return;
    }
    await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: account.address,
          to: current.contractAddress,
          data: current.calldata,
        },
      ],
    });
  }
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

      <button type="button" data-pressable disabled={!account?.address} onclick={sendTransaction}>
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
