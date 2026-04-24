<script lang="ts">
	// Types/constants
	import type { RatedWallet } from '@/schema/wallet'
	import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'
	import {
		isAccountRecoverable,
		isAccountTakeOverPossible,
	} from '@/schema/features/guardian-scenario/guardian-scenario-common'
	import { ContentType } from '@/types/content'
	import { trimWhitespacePrefix } from '@/types/utils/text'

	// Props
	const {
		wallet,
		metadata,
	}: {
		wallet: RatedWallet
		metadata: AccountUnruggabilityMetadata
	} = $props()

	// Functions
	import { guardianScenarioId } from '@/schema/features/guardian-scenario/guardian-scenario-expansion'
	import { guardianPolicyMarkdown } from '@/schema/features/security/account-recovery'

	// Components
	import Typography from '@/components/Typography.svelte'
</script>

{#if metadata.outcomes === null}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: trimWhitespacePrefix(`
				Private key material never leaves {{WALLET_NAME}}, so no external
				entity may take over your account.
			`),
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{:else}
	{@const successfulOutcomes = metadata.outcomes.filter(outcome =>
		!isAccountTakeOverPossible(outcome.takeover),
	)}
	{@const failedOutcomes = metadata.outcomes.filter(
		outcome => isAccountTakeOverPossible(outcome.takeover),
	)}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: trimWhitespacePrefix(`
				{{WALLET_NAME}} implements a Guardian-based account recovery feature which
				${failedOutcomes.length === 0 ? 'passes all of the tested scenarios' : successfulOutcomes.length === 0 ? 'does not pass any of the tested scenarios' : 'does not pass all of the tested scenarios'}
				when it comes to anti-ruggability.
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
				markdown: '### Account takeover scenarios',
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
{/if}
