<script lang="ts">
	// Types/constants
	import type { SecurityAuditsValue } from '@/schema/attributes/security/security-audits'
	import type { RatedWallet } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'

	const securityFlawSeverities = {
		[SecurityFlawSeverity.CRITICAL]: {
			icon: '🚨',
			label: 'Critical',
		},
		[SecurityFlawSeverity.HIGH]: {
			icon: '‼️',
			label: 'High',
		},
		[SecurityFlawSeverity.MEDIUM]: {
			icon: '⚠️',
			label: 'Medium',
		},
	} as const satisfies Record<
		SecurityFlawSeverity,
		{
			icon: string
			label: string
		}
	>

	const flawStatuses = {
		FIXED: {
			label: 'Fixed',
			color: 'var(--rating-pass)',
		},
		NOT_FIXED: {
			label: 'Not fixed',
			color: 'var(--rating-fail)',
		},
	} as const satisfies Record<
		'FIXED' | 'NOT_FIXED',
		{
			label: string
			color: string
		}
	>


	// Props
	const {
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
	import { securityAuditId, type UnpatchedSecurityFlaw } from '@/schema/features/security/security-audits'
	import { toFullyQualified } from '@/schema/reference'
	import { isUrl } from '@/schema/url'


	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>

{#if value.securityAudits.length === 0}
	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: '**{{WALLET_NAME}}** has not undergone any security audits.',
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>
{:else}
	{@const securityAudits = (
		value
			.securityAudits
			.toSorted((a, b) => (
				new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime()
			))
	)}

	{@const mostRecentAudit = securityAudits[0]}

	{@const anyAuditHasUnfixedFlaws = (
		securityAudits
			.some((audit) => (
				Array.isArray(audit.unpatchedFlaws)
				&& (
					audit.unpatchedFlaws
						.some((flaw: UnpatchedSecurityFlaw) => (
							flaw.presentStatus === 'NOT_FIXED'
						))
				)
			))
	)}

	<Typography
		content={{
			contentType: ContentType.MARKDOWN,
			markdown: `**{{WALLET_NAME}}** was last audited on ${Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(mostRecentAudit.auditDate))}${auditedInLastYear ? '.' : ', which was over a year ago.'}${hasUnaddressedFlaws ? ' There remain unaddressed security flaws in the codebase.' : ''}`,
		}}
		strings={{ WALLET_NAME: wallet.metadata.displayName }}
	/>

	<section data-column="gap-2">
		{#each securityAudits as audit, index (securityAuditId(audit))}
			{@const isMostRecent = index === 0}
			{@const hasUnfixedFlaws = Array.isArray(audit.unpatchedFlaws) && audit.unpatchedFlaws.some((flaw: UnpatchedSecurityFlaw) => flaw.presentStatus === 'NOT_FIXED')}
			{@const flawGroups = Array.isArray(audit.unpatchedFlaws) ? Map.groupBy(audit.unpatchedFlaws, (flaw: UnpatchedSecurityFlaw) => flaw.severityAtAuditPublication) : null}
			{@const hasFlaws = flawGroups && flawGroups.size > 0}

			<details
				data-card="secondary"
				open={
					anyAuditHasUnfixedFlaws ?
						hasUnfixedFlaws
					:
						isMostRecent
				}
			>
				<summary>
					<header data-row="wrap wrap-first-last">
						<div 
							data-row-item="flexible basis-1"
							data-row="start wrap gap-2"
						>
							<h4>
								Audit by 
								<cite>
									{#if isUrl(audit.auditor.url)}
										<a
											href={typeof audit.auditor.url === 'string'
												? audit.auditor.url
												: audit.auditor.url.url}
											target="_blank"
											rel="noopener noreferrer"
										>
											{audit.auditor.name}
										</a>
									{:else}
										{audit.auditor.name}
									{/if}
								</cite>
							</h4>

							{#if hasFlaws && flawGroups}
								<div data-row="gap-1 wrap">
									{#each [SecurityFlawSeverity.CRITICAL, SecurityFlawSeverity.HIGH, SecurityFlawSeverity.MEDIUM] as severity}
										{#if flawGroups.has(severity)}
											{@const flaws = flawGroups.get(severity)!}
											{@const unfixedCount = flaws.filter((flaw: UnpatchedSecurityFlaw) => flaw.presentStatus === 'NOT_FIXED').length}
											{@const allFixed = unfixedCount === 0}

											<data	
												data-badge="small"
												data-row="gap-1"
												value={severity}
												title="{securityFlawSeverities[severity].label} severity flaws{allFixed ? ' (all fixed)' : ''}"
												style:--accent={allFixed ? 'var(--rating-pass)' : undefined}
											>
												<span>{securityFlawSeverities[severity].icon}</span>
												<span>{securityFlawSeverities[severity].label} Severity</span>
												<span>{allFixed ? '✅' : `(${unfixedCount})`}</span>
											</data>
										{/if}
									{/each}
								</div>
							{/if}
						</div>

						<time datetime={audit.auditDate}>
							{
								Intl.DateTimeFormat(undefined, { dateStyle: 'long' })
									.format(
										new Date(audit.auditDate),
									)
							}
						</time>
					</header>
				</summary>

				<section data-column="gap-4">
					{#if audit.unpatchedFlaws === 'NONE_FOUND'}
						<p>No security flaws of severity level medium or higher were found.</p>
					{:else if audit.unpatchedFlaws === 'ALL_FIXED'}
						<p>All security flaws of severity level medium or higher were addressed.</p>
					{:else if Array.isArray(audit.unpatchedFlaws) && audit.unpatchedFlaws.length > 0}
						<p>
							The following security flaws were identified{!hasUnfixedFlaws ? ' and have all been addressed since' : ''}:
						</p>
						<ul class="flaws-list" data-list>
							{#each audit.unpatchedFlaws as flaw (flaw.name)}
								<li
									data-list-item-marker={securityFlawSeverities[flaw.severityAtAuditPublication].icon}
								>
									<span data-row="wrap wrap-first-last">
										<span data-row-item="flexible basis-2">
											{#if flaw.presentStatus === 'FIXED'}
												<s class="fixed-flaw">
													<strong>{securityFlawSeverities[flaw.severityAtAuditPublication].label}</strong>: {flaw.name}
												</s>
											{:else}
												<strong>{securityFlawSeverities[flaw.severityAtAuditPublication].label}</strong>: <span>{flaw.name}</span>
											{/if}
										</span>
										<data
											data-badge="small"
											value={flaw.presentStatus}
											style:--accent={flawStatuses[flaw.presentStatus].color}
										>
											{flawStatuses[flaw.presentStatus].label}
										</data>
									</span>
								</li>
							{/each}
						</ul>
					{/if}

					{#if audit.ref}
						<ReferenceLinks references={toFullyQualified(audit.ref)} />
					{/if}
				</section>
			</details>
		{/each}
	</section>
{/if}


<style>
	.fixed-flaw {
		opacity: 0.75;
	}

	cite {
		font-style: normal;
	}
</style>
