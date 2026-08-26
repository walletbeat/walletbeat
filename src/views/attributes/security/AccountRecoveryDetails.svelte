<script lang="ts">
	// Types/constants
	import { accountRecoveryDrillWording } from '@/schema/features/security/account-recovery'
	import { ContentType } from '@/types/content'
	import type { AccountRecoveryDetails } from '@/types/content/account-recovery-details'
	import {
		accountRecoveryConfiguredDrillsIntro,
		accountRecoveryMissingDrillsIntro,
		accountRecoverySummary,
	} from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<AccountRecoveryDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import GuardianPolicyView from '@/views/attributes/GuardianPolicyView.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: accountRecoverySummary(details),
	}}
	strings={context.strings}
/>

{#if details.guardianPolicy}
	<h4>Account recovery implementation</h4>

	<GuardianPolicyView policy={details.guardianPolicy} {context} />
{/if}

{#if details.unrecoverableScenarios.length > 0}
	<h4>Account recovery failure scenarios</h4>

	<ul>
		{#each details.unrecoverableScenarios as scenario (scenario.id)}
			<li>
				<strong>{scenario.scenario}</strong>{#if scenario.consequence}: {scenario.consequence}{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if details.recoverableScenarios.length > 0}
	<h4>Account recovery success scenarios</h4>

	<ul>
		{#each details.recoverableScenarios as scenario (scenario.id)}
			<li><strong>{scenario.scenario}</strong></li>
		{/each}
	</ul>
{/if}

{#if details.drills}
	<h4>Account recovery drills</h4>

	{#if details.drills.configured.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: accountRecoveryConfiguredDrillsIntro,
			}}
			strings={context.strings}
		/>
		<ul>
			{#each details.drills.configured as drill (drill.type)}
				<li>
					{accountRecoveryDrillWording(drill.type).label} (every {drill.reminderEveryNDays} days)

					{#if drill.references.length > 0}
						<ReferenceLinks references={drill.references} />
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if details.drills.missing.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: accountRecoveryMissingDrillsIntro,
			}}
			strings={context.strings}
		/>
		<ul>
			{#each details.drills.missing as drillType (drillType)}
				<li>{accountRecoveryDrillWording(drillType).label}</li>
			{/each}
		</ul>
	{/if}
{/if}
