<script lang="ts">
	// Types/constants
	import { type EipSupportRow, EipSupportStatus } from '@/schema/eip-support'
	import { Variant } from '@/schema/variants'

	const eipSupportStatusSortPriority = {
		[EipSupportStatus.SUPPORTED]: 0,
		[EipSupportStatus.NOT_SUPPORTED]: 1,
		[EipSupportStatus.UNKNOWN]: 2,
		[EipSupportStatus.NOT_APPLICABLE]: 3,
	} as const

	const eipSupportStatusLabel = {
		[EipSupportStatus.SUPPORTED]: 'Supported',
		[EipSupportStatus.NOT_SUPPORTED]: 'Not supported',
		[EipSupportStatus.UNKNOWN]: 'Unknown',
		[EipSupportStatus.NOT_APPLICABLE]: 'N/A',
	} as const

	const eipSupportStatusIcon = {
		[EipSupportStatus.SUPPORTED]: '✅',
		[EipSupportStatus.NOT_SUPPORTED]: '❌',
		[EipSupportStatus.UNKNOWN]: '?',
		[EipSupportStatus.NOT_APPLICABLE]: '–',
	} as const


	// Props
	let {
		title,
		rows,
	}: {
		title?: string
		rows: EipSupportRow[]
	} = $props()


	// Functions
	import { variantLabel } from '@/schema/variants'

	const variantSupportList = (
		row: EipSupportRow,
	): Array<{ variant: Variant; status: EipSupportStatus }> =>
		row.variants.filter(({ status }) => status !== EipSupportStatus.NOT_APPLICABLE)

	const nonApplicableVariantList = (
		row: EipSupportRow,
	): Variant[] =>
		row.variants
			.filter(({ status }) => status === EipSupportStatus.NOT_APPLICABLE)
			.map(({ variant }) => variant)


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'

	import Table, { type Column, SortDirection } from '@/components/Table.svelte'
</script>


<section
	data-sticky-container
	data-column="gap-6"
>
	{#if title}
		<header
			data-row="wrap"
			data-scroll-item='inline-detached padding-match-start'
		>
			<h2>{title}</h2>
		</header>
	{/if}

	<div data-scroll-item="inline-attached underflow-center overflow-start">
		<Table
			rows={rows}
			rowId={(row: EipSupportRow) => row.id}

			columns={[
				{
					id: 'wallet',
					name: 'Wallet',
					value: (row: EipSupportRow) => row.displayName,
					isSticky: true,
					sort: {
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'status',
					name: 'Support',
					value: (row: EipSupportRow) => eipSupportStatusSortPriority[row.overall],
					sort: {
						isDefault: true,
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'variants',
					name: 'Platforms',
					value: (row: EipSupportRow) => row.variants
						.filter(({ status }) => status === EipSupportStatus.SUPPORTED)
						.length,
				},
				{
					id: 'sources',
					name: 'Sources',
					value: () => undefined,
				},
			]}
		>
			{#snippet Cell({ row, column }: { row: EipSupportRow; column: Column<EipSupportRow> })}
				{#if column.id === 'wallet'}
					<div class="wallet-info" data-row>
						<span class="row-count" data-row="center"></span>

						<span class="wallet-icon" data-icon="shadow">
							<img
								src={`/images/wallets/${row.id}.${row.iconExtension}`}
								alt={row.displayName}
								width="36"
								height="36"
							/>
						</span>

						<div class="name">
							<h3>
								<a
									href={row.url}
								>
									{row.displayName}
								</a>
							</h3>
						</div>
					</div>

				{:else if column.id === 'status'}
					<span class="support-status" data-support-status={row.overall}>
						<span class="status-icon">{eipSupportStatusIcon[row.overall]}</span>
						<span class="status-label">{eipSupportStatusLabel[row.overall]}</span>
					</span>

				{:else if column.id === 'variants'}
					{@const perVariant = variantSupportList(row)}
					{@const notApplicable = nonApplicableVariantList(row)}

					{#if perVariant.length === 0 && notApplicable.length === 0}
						<span class="muted-text">–</span>
					{:else}
						<ul class="variant-list" data-list="unstyled gap-1">
							{#each perVariant as { variant, status } (variant)}
								<li data-variant-status={status}>
									<span class="status-icon">{eipSupportStatusIcon[status]}</span>
									{variantLabel(variant)}
								</li>
							{/each}

							{#if notApplicable.length > 0}
								<li class="muted-text">
									{#if notApplicable.length === 1}
										(EIP doesn't apply to {variantLabel(notApplicable[0]).toLowerCase()} version)
									{:else}
										(EIP doesn't apply to other wallet versions)
									{/if}
								</li>
							{/if}
						</ul>
					{/if}

				{:else if column.id === 'sources'}
					{#if row.sourceUrls.length === 0}
						<span class="muted-text">–</span>
					{:else}
						<ul class="source-list" data-list="unstyled gap-1">
							{#each row.sourceUrls as url (url.url)}
								<li>
									<a
										href={url.url}
										target="_blank"
										rel="noopener noreferrer"
										class="source-link"
									>
										{url.label}
										<span>{@html ExternalLinkIcon}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			{/snippet}
		</Table>
	</div>
</section>


<style>
	section {
		&[data-sticky-container] {
			--scrollItem-inlineDetached-maxSize: 60.5rem;
			--scrollItem-inlineDetached-paddingStart: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
			--scrollItem-inlineDetached-paddingEnd: clamp(1.5rem, 0.04 * var(--scrollContainer-sizeInline), 3rem);
		}

		/*
		 * Fixed column widths so every EIP support table on a page lines up.
		 * The scroll container sizes tables by intrinsic width on a huge
		 * canvas, so widths must be absolute — percentages blow up.
		 */
		:global(table) {
			table-layout: fixed;
			width: 56rem;
			min-width: 0;
		}

		:global(col:nth-child(1)) {
			width: 20rem;
		}

		:global(col:nth-child(2)) {
			width: 11rem;
		}

		:global(col:nth-child(3)) {
			width: 13rem;
		}

		:global(col:nth-child(4)) {
			width: 12rem;
		}
	}

	.wallet-info {
		justify-content: flex-start;
		gap: 0.85em;
		padding: 0.5em 0;

		.row-count {
			width: 1.25em;
			height: 1.25em;

			font-weight: 600;
			color: var(--text-secondary);

			&::before {
				content: counter(TableRowCount);
			}

			:global([data-disabled]) &::before {
				content: '–';
			}
		}

		.wallet-icon {
			--icon-size: 2.25em;
		}

		.name {
			font-size: 0.85em;

			h3 {
				font-weight: 600;
			}
		}
	}

	.status-icon {
		display: inline-block;
		width: 1.5em;
		flex-shrink: 0;
		text-align: center;
	}

	.support-status {
		display: inline-flex;
		align-items: center;
		gap: 0.6em;
		white-space: nowrap;

		&[data-support-status='UNKNOWN'],
		&[data-support-status='NOT_APPLICABLE'] {
			color: var(--text-secondary);

			.status-icon {
				font-weight: 600;
			}
		}
	}

	.variant-list,
	.source-list {
		font-size: 0.85em;
	}

	.variant-list {
		li {
			white-space: nowrap;

			&[data-variant-status='UNKNOWN'],
			&[data-variant-status='NOT_APPLICABLE'] {
				color: var(--text-secondary);
			}
		}
	}

	.source-link {
		span {
			display: inline-block;
			width: 0.85em;
			height: 0.85em;
			vertical-align: middle;
			opacity: 0.8;
		}
	}

	.muted-text {
		color: var(--text-secondary);
	}
</style>
