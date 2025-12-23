<script lang="ts">
  interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }

  let { isOpen, title, onClose, children, footer }: ModalProps = $props();
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClose())}
  >
    <div class="modal" data-card="radius-8 padding-5">
      <h3>{title}</h3>
      <div class="modal-content">
        {@render children()}
      </div>
      {#if footer}
        <div class="modal-footer" data-row="gap-2 end wrap">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .modal {
    max-width: 26rem;
    width: 100%;
  }

  .modal-content {
    margin-block: 1rem 1.5rem;
  }

  .modal-footer {
    margin-top: 0.5rem;
  }
</style>