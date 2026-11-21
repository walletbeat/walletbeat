<script lang="ts">
	import Modal from '@/components/Modal.svelte'
	let isOpen = $state(true)
	let activations = $state(0)
</script>

<button onclick={() => { isOpen = true }}>Open modal</button>
<output aria-label="Activations">{activations}</output>
<Modal {isOpen} title="Keyboard ownership" onClose={() => { isOpen = false }}>
	<label><input type="checkbox" /> Acknowledgement</label>
	<label>Message <input type="text" /></label>
	<button onclick={() => { activations += 1 }}>Activate</button>
</Modal>
