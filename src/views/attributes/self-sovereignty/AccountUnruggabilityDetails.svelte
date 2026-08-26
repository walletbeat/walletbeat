<script lang="ts">
	// Types/constants
	import { ContentType } from '@/types/content'
	import {
		type AccountUnruggabilityDetails,
		accountUnruggabilitySummary,
	} from '@/types/content/account-unruggability-details'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<AccountUnruggabilityDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import GuardianPolicyView from '@/views/attributes/GuardianPolicyView.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: accountUnruggabilitySummary(details),
	}}
	strings={context.strings}
/>

{#if details.guardianPolicy}
	<h4>Account recovery implementation</h4>

	<GuardianPolicyView policy={details.guardianPolicy} {context} />
{/if}

{#if details.takeoverScenarios.length > 0}
	<h4>Account takeover scenarios</h4>

	<ul>
		{#each details.takeoverScenarios as scenario (scenario.id)}
			<li>
				<strong>{scenario.scenario}</strong>{#if scenario.consequence}: {scenario.consequence}{/if}
			</li>
		{/each}
	</ul>
{/if}
