<script lang="ts">
	import Modal from './Modal.svelte'
	let {
		error,
		onClose,
	}: {
		error: string | null
		onClose: () => void
	} = $props()
</script>

<Modal isOpen={Boolean(error)} title="Error" {onClose}>
	<p class="error-message" role="alert">{error}</p>
	{#snippet footer()}
		<button type="button" data-pressable onclick={onClose}>Close</button>
	{/snippet}
</Modal>

<style>


	.error-message {
		font-size: 0.9rem;
		color: var(--rating-fail-text);
		margin: 0;
		word-break: break-word;
	}

</style>
