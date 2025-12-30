<script lang="ts">
  import Modal from '../Modal.svelte';

  interface Props {
    isOpen: boolean;
    isSwitching: boolean;
    currentChainId: number | undefined;
    onClose: () => void;
    onSwitch: () => void;
  }

  let { isOpen, isSwitching, currentChainId, onClose, onSwitch }: Props = $props();
</script>

<Modal {isOpen} title="Switch to Ethereum Mainnet" {onClose}>
  <div class="body-text" data-column="gap-2">
    <p>
      You are currently on chain ID <strong>{currentChainId ?? 'unknown'}</strong>.
      These test transactions require Ethereum mainnet (chain ID 1).
    </p>
    <p>Would you like to switch to mainnet?</p>
  </div>
  {#snippet footer()}
    <button type="button" class="secondary-button" onclick={onClose} disabled={isSwitching}>
      Cancel
    </button>
    <button type="button" data-pressable onclick={onSwitch} disabled={isSwitching}>
      {isSwitching ? 'Switching…' : 'Switch to Mainnet'}
    </button>
  {/snippet}
</Modal>

<style>
  .body-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .secondary-button {
    background-color: var(--background-secondary);
  }
</style>