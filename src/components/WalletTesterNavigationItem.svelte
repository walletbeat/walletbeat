<script lang="ts">
  interface WalletTesterNavigationItemProps {
    title: string;
    description?: string;
    isSelected: boolean;
    isCompleted: boolean;
    isPartial?: boolean;
    isFailed?: boolean;
    isDisabled?: boolean;
    onclick: () => void;
  }

  let {
    title,
    description,
    isSelected,
    isCompleted,
    isPartial = false,
    isFailed = false,
    isDisabled = false,
    onclick,
  }: WalletTesterNavigationItemProps = $props();
</script>

<button
  type="button"
  class="sidebar-item"
  class:selected={isSelected}
  class:completed={isCompleted}
  class:partial={isPartial}
  class:failed={isFailed}
  class:disabled={isDisabled}
  disabled={isDisabled}
  {onclick}
>
  <div class="sidebar-item-header">
    <h3 class="sidebar-item-title">{title}</h3>
    {#if isCompleted}
      <span class="sidebar-item-check passed">✓</span>
    {:else if isPartial}
      <span class="sidebar-item-check partial">⚠</span>
    {:else if isFailed}
      <span class="sidebar-item-check failed">✗</span>
    {/if}
  </div>
  {#if description}
    <p class="sidebar-item-desc">{description}</p>
  {/if}
</button>

<style>
  .sidebar-item {
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: transparent;
    border: none;
    border-radius: 0.5rem;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .sidebar-item:hover:not(.disabled) {
    background-color: var(--background-secondary);
  }

  .sidebar-item.selected {
    background-color: color-mix(in srgb, var(--accent) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .sidebar-item.completed:not(.selected) {
    background-color: color-mix(in srgb, var(--rating-pass) 5%, transparent);
  }

  .sidebar-item.partial:not(.selected) {
    background-color: color-mix(in srgb, var(--rating-partial) 5%, transparent);
  }

  .sidebar-item.failed:not(.selected) {
    background-color: color-mix(in srgb, var(--rating-fail) 5%, transparent);
  }

  .sidebar-item.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .sidebar-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .sidebar-item-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .sidebar-item.selected .sidebar-item-title {
    color: var(--accent);
  }

  .sidebar-item.completed .sidebar-item-title {
    color: var(--rating-pass);
  }

  .sidebar-item.partial .sidebar-item-title {
    color: var(--rating-partial);
  }

  .sidebar-item.failed .sidebar-item-title {
    color: var(--rating-fail);
  }

  .sidebar-item-check {
    font-size: 1rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .sidebar-item-check.passed {
    color: var(--rating-pass);
  }

  .sidebar-item-check.partial {
    color: var(--rating-partial);
  }

  .sidebar-item-check.failed {
    color: var(--rating-fail);
  }

  .sidebar-item-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0;
    text-align: left;
    line-height: 1.4;
  }
</style>
