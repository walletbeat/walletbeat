<script lang="ts">
	const titleId = $props.id()
	let dialog = $state<HTMLDialogElement>()

	let {
		isOpen,
		title,
		onClose,
		children,
		footer,
	}: {
		isOpen: boolean
		title: string
		onClose: () => void
		children: import('svelte').Snippet
		footer?: import('svelte').Snippet
	} = $props()

	$effect(() => {
		if (!dialog) return

		if (isOpen && !dialog.open) dialog.showModal()
		else if (!isOpen && dialog.open) dialog.close()
	})

</script>


<dialog
	bind:this={dialog}
	class="modal-dialog"
	aria-labelledby={titleId}
	closedby="any"
	onclose={() => {
		if (isOpen && !dialog?.open) onClose()
	}}
>
	{#if isOpen}
		<div class="modal" data-card="radius-8 padding-5">
			<h3 id={titleId}>{title}</h3>
			<div class="modal-content">
				{@render children()}
			</div>
			{#if footer}
				<div class="modal-footer" data-row="gap-2 end wrap">
					{@render footer()}
				</div>
			{/if}
		</div>
	{/if}
</dialog>


<style>
	.modal-dialog {
		inline-size: min(26rem, calc(100% - 2rem));
		max-inline-size: calc(100% - 2rem);
		max-block-size: calc(100dvh - 2rem);
		margin: auto;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		overflow: auto;
		overscroll-behavior: contain;

		&::backdrop {
			background: rgba(0, 0, 0, 0.6);
		}
	}

	.modal {
		width: 100%;
	}

	:global([data-scroll-container]:has(dialog.modal-dialog:modal)) {
		overflow: hidden;
	}

	.modal-content {
		margin-block: 1rem 1.5rem;
	}

	.modal-footer {
		margin-top: 0.5rem;
	}
</style>
