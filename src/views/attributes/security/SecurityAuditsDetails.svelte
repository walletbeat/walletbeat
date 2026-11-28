<script lang="ts">
	// Types/constants
	import { childHeadingLevel, type GrandparentHeadingLevel } from '@/types/heading'
	import type { WalletMetadata } from '@/schema/wallet'
	import { ContentType } from '@/types/content'
	import { dateCompare } from '@/types/date'
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
		parentHeadingLevel,
		metadata,
		references,
		auditedInLastYear,
		hasUnaddressedFlaws,
		bugBountyDetails,
	}: {
		parentHeadingLevel: GrandparentHeadingLevel
		wallet: { metadata: WalletMetadata }
		metadata: SecurityAuditsMetadata
		references: FullyQualifiedReference[]
		auditedInLastYear?: boolean
		hasUnaddressedFlaws?: boolean
		bugBountyDetails?: string
	} = $props()

	const headingLevel = $derived(childHeadingLevel[parentHeadingLevel])

	const securityAudits = $derived(
		metadata.securityAudits.toSorted((a, b) => dateCompare(b.auditDate, a.auditDate))
	)

	const auditReferences = $derived(securityAudits.flatMap(audit => toFullyQualified(audit.ref)))
	const remainingReferences = $derived(references.filter(reference => !auditReferences.some(auditReference => isRefEqual(reference, auditReference))))

	const mostRecentAudit = $derived(
		securityAudits[0]
	)


	// Functions
	import { securityAuditId, type UnpatchedSecurityFlaw } from '@/schema/features/security/security-audits'
	import { isRefEqual, toFullyQualified, type FullyQualifiedReference } from '@/schema/reference'
	import { isUrl } from '@/schema/url'


	// Components
	import DateTime from '@/components/DateTime.svelte'
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
	import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
	import { trimWhitespacePrefix } from '@/types/utils/text'
</script>

{#if metadata.securityAudits.length === 0}
	<p><strong>{wallet.metadata.displayName}</strong> has not undergone any security audits.</p>
{:else}
	<p>
		<strong>{wallet.metadata.displayName}</strong> was last audited on
		<DateTime datetime={mostRecentAudit.auditDate} />{auditedInLastYear ? '.' : ', which was over a year ago.'}{hasUnaddressedFlaws ? ' There remain unaddressed security flaws in the codebase.' : ''}
	</p>

	<section data-column="gap-2">
		{#each securityAudits as audit (securityAuditId(audit))}
			{@const hasUnfixedFlaws = Array.isArray(audit.unpatchedFlaws) && audit.unpatchedFlaws.some((flaw: UnpatchedSecurityFlaw) => flaw.presentStatus === 'NOT_FIXED')}
			{@const flawGroups = Array.isArray(audit.unpatchedFlaws) ? Map.groupBy(audit.unpatchedFlaws, (flaw: UnpatchedSecurityFlaw) => flaw.severityAtAuditPublication) : null}
			{@const hasFlaws = flawGroups && flawGroups.size > 0}

			<details
				data-card="secondary"
				open
			>
				<summary>
					<header data-row="wrap">
						<div
							data-row-item="flexible basis-1"
							data-row="start wrap gap-2"
						>
							<svelte:element this={`h${headingLevel}`}>
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
							</svelte:element>

							{#if hasFlaws && flawGroups}
								<div data-row="gap-1 wrap">
									{#each [SecurityFlawSeverity.CRITICAL, SecurityFlawSeverity.HIGH, SecurityFlawSeverity.MEDIUM] as severity (severity)}
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

						<DateTime
							datetime={audit.auditDate}
							data-row-item="wrap-end"
							data-row="gap-2"
							style={`--collapsible-markerInlineTimeline: --collapsible-marker-audit-${securityAuditId(audit)}`}
						/>
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
						<ReferenceLinks parentHeadingLevel={headingLevel} references={toFullyQualified(audit.ref)} />
					{/if}
				</section>
			</details>
		{/each}
	</section>
{/if}

{#if bugBountyDetails}
	<section data-column="gap-2">
		<svelte:element this={`h${headingLevel}`}>Bug bounty program</svelte:element>

		<Typography
			content={{
				contentType: ContentType.MARKDOWN,
				markdown: trimWhitespacePrefix(bugBountyDetails),
			}}
			strings={{ WALLET_NAME: wallet.metadata.displayName }}
		/>
	</section>
{/if}


<ReferenceLinks {parentHeadingLevel} references={remainingReferences} />

<style>
	.fixed-flaw {
		opacity: 0.75;
	}

	cite {
		font-style: normal;
	}
</style>
