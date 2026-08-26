<script lang="ts">
	// Types/constants
	import { SecurityFlawSeverity } from '@/schema/features/security/security-audits'
	import { isUrl } from '@/schema/url'
	import { ContentType } from '@/types/content'
	import {
		auditsByRecency,
		auditVariantNames,
		formatCalendarDate,
		type SecurityAuditsDetails,
	} from '@/types/content/details/security-audits'
	import { commaListFormat } from '@/types/utils/text'
	import {
		bugBountySentences,
		securityAuditFindingsSentence,
		securityAuditsSummary,
		securityFlawSeverityLabel,
	} from '@/utils/structured-details/prose'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	const severityIcons: Record<SecurityFlawSeverity, string> = {
		[SecurityFlawSeverity.CRITICAL]: '🚨',
		[SecurityFlawSeverity.HIGH]: '‼️',
		[SecurityFlawSeverity.MEDIUM]: '⚠️',
	}

	const flawStatuses = {
		FIXED: {
			label: 'Fixed',
			color: 'var(--rating-pass)',
		},
		NOT_FIXED: {
			label: 'Not fixed',
			color: 'var(--rating-fail)',
		},
	} as const satisfies Record<'FIXED' | 'NOT_FIXED', { label: string; color: string }>


	// Props
	const { details, context }: StructuredDetailsViewProps<SecurityAuditsDetails> = $props()

	// (Derived)
	const audits = $derived(auditsByRecency(details))


	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<Typography
	content={{
		contentType: ContentType.MARKDOWN,
		markdown: securityAuditsSummary(details),
	}}
	strings={context.strings}
/>

{#if audits.length > 0}
	<section data-column="gap-2">
		{#each audits as audit (`${audit.auditor.id}-${audit.auditDate}`)}
			{@const severities = [
				SecurityFlawSeverity.CRITICAL,
				SecurityFlawSeverity.HIGH,
				SecurityFlawSeverity.MEDIUM,
			].filter(
				severity =>
					audit.findings.kind === 'flaws' &&
					audit.findings.flaws.some(flaw => flaw.severity === severity),
			)}

			<details data-card="secondary" open>
				<summary>
					<header data-row="wrap wrap-first-last">
						<div data-row-item="flexible basis-1" data-row="start wrap gap-2">
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

							{#if severities.length > 0 && audit.findings.kind === 'flaws'}
								<div data-row="gap-1 wrap">
									{#each severities as severity (severity)}
										{@const flaws = audit.findings.flaws.filter(
											flaw => flaw.severity === severity
										)}
										{@const unfixedCount = flaws.filter(
											flaw => flaw.status === 'NOT_FIXED'
										).length}
										{@const allFixed = unfixedCount === 0}

										<data
											data-badge="small"
											data-row="gap-1"
											value={severity}
											title="{securityFlawSeverityLabel[severity]} severity flaws{allFixed
												? ' (all fixed)'
												: ''}"
											style:--accent={allFixed ? 'var(--rating-pass)' : undefined}
										>
											<span>{severityIcons[severity]}</span>
											<span>{securityFlawSeverityLabel[severity]} Severity</span>
											<span>{allFixed ? '✅' : `(${unfixedCount})`}</span>
										</data>
									{/each}
								</div>
							{/if}
						</div>

						<time datetime={audit.auditDate}>{formatCalendarDate(audit.auditDate)}</time>
					</header>
				</summary>

				<section data-column="gap-4">
					{#if auditVariantNames(audit).length > 0}
						<p>This audit covered {commaListFormat(auditVariantNames(audit))}.</p>
					{/if}

					<p>{securityAuditFindingsSentence(audit)}</p>

					{#if audit.findings.kind === 'flaws'}
						<ul class="flaws-list" data-list>
							{#each audit.findings.flaws as flaw (flaw.name)}
								<li data-list-item-marker={severityIcons[flaw.severity]}>
									<span data-row="wrap wrap-first-last">
										<span data-row-item="flexible basis-2">
											{#if flaw.status === 'FIXED'}
												<s class="fixed-flaw">
													<strong>{securityFlawSeverityLabel[flaw.severity]}</strong>: {flaw.name}
												</s>
											{:else}
												<strong>{securityFlawSeverityLabel[flaw.severity]}</strong>: <span
													>{flaw.name}</span
												>
											{/if}
										</span>
										<data
											data-badge="small"
											value={flaw.status}
											style:--accent={flawStatuses[flaw.status].color}
										>
											{flawStatuses[flaw.status].label}
										</data>
									</span>
								</li>
							{/each}
						</ul>
					{/if}

					{#if audit.references.length > 0}
						<ReferenceLinks references={audit.references} />
					{/if}
				</section>
			</details>
		{/each}
	</section>
{/if}

{#if details.bugBounty}
	<section data-column="gap-2">
		<h4>Bug bounty program</h4>

		{#each bugBountySentences(details.bugBounty) as sentence (sentence)}
			<Typography
				content={{
					contentType: ContentType.MARKDOWN,
					markdown: sentence,
				}}
				strings={context.strings}
			/>
		{/each}

		{#if details.bugBounty.references.length > 0}
			<ReferenceLinks references={details.bugBounty.references} />
		{/if}
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
