<script lang="ts">
	import { flushSync, onMount } from 'svelte'
	import { createConfig, http } from '@wagmi/core'
	import { mainnet } from '@wagmi/core/chains'
	import { mock } from 'wagmi/connectors'
	import Modal from '@/components/Modal.svelte'
	import ChainSwitchModal from '@/components/Modals/ChainSwitchModal.svelte'
	import ConnectorModal from '@/components/Modals/ConnectorModal.svelte'
	import EIPResultsModal from '@/components/Modals/EIPResultsModal.svelte'
	import type { StepResult } from '@/constants/test-eip-support'

	let ready = $state(false)
	let isOpen = $state(false)
	let mounted = $state(true)
	let mode = $state('basic')
	let consumer = $state('')
	let closes = $state(0)
	let actions = $state(0)
	let invokerPresent = $state(true)
	const config = createConfig({
		chains: [mainnet],
		connectors: [mock({ accounts: ['0x0000000000000000000000000000000000000001'] })],
		transports: { [mainnet.id]: http() },
		storage: null,
		ssr: true,
	})
	const results: StepResult[] = Array.from({ length: 30 }, (_, index) => ({
		stepId: `step-${index}`,
		status: 'passed',
		eipResults: [],
	}))
	onMount(() => { ready = true })
	function close() {
		closes++
		isOpen = false
		consumer = ''
	}
</script>

<main data-column="gap-3" class="fixture">
	<h1>Modal lifecycle fixture</h1>
	{#each ['basic', 'empty', 'disabled', 'long'] as kind (kind)}
		{#if kind !== 'basic' || invokerPresent}
		<button id={`open-${kind}`} disabled={!ready} onclick={() => { mode = kind; mounted = true; isOpen = true }}>Open {kind}</button>
		{/if}
	{/each}
	{#each ['connector', 'empty-connector', 'connector-busy', 'chain', 'busy', 'results'] as kind (kind)}
		<button id={`open-${kind}`} disabled={!ready} onclick={() => { consumer = kind }}>Open {kind}</button>
	{/each}
	<output id="modal-counts">Actions: {actions}; closes: {closes}</output>
	<a href="#fixture-end" id="outside-link">Outside link</a>
	{#each Array.from({ length: 30 }) as _, index (index)}
		<p>Background content preserves its scroll position while the modal is open.</p>
	{/each}
	<div id="fixture-end">End</div>
</main>

{#if mounted}
	<Modal {isOpen} title={`Shared ${mode} modal`} onClose={close}>
		{#if mode !== 'empty'}
			<button id="modal-action" disabled={mode === 'disabled'} onclick={() => { actions++ }}>Run action</button>
		{/if}
		{#if mode === 'basic'}
			<button popovertarget="modal-help">Open help</button>
			<div id="modal-help" popover="auto">Nested help <button popovertarget="modal-help" popovertargetaction="hide">Close help</button></div>
			<button id="modal-reopen" onclick={() => { flushSync(() => { isOpen = false }); flushSync(() => { isOpen = true }) }}>Close and reopen</button>
			<button id="modal-unmount" onclick={() => { mounted = false }}>Unmount modal</button>
			<button id="modal-parent-close" onclick={() => { isOpen = false }}>Parent close</button>
			<button id="modal-remove-invoker" onclick={() => { invokerPresent = false }}>Remove invoker</button>
		{/if}
		{#if mode === 'long'}
			{#each Array.from({ length: 40 }) as _, index (index)}
				<p>Long modal content remains reachable in its own scroll container.</p>
			{/each}
		{/if}
		{#snippet footer()}
			{#if mode !== 'empty'}
				<button id="modal-close" disabled={mode === 'disabled'} onclick={close}>Close modal</button>
			{/if}
		{/snippet}
	</Modal>
{/if}

<ConnectorModal isOpen={['connector', 'empty-connector', 'connector-busy'].includes(consumer)} connectors={consumer === 'empty-connector' ? [] : config.connectors} isConnecting={consumer === 'connector-busy'} onClose={close} onConnect={() => { actions++ }} />
<ChainSwitchModal isOpen={consumer === 'chain' || consumer === 'busy'} isSwitching={consumer === 'busy'} currentChainId={10} onClose={close} onSwitch={() => { actions++ }} />
<EIPResultsModal isOpen={consumer === 'results'} overallPassed={true} hasPartialResults={false} stepResults={results} onClose={close} />

<style>
	.fixture { padding: 1rem; }
</style>
