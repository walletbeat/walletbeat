<script lang="ts" generics="AttributeGroupId extends string">
	// Types/constants
	import type { Eip } from '@/schema/eips'
	import type { EipSupport, RatedWalletEipSupport } from '@/schema/eip-support'
	import type { RatedWallet } from '@/schema/wallet'
	import { Variant } from '@/schema/variants'

	const EipSupportStatus = {
		SUPPORTED: 'SUPPORTED',
		NOT_SUPPORTED: 'NOT_SUPPORTED',
		UNKNOWN: 'UNKNOWN',
		NOT_APPLICABLE: 'NOT_APPLICABLE',
	} as const

	type EipSupportStatus = (typeof EipSupportStatus)[keyof typeof EipSupportStatus]

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


	// Props
	let {
		title,
		eip,
		wallets,
	}: {
		title?: string
		eip: Eip
		wallets: Array<RatedWallet<AttributeGroupId>>
	} = $props()


	// Functions
	import { ratedWalletEipSupport } from '@/schema/eip-support'
	import { isSupported } from '@/schema/features/support'
	import { refs } from '@/schema/reference'
	import { variantLabel } from '@/schema/variants'
	import { getWalletUrl } from '@/utils/wallet-url'

	const eipSupportStatus = (support: EipSupport): EipSupportStatus => {
		if (typeof support === 'string') {
			return support
		}

		return isSupported(support) ? EipSupportStatus.SUPPORTED : EipSupportStatus.NOT_SUPPORTED
	}

	const variantSupportList = (
		walletSupport: RatedWalletEipSupport,
	): Array<{ variant: Variant; support: EipSupport }> =>
		Object.values(Variant).flatMap(variant => {
			const support = walletSupport.perVariant[variant]

			return support === undefined ? [] : [{ variant, support }]
		})


	// State
	const supportByWalletId = $derived(
		new Map(
			wallets.map(wallet => [wallet.metadata.id, ratedWalletEipSupport(wallet, eip.number)])
		)
	)


	// Components
	import ExternalLinkIcon from 'lucide-static/icons/external-link.svg?raw'

	import Table, { SortDirection } from '@/components/Table.svelte'
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
			rows={wallets}
			rowId={wallet => wallet.metadata.id}

			columns={[
				{
					id: 'wallet',
					name: 'Wallet',
					value: wallet => wallet.metadata.displayName,
					isSticky: true,
					sort: {
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'status',
					name: 'Support',
					value: wallet => eipSupportStatusSortPriority[eipSupportStatus(supportByWalletId.get(wallet.metadata.id)!.overall)],
					sort: {
						isDefault: true,
						defaultDirection: SortDirection.Ascending,
					},
				},
				{
					id: 'variants',
					name: 'Platforms',
					value: wallet => Object.values(supportByWalletId.get(wallet.metadata.id)!.perVariant)
						.filter(support => eipSupportStatus(support) === EipSupportStatus.SUPPORTED)
						.length,
				},
				{
					id: 'sources',
					name: 'Sources',
					value: () => undefined,
				},
			]}
		>
			{#snippet Cell({ row: wallet, column, value })}
				{@const walletSupport = supportByWalletId.get(wallet.metadata.id)!}

				{#if column.id === 'wallet'}
					<div class="wallet-info" data-row>
						<span class="row-count" data-row="center"></span>

						<img
							src={`/images/wallets/${wallet.metadata.id}.svg`}
							alt={wallet.metadata.displayName}
							class="wallet-icon"
							onerror={event => {
								if (event.currentTarget instanceof HTMLImageElement)
									event.currentTarget.src = '/images/wallets/default.svg'
							}}
						/>

						<div class="name">
							<h3>
								<a
									href={getWalletUrl(wallet)}
								>
									{wallet.metadata.displayName}
								</a>
							</h3>
						</div>
					</div>

				{:else if column.id === 'status'}
					{@const status = eipSupportStatus(walletSupport.overall)}

					<span class="support-status" data-support-status={status}>
						{#if status === EipSupportStatus.SUPPORTED}
							✅
						{:else if status === EipSupportStatus.NOT_SUPPORTED}
							❌
						{/if}
						{eipSupportStatusLabel[status]}
					</span>

				{:else if column.id === 'variants'}
					{@const perVariant = variantSupportList(walletSupport)}

					{#if perVariant.length <= 1}
						<span class="muted-text">–</span>
					{:else}
						<ul class="variant-list" data-column="gap-1">
							{#each perVariant as { variant, support } (variant)}
								{@const status = eipSupportStatus(support)}

								<li data-variant-status={status}>
									{variantLabel(variant)}: {eipSupportStatusLabel[status].toLowerCase()}
								</li>
							{/each}
						</ul>
					{/if}

				{:else if column.id === 'sources'}
					{@const sourceUrls =
						typeof walletSupport.overall === 'string'
							? []
							: refs(walletSupport.overall).flatMap(ref => ref.urls)
					}

					{#if sourceUrls.length === 0}
						<span class="muted-text">–</span>
					{:else}
						<ul class="source-list" data-column="gap-1">
							{#each sourceUrls as url (url.url)}
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

				{:else}
					{value}
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
	}

	.wallet-info {
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
			filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
			width: 2.25em;
			height: 2.25em;
			object-fit: contain;
			border-radius: 0.25em;
		}

		.name {
			font-size: 0.85em;

			h3 {
				font-weight: 600;
			}
		}
	}

	.support-status {
		white-space: nowrap;

		&[data-support-status='UNKNOWN'],
		&[data-support-status='NOT_APPLICABLE'] {
			color: var(--text-secondary);
		}
	}

	.variant-list,
	.source-list {
		list-style: none;
		font-size: 0.85em;

		li {
			white-space: nowrap;
		}
	}

	.variant-list {
		li {
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
