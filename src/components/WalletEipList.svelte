<script lang="ts">
	import { lucideNavigationIcons } from '@/icons/lucide-navigation-icons'
	import { eipEthereumDotOrgUrl, eipShortLabel, eipStatusLabel } from '@/schema/eips'
	import { variantLabel } from '@/schema/variants'
	import { childHeadingLevel, type ParentHeadingLevel } from '@/types/heading'
	import Typography from '@/components/Typography.svelte'
	import { markdown } from '@/types/content'
	import type { EipDirectoryEntry } from '@/utils/eip-directory'
	import { getEipTrackerUrl } from '@/utils/urls'

	let { eips, headingLevel = 2 }: { eips: EipDirectoryEntry[]; headingLevel?: ParentHeadingLevel } = $props()
	const sectionHeadingLevel = $derived(childHeadingLevel[headingLevel])
</script>

<div class="directory" data-column="gap-4">
	<fieldset data-row="start wrap">
		<legend>Filter standards</legend>
		<label><input type="radio" name="eip-prefix" value="all" checked /> All</label>
		<label><input type="radio" name="eip-prefix" value="EIP" /> EIPs</label>
		<label><input type="radio" name="eip-prefix" value="ERC" /> ERCs</label>
	</fieldset>
	<p>{eips.length} tracked standards</p>
	{#each eips as eip (eip.number)}
		<details data-prefix={eip.prefix} data-card="secondary padding-4 radius-4">
			<summary data-row="start gap-4">
				<span data-icon aria-hidden="true">
					{#if eip.icon in lucideNavigationIcons}
						{@html (lucideNavigationIcons as Record<string, string>)[eip.icon]}
					{:else}
						<span data-icon="wbicons-simple {eip.icon}"></span>
					{/if}
				</span>
				<svelte:element this={`h${headingLevel}`} data-row-item="flexible">{eipShortLabel(eip)}: {eip.friendlyName}</svelte:element>
				<span data-tag="eip-status">{eipStatusLabel[eip.status]}</span>
			</summary>
			<div data-column="gap-6">
				<section data-column="gap-2">
					<svelte:element this={`h${sectionHeadingLevel}`}>Summary</svelte:element>
					<Typography content={markdown(eip.summaryMarkdown)} />
				</section>
				<section data-column="gap-2">
					<svelte:element this={`h${sectionHeadingLevel}`}>Why it matters for wallets</svelte:element>
					<Typography content={markdown(eip.whyItMattersMarkdown)} />
				</section>
				{#if eip.noteMarkdown}
					<section data-column="gap-2">
						<svelte:element this={`h${sectionHeadingLevel}`}>Notes</svelte:element>
						<Typography content={markdown(eip.noteMarkdown)} />
					</section>
				{/if}
				<section data-column="gap-2">
					<svelte:element this={`h${sectionHeadingLevel}`}>Verified support</svelte:element>
					{#if eip.implementers.length > 0}
						<ul data-list="unstyled" data-column="gap-2">
							{#each eip.implementers as wallet (wallet.id)}
								<li><a href={wallet.url}>{wallet.displayName}</a>: {wallet.variants.map(variantLabel).join(', ')}</li>
							{/each}
						</ul>
					{:else}
						<p>Walletbeat has no verified support for {eipShortLabel(eip)}. Support may be unknown; see the tracker for each platform's status.</p>
					{/if}
				</section>
				<footer data-row="start wrap">
					<a href={getEipTrackerUrl(eip)}>Wallet support tracker →</a>
					<a href={eipEthereumDotOrgUrl(eip)} target="_blank" rel="noopener noreferrer">Read full specification →</a>
				</footer>
			</div>
		</details>
	{/each}
</div>

<style>
	input {
		appearance: auto;
		padding: 0;
	}

	.directory {
		&:has(input[value="EIP"]:checked) > details[data-prefix="ERC"],
		&:has(input[value="ERC"]:checked) > details[data-prefix="EIP"] {
			display: none;
		}
	}
</style>
