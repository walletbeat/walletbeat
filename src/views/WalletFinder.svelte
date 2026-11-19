<script lang="ts">
	import { tick } from 'svelte'

	import { ratingToText } from '@/schema/attributes'
	import { variantLabel } from '@/schema/variants'
	import {
		type FinderWallet,
		finderCriteria,
		finderPlatforms,
		findWallets,
		initialFinderAnswers,
	} from '@/utils/wallet-finder'

	const { wallets }: { wallets: FinderWallet[] } = $props()
	let answers = $state(initialFinderAnswers())
	let submitted = $state(false)
	let selected = $state<string[]>([])
	let comparisonVisible = $state(false)
	let resultsHeading: HTMLHeadingElement | undefined = $state()
	const matches = $derived(findWallets(wallets, answers))
	const activeCriteria = $derived(finderCriteria.filter(({ id }) => answers.priorities[id] !== 'ignore'))
	const compared = $derived(matches.filter(match => selected.includes(match.wallet.id)))

	function clearResults() {
		submitted = false
		selected = []
		comparisonVisible = false
	}

	async function showResults(event: SubmitEvent) {
		event.preventDefault()
		submitted = true
		await tick()
		resultsHeading?.focus()
	}
</script>

<form onsubmit={showResults} onchange={clearResults} data-card="padding-6" data-column="gap-6">
	<fieldset data-column="gap-3">
		<legend>Where do you want to use your wallet?</legend>
		<label for="finder-platform">Platform</label>
		<select id="finder-platform" bind:value={answers.platform}>
			<option value="any">Any platform</option>
			{#each finderPlatforms as platform}
				<option value={platform}>{variantLabel(platform)}</option>
			{/each}
		</select>
		<p>Mobile and desktop refer to app types. Check the wallet profile for device compatibility.</p>
	</fieldset>
	<fieldset data-column="gap-4">
		<legend>What do you need from your wallet?</legend>
		<p>Require includes only wallets that pass that assessment. Prefer also gives credit for partial support.</p>
		{#each finderCriteria as criterion}
			<div data-column="gap-2">
				<label for={`finder-${criterion.id}`}>{criterion.question}</label>
				<select id={`finder-${criterion.id}`} bind:value={answers.priorities[criterion.id]}>
					<option value="ignore">No preference</option>
					<option value="prefer">Prefer</option>
					<option value="require">Require</option>
				</select>
			</div>
		{/each}
	</fieldset>
	<div data-row="wrap gap-3">
		<button type="submit">Find matching wallets</button>
		<button type="button" onclick={() => { answers = initialFinderAnswers(); clearResults() }}>Reset answers</button>
	</div>
</form>

<details data-card="padding-6">
	<summary>How matching works</summary>
	<p>All requirements must pass on the same platform. A preference earns two points for a pass and one for a partial rating. Failed, unrated, and exempt assessments earn zero points. Ties favor fewer unrated answers, then wallet name. With any platform selected, each wallet appears with its best matching platform.</p>
	<p>These points describe how closely the listed assessments match your answers. Read each assessment for its conditions and evidence.</p>
</details>

{#if submitted}
	<section aria-labelledby="finder-results" data-column="gap-4">
		<h2 id="finder-results" tabindex="-1" bind:this={resultsHeading}>{matches.length} matching wallets</h2>
		{#if matches.length === 0}
			<p>No wallet has verified passes for all your requirements on the selected platform. Try changing a requirement to a preference or choosing another platform.</p>
		{:else}
			<p>Select up to four wallets to compare their assessments side by side.</p>
			{#each matches as match (match.wallet.id)}
				<article data-card="padding-6" data-column="gap-3">
					<h3><a href={match.variant.url}>{match.wallet.name}</a></h3>
					<p>{variantLabel(match.variant.platform)}</p>
					{#if activeCriteria.length > 0}
						<ul>
							{#each activeCriteria as criterion}
								<li><a href={match.variant.assessments[criterion.id].url}>{criterion.label}</a> — {ratingToText(match.variant.assessments[criterion.id].rating)}. {match.variant.assessments[criterion.id].explanation}.</li>
							{/each}
						</ul>
					{/if}
					<label>
						<input type="checkbox" value={match.wallet.id} bind:group={selected} disabled={selected.length >= 4 && !selected.includes(match.wallet.id)} onchange={() => { comparisonVisible = false }} />
						Compare {match.wallet.name}
					</label>
				</article>
			{/each}
			<button type="button" disabled={compared.length < 2} onclick={() => { comparisonVisible = true }}>Compare selected wallets ({compared.length})</button>
			{#if comparisonVisible}
				<div class="comparison" role="region" aria-label="Selected wallet comparison" tabindex="0">
					<table>
						<caption>Assessments for your selected wallets</caption>
						<thead><tr><th scope="col">Assessment</th>{#each compared as match}<th scope="col"><a href={match.variant.url}>{match.wallet.name}</a><br />{variantLabel(match.variant.platform)}</th>{/each}</tr></thead>
						<tbody>
							{#each finderCriteria as criterion}
								<tr><th scope="row">{criterion.label}</th>{#each compared as match}<td><a href={match.variant.assessments[criterion.id].url}>{ratingToText(match.variant.assessments[criterion.id].rating)}</a><p>{match.variant.assessments[criterion.id].explanation}</p></td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</section>
{/if}

<style>
	fieldset { border: 0; padding: 0; min-inline-size: 0; }
	legend { font-size: 1.25rem; font-weight: 700; margin-block-end: 1rem; }
	select { inline-size: 100%; }
	.comparison { overflow-x: auto; }
	table { border-collapse: collapse; inline-size: 100%; }
	th, td { padding: 1rem; text-align: start; vertical-align: top; border-block-end: 1px solid var(--text-secondary); min-inline-size: 12rem; }
	caption { text-align: start; font-weight: 700; padding-block: 1rem; }
</style>
