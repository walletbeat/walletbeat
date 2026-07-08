<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { trimWhitespacePrefix } from '@/types/utils/text'
	import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'

	// Props
	const {
		wallet,
		metadata,
	}: {
		wallet: RatedWallet
		metadata: AccountRecoveryMetadata
	} = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import {
		accountRecoveryDrillWording,
		guardianPolicyMarkdown,
	} from '@/schema/features/security/account-recovery'
	import { isAccountRecoverable } from '@/schema/features/guardian-scenario/guardian-scenario-common'
	import { guardianScenarioId } from '@/schema/features/guardian-scenario/guardian-scenario-expansion'
</script>

{#if metadata.outcomes === null}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: trimWhitespacePrefix(`
				{{WALLET_NAME}} does not implement guardian-based account recovery.
				The user will lose access to their account if they lose their seed phrase.
			`),
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{:else}
	{@const successfulOutcomes = metadata.outcomes.filter(outcome =>
		isAccountRecoverable(outcome.recovery),
	)}
	{@const failedOutcomes = metadata.outcomes.filter(
		outcome => !isAccountRecoverable(outcome.recovery),
	)}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: trimWhitespacePrefix(`
				{{WALLET_NAME}} implements a Guardian-based account recovery feature which
				${failedOutcomes.length === 0 ? 'passes all of the tested scenarios.' : successfulOutcomes.length === 0 ? 'does not pass any of the tested scenarios.' : 'does not pass all of the tested scenarios.'}
			`),
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
	{#if metadata.minimumGuardianPolicy !== null}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: `### ${wallet.metadata.displayName} account recovery implementation`,
			}}
		/>
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: trimWhitespacePrefix(metadata.minimumGuardianPolicy.descriptionMarkdown),
			}}
		/>
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: guardianPolicyMarkdown(metadata.minimumGuardianPolicy),
			}}
		/>
	{/if}
	{#if failedOutcomes.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: '### Account recovery failure scenarios',
			}}
		/>
		<ul>
			{#each failedOutcomes as outcome (`${guardianScenarioId(outcome.scenario)}_${outcome.outcomeId}`)}
				<li>
					<strong>
						<Typography
							content={outcome.scenario.description.contentType === ContentType.MARKDOWN
								? {
										contentType: ContentType.MARKDOWN,
										markdown: outcome.scenario.description.markdown,
									}
								: {
										contentType: ContentType.TEXT,
										text: outcome.scenario.description.text,
									}}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</strong>:
					{#if !isAccountRecoverable(outcome.recovery)}
						<Typography
							content={outcome.recovery.description.contentType === ContentType.MARKDOWN
								? {
										contentType: ContentType.MARKDOWN,
										markdown: outcome.recovery.description.markdown,
									}
								: {
										contentType: ContentType.TEXT,
										text: outcome.recovery.description.text,
									}}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if successfulOutcomes.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: '### Account recovery success scenarios',
			}}
		/>
		<ul>
			{#each successfulOutcomes as outcome (`${guardianScenarioId(outcome.scenario)}_${outcome.outcomeId}`)}
				<li>
					<strong>
						<Typography
							content={outcome.scenario.description.contentType === ContentType.MARKDOWN
								? {
										contentType: ContentType.MARKDOWN,
										markdown: outcome.scenario.description.markdown,
									}
								: {
										contentType: ContentType.TEXT,
										text: outcome.scenario.description.text,
									}}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</strong>:
					{#if !isAccountRecoverable(outcome.recovery)}
						<Typography
							content={outcome.recovery.description.contentType === ContentType.MARKDOWN
								? {
										contentType: ContentType.MARKDOWN,
										markdown: outcome.recovery.description.markdown,
									}
								: {
										contentType: ContentType.TEXT,
										text: outcome.recovery.description.text,
									}}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if metadata.drills !== null}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: '### Account recovery drills',
		}}
	/>
	{#if metadata.drills.configured.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: trimWhitespacePrefix(`
					{{WALLET_NAME}} periodically runs the following account recovery drills:
				`),
			}}
			strings={{ WALLET_NAME: wallet.metadata.displayName }}
		/>
		<ul>
			{#each metadata.drills.configured as drill (drill.type)}
				<li>
					{accountRecoveryDrillWording(drill.type).label} (every {drill.reminderEveryNDays} days)
				</li>
			{/each}
		</ul>
	{/if}
	{#if metadata.drills.missing.length > 0}
		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: trimWhitespacePrefix(`
					{{WALLET_NAME}} does not run the following recommended account recovery drills:
				`),
			}}
			strings={{ WALLET_NAME: wallet.metadata.displayName }}
		/>
		<ul>
			{#each metadata.drills.missing as drillType (drillType)}
				<li>{accountRecoveryDrillWording(drillType).label}</li>
			{/each}
		</ul>
	{/if}
{/if}
