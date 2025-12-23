<script lang="ts">
  interface SidebarItemProps {
    title: string;
    description?: string;
    isSelected: boolean;
    isCompleted: boolean;
    onclick: () => void;
  }

  let { title, description, isSelected, isCompleted, onclick }: SidebarItemProps = $props();
</script>

<button type="button" class="sidebar-item" class:selected={isSelected} {onclick}>
  <div class="sidebar-item-header">
    <h3 class="sidebar-item-title">{title}</h3>
    {#if isCompleted}
      <span class="sidebar-item-check">✓</span>
    {/if}
  </div>
  {#if description}
    <p class="sidebar-item-desc">{description}</p>
  {/if}
</button>

<style>
  /* Move sidebar-item styles here */
</style>