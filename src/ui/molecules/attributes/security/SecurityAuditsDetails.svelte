<script lang="ts">
	// Types/constants
	import type { SecurityAuditsValue } from '@/schema/attributes/security/security-audits'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'


	// Props
	let {
		wallet,
		value,
		auditedInLastYear,
		hasUnaddressedFlaws,
	}: {
		wallet: RatedWallet
		value: SecurityAuditsValue
		auditedInLastYear?: boolean
		hasUnaddressedFlaws?: boolean
	} = $props()


	// Functions
	import { isUrl } from '@/schema/url'
	import { securityFlawSeverityName } from '@/schema/features/security/security-audits'
	import { toFullyQualified } from '@/schema/reference'


	// Components
	import ReferenceLinks from '@/ui/atoms/ReferenceLinks.svelte'
	import Typography from '@/ui/atoms/Typography.svelte'
</script>


{#if value.securityAudits.length === 0}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: `**{{WALLET_NAME}}** has not undergone any security audits.`
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{:else}
	{@const securityAuditsSorted = (
		value.securityAudits
			.toSorted((a, b) => (
				new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime()
			))
	)}

	{@const mostRecentAudit = securityAuditsSorted[0]}
	
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: `**{{WALLET_NAME}}** was last audited on ${mostRecentAudit.auditDate}${auditedInLastYear ? '.' : ', which was over a year ago.'}${hasUnaddressedFlaws ? ' There remain unaddressed security flaws in the codebase.' : ''}`,
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>

	{#if mostRecentAudit?.ref}
		<ReferenceLinks
			references={toFullyQualified(mostRecentAudit.ref)}
		/>
	{/if}

	<div class="audits-container">
		<ul class="audits-list">
			{#each securityAuditsSorted as audit}
				<li>
					<div>
						<strong><time datetime={audit.auditDate}>{audit.auditDate}</time></strong>

						by
						{#if isUrl(audit.auditor.url)}
							<cite
								><a
									href={typeof audit.auditor.url === 'string'
										? audit.auditor.url
										: audit.auditor.url.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{audit.auditor.name}
								</a></cite
							>
						{:else}
							<cite>{audit.auditor.name}</cite>
						{/if}
					</div>

					{#if audit.ref}
						<ReferenceLinks references={toFullyQualified(audit.ref)} />
					{/if}

					<p>
						{#if audit.unpatchedFlaws === 'NONE_FOUND'}
							<span>No security flaws of severity level medium or higher were found.</span>
						{:else if audit.unpatchedFlaws === 'ALL_FIXED'}
							<span>All security flaws of severity level medium or higher were addressed.</span>
						{:else if Array.isArray(audit.unpatchedFlaws) && audit.unpatchedFlaws.length > 0}
							<span>
								The following security flaws were identified
								{!audit.unpatchedFlaws.some((flaw: any) => flaw.presentStatus === 'NOT_FIXED')
									? ' and have all been addressed since'
									: ''}:
							</span>
							<ul class="flaws-list">
								{#each audit.unpatchedFlaws as flaw}
									<li>
										<strong>{securityFlawSeverityName(flaw.severityAtAuditPublication)}</strong>:
										{#if flaw.presentStatus === 'FIXED'}
											<span class="fixed-flaw">{flaw.name}</span>
											<strong class="fixed-label">(Fixed)</strong>
										{:else}
											<span>{flaw.name}</span> <strong class="not-fixed-label">(Not fixed)</strong>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	</div>
{/if}


<style>
	.audits-container {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid var(--border-color);
		padding: 0.5rem;
		border-radius: 0.25rem;
		background-color: var(--background-secondary);
	}

	.audits-list {
		list-style-type: revert;
		margin: 0;
		padding-left: 1.5rem;

		> li + li {
			margin-top: 2em;
		}

		> li {
			line-height: 1.5;

			&:last-child {
				margin-bottom: 0;
			}

			> :global(* + *) {
				margin-top: 0.5em;
			}
		}
	}

	.flaws-list {
		margin: 0.25rem 0 0.5rem 0;
		padding-left: 1.5rem;

		li {
			margin-bottom: 0.25rem;
		}
	}

	.fixed-flaw {
		text-decoration: line-through;
		opacity: 0.75;
	}

	.fixed-label {
		color: var(--success);
	}

	.not-fixed-label {
		color: var(--error);
	}

	cite {
		font-style: normal;
	}
</style>
