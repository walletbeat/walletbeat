<script lang="ts">
	// Types/constants
	import { toFullyQualified } from '@/schema/reference'
	import { ContentType } from '@/types/content'
	import type { ScamPreventionDetails } from '@/types/content/details/scam-prevention'
	import type { StructuredDetailsViewProps } from '@/views/attributes/structured-details-registry'

	// Props
	const { details, context }: StructuredDetailsViewProps<ScamPreventionDetails> = $props()

	// Components
	import Typography from '@/components/Typography.svelte'
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


{#if details.warnings.length > 0}
	<ul data-list="gap-4">
		{#each details.warnings as detail (detail.kind)}
			<li data-list-item="gap-2">
				<Typography
					content={{
						contentType: ContentType.MARKDOWN,
						markdown: detail.description,
					}}
					strings={context.strings}
				/>

				{#if detail.items}
					<ul data-list="gap-1">
						{#each detail.items as item (item)}
							<li data-list-item="gap-1">
								<Typography
									content={{
										contentType: ContentType.TEXT,
										text: item,
									}}
								/>
							</li>
						{/each}
					</ul>
				{/if}

				{#if detail.conclusion}
					<Typography
						content={{
							contentType: ContentType.TEXT,
							text: detail.conclusion,
						}}
					/>
				{/if}

				{#if detail.references}
					<ReferenceLinks
						references={toFullyQualified(detail.references)}
					/>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
