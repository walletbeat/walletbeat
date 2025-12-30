<script lang="ts">
  import type { Connector } from '@wagmi/core';
  import Modal from '../Modal.svelte';

  interface Props {
    isOpen: boolean;
    connectors: readonly Connector[];
    isConnecting: boolean;
    onClose: () => void;
    onConnect: (connector: Connector) => void;
  }

  let { isOpen, connectors, isConnecting, onClose, onConnect }: Props = $props();
</script>

<Modal {isOpen} title="Select a wallet" {onClose}>
  {#if connectors.length}
    <div class="connector-list" data-column="gap-2">
      {#each connectors as connector (connector.uid)}
        <button
          type="button"
          class="connector-button"
          data-pressable
          onclick={() => onConnect(connector)}
          disabled={isConnecting}
        >
          <span class="connector-name">{connector.name}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="body-text">No wallet connectors available in this environment.</p>
  {/if}
  {#snippet footer()}
    <button type="button" class="secondary-button" onclick={onClose} disabled={isConnecting}>
      Close
    </button>
  {/snippet}
</Modal>

<style>
  .connector-list {
    margin-block: 1rem 1.5rem;
  }

  .connector-button {
    width: 100%;
    justify-content: space-between;
  }

  .connector-name {
    font-weight: 500;
  }

  .secondary-button {
    background-color: var(--background-secondary);
  }

  .body-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }
</style>