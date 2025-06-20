<script lang="ts">
	// Types/constants
	import type { Column } from '@/lib/DataTable.svelte'
	import type { Filter } from '@/ui/molecules/Filters.svelte'
	import type { RatedWallet } from '@/schema/wallet'
	import { type AttributeGroup, Rating } from '@/schema/attributes'
	import { Variant } from '@/schema/variants'
	import { variants } from '@/components/variants'
	import { AccountType } from '@/schema/features/account-support'
	import { HardwareWalletManufactureType } from '@/schema/features/profile'
	import { erc4337 } from '@/data/eips/erc-4337'
	import { eip7702 } from '@/data/eips/eip-7702'


	// Props
	let {
		wallets,
		attributeGroups,
	}: {
		wallets: RatedWallet[]
		attributeGroups: AttributeGroup<any>[]
	} = $props()

	// (Derived)
	const displayedAttributeGroups = $derived(
		wallets.find(w => w.variants.browser || w.variants.desktop || w.variants.mobile) ?
			// Filter attribute groups to only include non-exempt attributes
			attributeGroups
				.map(attrGroup => ({
					...attrGroup,
					attributes: (
						Object.fromEntries(
							Object.entries(attrGroup.attributes).filter(([attrId, _]) => 
								wallets.find(w => w.variants.browser || w.variants.desktop || w.variants.mobile)
									?.overall[attrGroup.id]?.[attrId]?.evaluation?.value?.rating !== Rating.EXEMPT
							)
						)
					)
				}))
				.filter(attrGroup => (
					Object.keys(attrGroup.attributes).length > 0
				))
		:
			attributeGroups
	)


	// State
	import { SvelteSet } from 'svelte/reactivity'

	let activeFilters = $state(
		new Set<Filter<RatedWallet>>()
	)

	let filteredWallets = $state(
		wallets
	)

	let selectedAttribute: string | undefined = $state(undefined)

	let expandedRowIds = $state(new SvelteSet<string>())

	let activeAttributeId: { walletId: string; attributeGroupId: string; attributeId: string } | undefined = $state(undefined)


	// (Derived)
	const selectedVariant = $derived.by(() => {
		// Derive selected variant from active filters
		const activeVariantFilters = Array.from(activeFilters).filter(filter => 
			filter.id.startsWith('variant-') && filter.id !== 'variant-all'
		)

		// Only return a variant if exactly one variant filter is active
		return (
			activeVariantFilters.length === 1 ?
				activeVariantFilters[0].id.replace('variant-', '') as Variant
			:
				undefined
		)
	})


	// Functions
	import { variantUrlQuery, variantToName } from '@/components/variants'
	import { hasVariant } from '@/schema/variants'
	import { walletSupportedAccountTypes, attributeVariantSpecificity, VariantSpecificity } from '@/schema/wallet'
	import { calculateAttributeGroupScore } from '@/schema/attribute-groups'
	import { isLabeledUrl } from '@/schema/url'
	import { evaluatedAttributesEntries, ratingToIcon, ratingToColor } from '@/schema/attributes'
	import { isNonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'


	// Actions
	let toggleFilterById: Filters<RatedWallet>['$$prop_def']['toggleFilterById'] = $state()
	let toggleFilter: Filters<RatedWallet>['$$prop_def']['toggleFilter'] = $state()

	const toggleRowExpanded = (id: string) => {
		if (expandedRowIds.has(id))
			expandedRowIds.delete(id)
		else
			expandedRowIds.add(id)
	}

	const isRowExpanded = (walletId: string) => (
		expandedRowIds.has(walletId)
	)


	// Components
	import EipDetails from '@/ui/molecules/EipDetails.svelte'
	import Filters from '@/ui/molecules/Filters.svelte'
	import WalletAttributeGroupSummary from '@/ui/molecules/WalletAttributeGroupSummary.svelte'
	import WalletAttributeSummary from '@/ui/molecules/WalletAttributeSummary.svelte'

	import Pie, { PieLayout } from '@/ui/atoms/Pie.svelte'
	import Table from '@/ui/atoms/Table.svelte'
	import Tooltip from '@/ui/atoms/Tooltip.svelte'
	import Typography from '@/ui/atoms/Typography.svelte'

	import WalletIcon from 'lucide-static/icons/wallet.svg?raw'
	import AppWindowIcon from 'lucide-static/icons/app-window.svg?raw'
	import KeyIcon from 'lucide-static/icons/key.svg?raw'
	import HardwareIcon from '@material-icons/svg/svg/hardware/baseline.svg?raw'

	import UnfoldLessIcon from '@material-icons/svg/svg/unfold_less/baseline.svg?raw'
	import UnfoldMoreIcon from '@material-icons/svg/svg/unfold_more/baseline.svg?raw'

	import InfoIcon from '@material-icons/svg/svg/info/baseline.svg?raw'
	import OpenInNewRoundedIcon from '@material-icons/svg/svg/open_in_new//baseline.svg?raw'
</script>


<Filters 
	items={wallets}
	filterGroups={
		[
			{
				id: 'walletType',
				label: 'Type',
				displayType: 'select',
				exclusive: true,
				defaultFilter: '',
				filters: [
					{
						id: '',
						label: 'All',
					},
					{
						id: 'walletType-software',
						label: 'Software',
						icon: AppWindowIcon,
						filterFunction: wallet => !hasVariant(wallet.variants, Variant.HARDWARE)
					},
					{
						id: 'walletType-hardware',
						label: 'Hardware',
						icon: HardwareIcon,
						filterFunction: wallet => hasVariant(wallet.variants, Variant.HARDWARE)
					},
					{
						id: 'walletType-embedded',
						label: 'Embedded',
						icon: WalletIcon,
						filterFunction: wallet => hasVariant(wallet.variants, Variant.EMBEDDED)
					},
				],
			},
			{
				id: 'variant',
				label: 'Variant',
				// displayType: 'select',
				// exclusive: true,
				displayType: 'group',
				exclusive: false,
				filters: [
					// {
					// 	id: '',
					// 	label: 'All',
					// },
					...(
						(Object.entries(variants) as [Variant, { label: string, icon: string }][])
							.map(([variant, { label, icon }]) => ({
								id: `variant-${variant}`,
								label,
								icon,
								filterFunction: (wallet: RatedWallet) => Boolean(wallet.variants[variant])
							}))
					),
				],
			},
			{
				id: 'accountType',
				label: 'Account Type',
				displayType: 'group',
				exclusive: false,
				filters: [
					{
						id: 'accountType-eoa',
						label: 'EOA',
						icon: KeyIcon,
						filterFunction: wallet => {
							const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
							return accountTypes !== null && AccountType.eoa in accountTypes
						}
					},
					{
						id: 'accountType-eip7702',
						label: 'EIP-7702',
						icon: KeyIcon,
						filterFunction: wallet => {
							const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
							return accountTypes !== null && AccountType.eip7702 in accountTypes
						}
					},
					{
						id: 'accountType-erc4337',
						label: 'ERC-4337',
						icon: KeyIcon,
						filterFunction: wallet => {
							const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
							return accountTypes !== null && AccountType.rawErc4337 in accountTypes
						}
					},
					{
						id: 'accountType-mpc',
						label: 'MPC',
						icon: KeyIcon,
						filterFunction: wallet => {
							const accountTypes = walletSupportedAccountTypes(wallet, 'ALL_VARIANTS')
							return accountTypes !== null && AccountType.mpc in accountTypes
						}
					},
				],
			},
		]
	}
	bind:activeFilters
	bind:filteredItems={filteredWallets}
	bind:toggleFilter
	bind:toggleFilterById
/>

<Table
	rows={wallets}
	getId={wallet => wallet.metadata.id}
	isRowDisabled={(wallet, table) => (
		Boolean(
			(table.columnSort?.direction && table.columns.find(column => column.id === table.columnSort!.columnId)?.getValue?.(wallet) === undefined)
			|| !filteredWallets.includes(wallet)
		)
	)}
	onRowClick={(wallet, walletId) => {
		toggleRowExpanded(walletId)
	}}
	displaceDisabledRows={true}

	columns={
		[
			{
				id: 'displayName',
				name: 'Wallet',
				getValue: wallet => (
					wallet.metadata.displayName
				),
				isSticky: true,
			} satisfies Column<RatedWallet>,
			{
				id: 'overall',
				name: 'Rating',
				getValue(wallet) {
					// Calculate aggregate score across all attribute groups
					const scores = (
						this.children!
							.map(column => column.getValue(wallet))
							.filter(score => score !== undefined)
					)

					if (!scores.length) return undefined

					return scores.reduce((sum, score) => sum + score, 0) / scores.length
				},
				defaultSortDirection: 'desc',
				defaultIsExpanded: true,
				children: (
					displayedAttributeGroups
						.map(attrGroup => ({
							id: attrGroup.id,
							// name: `${attrGroup.icon} ${attrGroup.displayName}`,
							name: attrGroup.displayName,
							getValue: wallet => (
								calculateAttributeGroupScore(attrGroup.attributeWeights, wallet.overall[attrGroup.id])?.score ?? undefined
							),
							defaultSortDirection: 'desc',
							defaultIsExpanded: false,
							children: (
								Object.entries(attrGroup.attributes)
									.map(([attrId, attribute]) => ({
										id: `${attrGroup.id}.${attrId}`,
										// name: `${attribute.icon} ${attribute.displayName}`,
										name: attribute.displayName,
										getValue: wallet => {
											const evalAttr = wallet.overall[attrGroup.id]?.[attrId]
											return evalAttr?.evaluation?.value?.rating || undefined
										},
										defaultSortDirection: 'desc',
									} satisfies Column<RatedWallet>))
							),
						} satisfies Column<RatedWallet>))
				),
			} satisfies Column<RatedWallet>,
		]
	}
	defaultSort={{
		columnId: 'overall',
		direction: 'desc',
	}}

	getCellVerticalAlign={({ row }) => (
		isRowExpanded(row.metadata.id) ?
			'top'
		:
			undefined
	)}
>
	{#snippet headerCellSnippet({ column })}
		<span class="header-title">{column.name}</span>
	{/snippet}

	{#snippet cellSnippet({
		row: wallet,
		column,
		value,
	})}
		{@const isExpanded = isRowExpanded(wallet.metadata.id)}

		{#snippet withExpandedContent({
			content,
			expandedContent,
		}: {
			content: Snippet
			expandedContent: Snippet
		})}
			<div
				class="with-expanded-content"
				data-is-expanded={isExpanded ? '' : undefined}
			>
				<Tooltip
					isEnabled={!isExpanded}
				>
					{@render content()}

					{#snippet tooltip()}
						{#if !isExpanded}
							<div class="expanded-tooltip-content">
								{@render expandedContent()}
							</div>
						{/if}
					{/snippet}
				</Tooltip>

				{#if isExpanded}
					<div class="expanded-content">
						{@render expandedContent()}
					</div>
				{/if}
			</div>
		{/snippet}

		{#if column.id === 'displayName'}
			{@const displayName = value}
			{@const accountTypes = walletSupportedAccountTypes(wallet, selectedVariant ?? 'ALL_VARIANTS')}
			{@const supportedVariants = (
				[Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP, Variant.EMBEDDED, Variant.HARDWARE]
					.filter(variant => variant in wallet.variants)
			)}

			<div class="wallet-name-cell column">
				<div class="wallet-name-title row">
					<div class="row">
						<span>
							{#if isExpanded}
								{@html UnfoldLessIcon}
							{:else}
								{@html UnfoldMoreIcon}
							{/if}
						</span>

						<img
							alt={displayName}
							src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
							width="16"
							height="16"
						/>

						<div class="column inline">
							<span>{displayName}</span>

							{#if selectedVariant && selectedVariant in wallet.variants}
								<small class="variant">
									{variants[selectedVariant].label}
								</small>
							{/if}

							<div class="tags">
								{#each (
									[
										// Wallet type tags
										hasVariant(wallet.variants, Variant.HARDWARE) && {
											label: 'Hardware',
											filterId: 'walletType-hardware',
											type: 'wallet-type',
										},
										!hasVariant(wallet.variants, Variant.HARDWARE) && {
											label: 'Software',
											filterId: 'walletType-software',
											type: 'wallet-type',
										},
										// Manufacture type tags
										hasVariant(wallet.variants, Variant.HARDWARE) && wallet.metadata.hardwareWalletManufactureType && {
											label: wallet.metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.FACTORY_MADE ? 'Factory-Made' : 'DIY',
											filterId: `manufactureType-${wallet.metadata.hardwareWalletManufactureType}`,
											type: 'manufacture-type',
										},
										// Account type tags
										...(
											accountTypes !== null ?
												[
													AccountType.eoa in accountTypes && {
														label: 'EOA',
														filterId: 'accountType-eoa',
														type: 'account-type',
													},
													AccountType.rawErc4337 in accountTypes && {
														label: `#${erc4337.number}`,
														filterId: 'accountType-erc4337',
														type: 'eip',
														eipTooltipContent: erc4337,
													},
													AccountType.eip7702 in accountTypes && {
														label: `#${eip7702.number}`,
														filterId: 'accountType-eip7702',
														type: 'eip',
														eipTooltipContent: eip7702,
													},
													AccountType.mpc in accountTypes && {
														label: 'MPC',
														filterId: 'accountType-mpc',
														type: 'account-type',
													},
												]
											:
												[]
										),
									]
										.filter(Boolean)
								) as tag (tag.label)}
									{#if tag.eipTooltipContent}
										<Tooltip 
											placement="inline-end"
										>
											<div
												class="tag"
												role="button"
												tabindex="0"
												data-tag-type={tag.type}
												aria-label="Filter by {tag.label}"
												onclick={e => {
													e.stopPropagation()
													toggleFilterById!(tag.filterId)
												}}
												onkeydown={e => {
													if (e.key !== 'Enter' && e.key !== ' ') return

													e.stopPropagation()
													toggleFilterById!(tag.filterId)
												}}
											>
												{tag.label}
											</div>

											{#snippet tooltip()}
												<div class="eip-tooltip-content">
													<EipDetails
														eip={tag.eipTooltipContent}
													/>
												</div>
											{/snippet}
										</Tooltip>
									{:else}
										<button
											class="tag"
											data-tag-type={tag.type}
											aria-label="Filter by {tag.label}"
											onclick={(e) => {
												e.stopPropagation()
												toggleFilterById!(tag.filterId)
											}}
										>
											{tag.label}
										</button>
									{/if}
								{/each}
							</div>
						</div>
					</div>

					{#if supportedVariants.length}
						<div class="variants row inline">
							{#each supportedVariants as variant}
								<button
									data-selected={variant === selectedVariant ? '' : undefined}
									aria-label={`Select ${variants[variant].label} variant`}
									aria-pressed={variant === selectedVariant}
									onclick={e => {
										e.stopPropagation()
										toggleFilterById!(`variant-${variant}`, true)
									}}
								>
									<span
										class="icon"
										title={variants[variant].label}
										aria-hidden="true"
									>
										{@html variants[variant].icon}
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div
					class="expanded-content column"
					hidden={!isExpanded}
				>
					{#if !selectedVariant || wallet.variants[selectedVariant]}
						<p class="blurb">
							<Typography
								content={wallet.metadata.blurb}
								strings={{
									WALLET_NAME: wallet.metadata.displayName,
									WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
								}}
							/>
						</p>
					{:else}
						<p class="blurb">
							{wallet.metadata.displayName} does not have a {selectedVariant} version.
						</p>
					{/if}
					
					<div class="links">
						<a
							href={`/${wallet.metadata.id}/${variantUrlQuery(wallet.variants, selectedVariant ?? null)}`}
							class="info-link"
						>
							<span class="icon">{@html InfoIcon}</span>
							Learn more
						</a>
						|
						<a
							href={isLabeledUrl(wallet.metadata.url) ? wallet.metadata.url.url : wallet.metadata.url}
							target="_blank"
							class="external-link"
						>
							{wallet.metadata.displayName} website
						</a>
						{#if wallet.metadata.repoUrl}
							|
							<a
								href={isLabeledUrl(wallet.metadata.repoUrl) ? wallet.metadata.repoUrl.url : wallet.metadata.repoUrl}
								target="_blank"
								class="external-link"
							>
								Code
								<span class="icon">{@html OpenInNewRoundedIcon}</span>
							</a>
						{/if}
					</div>
				</div>
			</div>

		{:else}
			{@const selectedSliceId = (
				selectedAttribute ?
					attributeGroups.find(g => g.id in wallet.overall && selectedAttribute in wallet.overall[g.id]) ?
						`${attributeGroups.find(g => g.id in wallet.overall && selectedAttribute in wallet.overall[g.id])!.id}:${selectedAttribute}`
					:
						undefined
				:
					undefined
			)}

			{@const activeSliceId = (
				activeAttributeId?.walletId === wallet.metadata.id ?
					activeAttributeId.attributeId ?
						`${activeAttributeId.attributeGroupId}:${activeAttributeId.attributeId}`
					:
						activeAttributeId.attributeGroupId
				:
					undefined
			)}

			{@const highlightedSliceId = selectedSliceId ?? activeSliceId}

			<!-- Overall rating -->
			{#if column.id === 'overall'}
				{@const score = value}

				{#snippet content()}
					<Pie
						slices={
							attributeGroups.map(group => {
								const groupScore = calculateAttributeGroupScore(group.attributeWeights, wallet.overall[group.id])
								const evalGroup = wallet.overall[group.id]

								return {
									id: group.id,
									arcLabel: group.icon,
									color: (
										groupScore && !groupScore.hasUnratedComponent ?
											`hsl(${Math.round(groupScore.score * 120)}, 80%, 45%)`
										:
											'#666'
									),
									tooltip: group.displayName,
									tooltipValue: (
										groupScore ?
											groupScore.hasUnratedComponent ?
												'Unrated'
											:
												(groupScore.score * 100).toFixed(0) + '%'
										:
											'N/A'
									),
									weight: 1,
									...evalGroup && {
										children: (
											evaluatedAttributesEntries(evalGroup)
												.filter(([_, evalAttr]) => (
													evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT
												))
												.map(([evalAttrId, evalAttr]) => ({
													id: `${group.id}:${evalAttrId}`,
													color: ratingToColor(evalAttr.evaluation.value.rating),
													weight: 1,
													arcLabel: evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon,
													tooltip: `${evalAttr.attribute.displayName}`,
													tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
												}))
										),
									},
								}
							})
						}
						layout={PieLayout.FullTop}
						padding={8}
						radius={80}
						levels={[
							{
								outerRadiusFraction: 0.705,
								innerRadiusFraction: 0.3,
								gap: 4,
								angleGap: 0
							},
							{
								outerRadiusFraction: 1,
								innerRadiusFraction: 0.7,
								gap: 2,
								angleGap: 1,
							}
						]}
						{highlightedSliceId}
						onSliceClick={sliceId => {
							const [groupId, attrId] = sliceId.split(':')

							selectedAttribute = (
								selectedAttribute === attrId ? undefined : attrId
							)

							if (!isExpanded)
								toggleRowExpanded(wallet.metadata.id)
						}}
						onSliceMouseEnter={sliceId => {
							const [groupId, attrId] = sliceId.split(':')

							activeAttributeId = {
								walletId: wallet.metadata.id,
								attributeGroupId: groupId,
								attributeId: attrId,
							}
						}}
						onSliceMouseLeave={sliceId => {
							activeAttributeId = undefined
						}}
						centerLabel={
							score ?
								(score * 100).toFixed(0)
							:
								'❓'
						}
					/>
				{/snippet}

				{#snippet expandedContent()}
					{@const displayedAttribute = (
						activeAttributeId?.walletId === wallet.metadata.id ?
							activeAttributeId.attributeId ?
								wallet.overall[activeAttributeId.attributeGroupId]?.[activeAttributeId.attributeId]
							:
								undefined
						: selectedAttribute ?
							attributeGroups.find(g => g.id in wallet.overall && selectedAttribute in wallet.overall[g.id]) ?
								wallet.overall[attributeGroups.find(g => g.id in wallet.overall && selectedAttribute in wallet.overall[g.id])!.id]?.[selectedAttribute]
							:
								undefined
						:
							undefined
					)}
		
					{@const displayedGroup = (
						activeAttributeId?.walletId === wallet.metadata.id ?
							attributeGroups.find(g => g.id === activeAttributeId.attributeGroupId)
						: selectedAttribute ?
							attributeGroups.find(g => g.id in wallet.overall && selectedAttribute in wallet.overall[g.id])
						:
							undefined
					)}

					{#if displayedAttribute}
						<WalletAttributeSummary
							{wallet}
							attribute={displayedAttribute}
							variant={selectedVariant}
						/>
					{:else if displayedGroup}
						<WalletAttributeGroupSummary
							{wallet}
							attributeGroup={displayedGroup}
						/>
					{:else}
						<strong>{wallet.metadata.displayName}</strong>
						<div>Overall Rating: {score ? (score * 100).toFixed(0) + '%' : 'N/A'}</div>
					{/if}
				{/snippet}

				{@render withExpandedContent({
					content,
					expandedContent,
				})}

			<!-- Attribute group rating -->
			{:else if !column.id.includes('.')}
				{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === column.id)!}
				{@const evalGroup = wallet.overall[attrGroup.id]}
				{@const groupScore = calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)}

				{@const evalEntries = evaluatedAttributesEntries(evalGroup)
					.filter(([_, evalAttr]) => (
						evalAttr?.evaluation?.value?.rating !== Rating.EXEMPT
					))}

				{@const hasActiveAttribute = activeAttributeId?.walletId === wallet.metadata.id && activeAttributeId?.attributeGroupId === attrGroup.id}

				{@const currentAttribute = (
					hasActiveAttribute && activeAttributeId ?
						evalGroup[activeAttributeId.attributeId]
											: selectedAttribute ?
							evalGroup[selectedAttribute]
					:
						undefined
				)}

				{#snippet content()}
					<Pie
						layout={PieLayout.FullTop}
						radius={44}
						levels={[
							{
								outerRadiusFraction: 1,
								innerRadiusFraction: 0.3,
								gap: 2,
								angleGap: 0
							}
						]}
						padding={4}
						slices={	
							!isNonEmptyArray(evalEntries) ?
								[]
							
							: nonEmptyMap(
								evalEntries,
								([evalAttrId, evalAttr]) => {
									const icon = evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon

									const tooltipSuffix = (() => {
										const variant = selectedVariant

										if(!variant || !wallet.variants[variant])
											return

										const specificity = attributeVariantSpecificity(wallet, variant, evalAttr.attribute)

										return (
											specificity === VariantSpecificity.UNIQUE_TO_VARIANT ?
												` (${variantToName(variant, false)} only)`
											: specificity === VariantSpecificity.NOT_UNIVERSAL ?
												` (${variantToName(variant, false)} specific)`
											:
												undefined
										)
									})()
									
									return {
										id: evalAttrId.toString(),
										color: ratingToColor(evalAttr.evaluation.value.rating),
										weight: 1,
										arcLabel: icon,
										tooltip: `${icon} ${evalAttr.evaluation.value.displayName}${tooltipSuffix}`,
										tooltipValue: ratingToIcon(evalAttr.evaluation.value.rating),
									}
								}
							)
						}
						highlightedSliceId={currentAttribute?.attribute.id}
						centerLabel={
							groupScore ?
								groupScore.hasUnratedComponent ?
									ratingToIcon(Rating.UNRATED)
								: groupScore.score <= 0.0 ?
									'\u{1f480}'
								: groupScore.score >= 1.0 ?
										'\u{1f4af}'
								:
									(groupScore.score * 100).toFixed(0)
							:
								'❓'
						}
						onSliceClick={attributeId => {
							selectedAttribute = (
								selectedAttribute === attributeId ? undefined : attributeId
							)

							if (!isExpanded)
								toggleRowExpanded(wallet.metadata.id)
						}}
						onSliceMouseEnter={attributeId => {
							activeAttributeId = {
								walletId: wallet.metadata.id,
								attributeGroupId: attrGroup.id,
								attributeId,
							}
						}}
						onSliceMouseLeave={attributeId => {
							activeAttributeId = undefined
						}}
						onSliceFocus={attributeId => {
							activeAttributeId = {
								walletId: wallet.metadata.id,
								attributeGroupId: attrGroup.id,
								attributeId,
							}
						}}
						onSliceBlur={attributeId => {
							activeAttributeId = undefined
						}}
					/>
				{/snippet}

				{#snippet expandedContent()}
					{@const displayedAttribute = (
						activeAttributeId?.walletId === wallet.metadata.id && activeAttributeId?.attributeGroupId === attrGroup.id ?
							evalGroup[activeAttributeId.attributeId]
						: selectedAttribute ?
							evalGroup[selectedAttribute]
						:
							undefined
					)}

					{#if displayedAttribute}
						<WalletAttributeSummary
							{wallet}
							attribute={displayedAttribute}
							variant={selectedVariant}
						/>
					{:else}
						<WalletAttributeGroupSummary
							{wallet}
							attributeGroup={attrGroup}
						/>
					{/if}
				{/snippet}

				{@render withExpandedContent({
					content,
					expandedContent,
				})}

			<!-- Attribute rating -->
			{:else}
				{@const [attributeGroupId, attrId] = column.id.split('.')}
				{@const attrGroup = displayedAttributeGroups.find(attrGroup => attrGroup.id === attributeGroupId)!}
				{@const attribute = attrGroup.attributes[attrId]}
				{@const evalAttr = wallet.overall[attributeGroupId][attrId]}

				{#snippet content()}
					<Pie
						layout={PieLayout.HalfTop}
						radius={24}
						levels={
							[
								{
									outerRadiusFraction: 1,
									innerRadiusFraction: 0.3,
									gap: evalAttr.evaluation.value.rating !== Rating.EXEMPT ? 20 : 0,
									angleGap: 0,
								}
							]
						}
						padding={4}
						slices={
							evalAttr.evaluation.value.rating !== Rating.EXEMPT ?
								[
									{
										id: attrId,
										color: evalAttr.evaluation.value.rating === Rating.PASS ? '#22c55e' : 
											evalAttr.evaluation.value.rating === Rating.PARTIAL ? '#eab308' : 
											evalAttr.evaluation.value.rating === Rating.FAIL ? '#ef4444' : '#6b7280',
										weight: 1,
										arcLabel: attribute.icon,
										tooltip: `${attribute.icon} ${attribute.displayName}`,
										tooltipValue: evalAttr.evaluation.value.rating,
									}
								]
							:
								[]
						}
						centerLabel={evalAttr.evaluation.value.rating}
						class="wallet-attribute-rating-pie"
					/>
				{/snippet}

				{#snippet expandedContent()}
					<WalletAttributeSummary
						{wallet}
						attribute={evalAttr}
						variant={selectedVariant}
					/>
				{/snippet}

				{@render withExpandedContent({
					content,
					expandedContent,
				})}
			{/if}
		{/if}
	{/snippet}
</Table>


<style>
	.header-title {
		white-space: wrap;
		flex: 0 0 0;
		min-width: fit-content;
	}

	.wallet-name-cell {
		transition-property: gap;

		.wallet-name-title {
			img {
				filter: drop-shadow(rgba(255, 255, 255, 0.1) 0px 0px 4.66667px);
				width: auto;
				height: 1.66rem;
				vertical-align: middle;
			}

			.variant {
				font-size: 0.6em;
				opacity: 0.6;
			}

			.variants {
				gap: 0.1em;

				button {
					display: inline-flex;
					place-items: center;
					aspect-ratio: 1;
					padding: 0.33em;
					border-radius: 50%;
					background-color: transparent;

					transition-property: background-color, opacity;

					&[data-selected] {
						background-color: rgba(255, 255, 255, 0.1);
						border: 1px solid rgba(255, 255, 255, 0.33);
					}

					&:focus {
						background-color: rgba(255, 255, 255, 0.15);
					}

					&:hover:not(:disabled) {
						background-color: rgba(255, 255, 255, 0.2);
					}

					&:disabled {
						opacity: 0.4;
					}

					.variants:has([data-selected]) &:not([data-selected]):not(:disabled) {
						opacity: 0.5;
					}
				}
			}
		}

		.expanded-content {
			font-size: 0.64em;
			max-width: 40ch;

			overflow: hidden;
			transition-property: height, display;

			&[hidden] {
				height: 0;
			}

			p {
				width: 0;
				min-width: 100%;
			}
		}

		.tags {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25em;

			.tag {
				&[data-tag-type='wallet-type'] {
					--tag-backgroundColor: light-dark(oklch(0.95 0.00 0), oklch(0.25 0.00 0));
					--tag-textColor: light-dark(oklch(0.65 0.00 0), oklch(0.80 0.00 0));
					--tag-borderColor: light-dark(oklch(0.90 0.00 0), oklch(0.40 0.00 0));
					--tag-hover-backgroundColor: light-dark(oklch(0.92 0.00 0), oklch(0.30 0.00 0));
					--tag-hover-textColor: light-dark(oklch(0.60 0.00 0), oklch(0.85 0.00 0));
					--tag-hover-borderColor: light-dark(oklch(0.85 0.00 0), oklch(0.50 0.00 0));
				}

				&[data-tag-type='account-type'] {
					--tag-backgroundColor: light-dark(oklch(0.95 0.03 145), oklch(0.25 0.05 145));
					--tag-textColor: light-dark(oklch(0.65 0.15 145), oklch(0.70 0.25 145));
					--tag-borderColor: light-dark(oklch(0.90 0.06 145), oklch(0.40 0.08 145));
					--tag-hover-backgroundColor: light-dark(oklch(0.92 0.05 145), oklch(0.30 0.07 145));
					--tag-hover-textColor: light-dark(oklch(0.60 0.18 145), oklch(0.85 0.15 145));
					--tag-hover-borderColor: light-dark(oklch(0.85 0.08 145), oklch(0.50 0.10 145));
				}

				&[data-tag-type='eip'] {
					--tag-backgroundColor: light-dark(oklch(0.95 0.03 300), oklch(0.25 0.05 300));
					--tag-textColor: light-dark(oklch(0.65 0.15 300), oklch(0.70 0.25 300));
					--tag-borderColor: light-dark(oklch(0.90 0.06 300), oklch(0.40 0.08 300));
					--tag-hover-backgroundColor: light-dark(oklch(0.92 0.05 300), oklch(0.30 0.07 300));
					--tag-hover-textColor: light-dark(oklch(0.60 0.18 300), oklch(0.85 0.15 300));
					--tag-hover-borderColor: light-dark(oklch(0.85 0.08 300), oklch(0.50 0.10 300));
				}

				&[data-tag-type='manufacture-type'] {
					--tag-backgroundColor: light-dark(oklch(0.95 0.03 290), oklch(0.25 0.05 290));
					--tag-textColor: light-dark(oklch(0.65 0.15 290), oklch(0.70 0.25 290));
					--tag-borderColor: light-dark(oklch(0.90 0.06 290), oklch(0.40 0.08 290));
					--tag-hover-backgroundColor: light-dark(oklch(0.92 0.05 290), oklch(0.30 0.07 290));
					--tag-hover-textColor: light-dark(oklch(0.60 0.18 290), oklch(0.85 0.15 290));
					--tag-hover-borderColor: light-dark(oklch(0.85 0.08 290), oklch(0.50 0.10 290));
				}
			}
		}
	}

	.with-expanded-content {
		display: grid;
		justify-content: center;
		gap: 0;

		transition-property: gap;

		&[data-is-expanded] {
			gap: 0.75em;
		}

		.expanded-content {
			inline-size: 0;
			min-inline-size: 100%;

			font-size: 0.66em;
			text-align: center;
		}

		.expanded-tooltip-content {
			max-width: 13rem;
		}
	}

	:global(.wallet-attribute-rating-pie) {
		margin-inline: -1em;
	}

	.eip-tooltip-content {
		width: 34rem;
	}
</style>
