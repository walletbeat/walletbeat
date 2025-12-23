<script lang="ts">
  interface ErrorComponentProps {
    error: string | null;
    onClose: () => void;
  }

  let { error, onClose }: ErrorComponentProps = $props();
</script>

{#if error}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    onclick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClose();
      }
    }}
  >
    <div class="modal" data-card="radius-8 padding-5">
      <h3>Error</h3>

      <div class="error-content">
        <p class="error-message" role="alert">{error}</p>
      </div>

      <div class="modal-footer" data-row="gap-2 end wrap">
        <button
          type="button"
          data-pressable
          onclick={onClose}
        >
          Close
        </button>
      </div>
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

  .error-content {
    margin-block: 1rem 1.5rem;
  }

  .error-message {
    font-size: 0.9rem;
    color: var(--rating-fail);
    margin: 0;
    word-break: break-word;
  }

  .modal-footer {
    margin-top: 0.5rem;
  }
</style>

