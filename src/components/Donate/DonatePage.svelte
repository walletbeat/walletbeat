<script lang="ts">
	import { onMount } from 'svelte'

	import { parseDonationsSnapshot, rankDonors } from '@/lib/donations'
	import type { Erc55Address } from '@/types/utils/ethereum-address'
	import DonateForm from './DonateForm.svelte'
	import TopDonors from './TopDonors.svelte'

	let {
		snapshotJson,
		excludedSenders,
	}: {
		/** Contents of the donations snapshot file. */
		snapshotJson: unknown
		/** Addresses that never count as donors. */
		excludedSenders: Erc55Address[]
	} = $props()

	const tabs = [
		{ id: 'donate', label: 'Donate' },
		{ id: 'top-donors', label: 'Top donors' },
	] as const

	type TabId = (typeof tabs)[number]['id']

	function tabFromHash(hash: string): TabId {
		return tabs.find(tab => `#${tab.id}` === hash)?.id ?? 'donate'
	}

	let activeTab = $state<TabId>('donate')

	const snapshot = $derived(parseDonationsSnapshot(snapshotJson))
	const excluded = $derived(new Set(excludedSenders))
	const donorCount = $derived(
		rankDonors(snapshot.transfers, excluded).length,
	)

	onMount(() => {
		activeTab = tabFromHash(window.location.hash)

		const onHashChange = () => {
			activeTab = tabFromHash(window.location.hash)
		}

		window.addEventListener('hashchange', onHashChange)

		return () => window.removeEventListener('hashchange', onHashChange)
	})

	function selectTab(id: TabId): void {
		activeTab = id
		history.replaceState(null, '', id === 'donate' ? window.location.pathname : `#${id}`)
	}
</script>


<section class="donate-page" data-column="gap-6">
	<div class="tab-selector" role="tablist" data-row="start gap-1">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				role="tab"
				id={`tab-${tab.id}`}
				aria-selected={activeTab === tab.id}
				aria-controls={`panel-${tab.id}`}
				class="tab-button"
				class:active={activeTab === tab.id}
				onclick={() => selectTab(tab.id)}
			>
				{tab.label}
				{#if tab.id === 'top-donors'}
					<span data-badge="small">{donorCount}</span>
				{/if}
			</button>
		{/each}
	</div>

	<div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
		{#if activeTab === 'donate'}
			<DonateForm />
		{:else}
			<TopDonors {snapshot} excludedSenders={excluded} />
		{/if}
	</div>
</section>


<style>
	.tab-selector {
		align-self: flex-start;
		align-items: stretch;
		padding: 0.25rem;
		border: 1px solid var(--border-color);
		border-radius: 999px;
		background-color: var(--background-secondary);
	}

	.tab-button {
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-weight: 600;

		&:hover {
			color: var(--text-primary);
		}

		&.active {
			background-color: var(--accent-backgroundColor);
			color: var(--accent);
		}
	}
</style>
