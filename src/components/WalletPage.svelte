<script lang="ts">
	// Types/constants
	import { borderRatingToColor, ratingToColor, Rating, type Value, type EvaluatedAttribute, type ValueSet, type AttributeGroup } from '@/schema/attributes'
	import { VariantSpecificity, type RatedWallet } from '@/schema/wallet'
	import { getSingleVariant, type Variant } from '@/schema/variants'
	import { allRatedWallets, type WalletName } from '@/data/wallets'
	import { ContentType, isTypographicContent, sentence, type TypographicContent } from '@/types/content'
	import type { FullyQualifiedReference } from '@/schema/reference'


	// Functions
	import { 
		variants,
		variantFromUrlQuery, 
		variantToName, 
		variantUrlQuery,
		variantToRunsOn,
	} from '@/components/variants'
	import { 
		getEvaluationFromOtherTree,
		mapNonExemptAttributeGroupsInTree,
		mapNonExemptGroupAttributes,
		getAttributeGroupInTree,
		numNonExemptGroupAttributes,
		attributeTree,
		calculateAttributeGroupScore
	} from '@/schema/attribute-groups'
	import { 
		isNonEmptyArray,
		nonEmptyEntries,
		nonEmptyMap,
		nonEmptyValues
	} from '@/types/utils/non-empty'
	import { slugifyCamelCase } from '@/types/utils/text'
	import { toFullyQualified } from '@/schema/reference'
	import { getAttributeOverride } from '@/schema/wallet'
	import { percentageToColor, percentageToCSS } from '@/utils/colors'


	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
	import { onMount } from 'svelte'
	import Pie from '@/ui/atoms/Pie.svelte'
	import RenderCustomContent from '@/ui/atoms/RenderCustomContent.svelte'
	import SourceVisibilityDetails from '@/ui/molecules/attributes/transparency/SourceVisibilityDetails.svelte'


	// Props
	const { walletName } = $props<{ walletName: WalletName }>()


	// State
	let pickedVariant = $state<Variant | null>(null)
	let highlightedAttributeId = $state<string | null>(null)


	// Derived data
	const wallet = $derived(allRatedWallets[walletName] as RatedWallet)
	const singleVariant = $derived(getSingleVariant(wallet?.variants || {}).singleVariant)
	
	// Update pickedVariant from URL only on mount
	onMount(() => {
		pickedVariant = singleVariant !== null 
			? singleVariant 
			: wallet ? variantFromUrlQuery(wallet.variants) : null
	})

	// Update the picked variant and update URL
	function updatePickedVariant(variant: Variant | null): void {
		if (singleVariant !== null) return // If there is a single variant, do not pollute the URL with it
		
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${variantUrlQuery(
				wallet.variants, 
				variant || undefined
			)}${window.location.hash}`
		)
		
		pickedVariant = variant
	}

	// Derived evaluation tree based on picked variant
	const evalTree = $derived(
		pickedVariant === null || !wallet?.variants[pickedVariant] 
			? wallet?.overall 
			: wallet?.variants[pickedVariant]?.attributes
	)

	// Map variants to attributes
	const attrToRelevantVariants = $derived.by(() => {
		const map = new Map<string, Variant[]>()
		
		for (const [variant, variantSpecificityMap] of nonEmptyEntries(wallet.variantSpecificity)) {
			for (const [evalAttrId, variantSpecificity] of variantSpecificityMap.entries()) {
				switch (variantSpecificity) {
					case VariantSpecificity.ALL_SAME:
					case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
						break
					case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
						map.set(evalAttrId, [variant])
						break
					default:
						const relevantVariants = map.get(evalAttrId)
						relevantVariants ? relevantVariants.push(variant) : map.set(evalAttrId, [variant])
				}
			}
		}
		
		return map
	})

	const sections: {
		header: string
		subHeader: string | null
		title: string
		icon: string
		cornerControl: any | null
		caption: any
		subsections: {
			header: string
			subHeader: string | null
			title: string
			icon: string
			cornerControl: any | null
			caption: any
			body: any | null
			relevantVariants: Variant[]
			evalAttr: EvaluatedAttribute<Value>
			attrGroup: AttributeGroup<ValueSet>
		}[]
	}[] = $derived(
		evalTree ?
			mapNonExemptAttributeGroupsInTree(evalTree, (attrGroup, evalGroup) => ({
				header: attrGroup.id,
				subHeader: null,
				title: attrGroup.displayName,
				icon: attrGroup.icon,
				cornerControl: null,
				caption: attrGroup.perWalletQuestion,
				body: null,
				subsections: (
					mapNonExemptGroupAttributes(evalGroup, (evalAttr) => ({
						header: slugifyCamelCase(attrGroup.id),
						subHeader: slugifyCamelCase(evalAttr.attribute.id),
						title: evalAttr.attribute.displayName,
						icon: evalAttr.attribute.icon,
						cornerControl: null,
						caption: evalAttr.attribute.question,
						body: null,
						relevantVariants: attrToRelevantVariants.get(evalAttr.attribute.id) ?? [],
						evalAttr,
						attrGroup
					}))
				),
			}))
				.filter(section => section.subsections.length > 0 && section.header !== 'details')
		:
			[]
	)

	// Pre-calculate section data for performance
	const sectionData = $derived.by(() => {
		if (!wallet || !evalTree) return new Map()

		const data = new Map()
		
		for (const section of sections) {
			const attrGroup = attributeTree[section.header]
			const evalGroup = getAttributeGroupInTree(wallet.overall, attrGroup)
			const score = calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup)
			const scoreLevel = score 
				? score.score >= 0.7 ? 'high' : score.score >= 0.4 ? 'medium' : 'low'
				: undefined
			
			data.set(section.header, { 
				attrGroup, 
				evalGroup, 
				score, 
				scoreLevel
			})
		}
		
		return data
	})


	// UI constants
	const ratingIconMap = {
		[Rating.PASS]: '✓',
		[Rating.PARTIAL]: '⚠️',
		[Rating.FAIL]: '✗',
		[Rating.UNRATED]: '?',
		[Rating.EXEMPT]: '○'
	}
</script>

<svelte:head>
	<script type="application/ld+json">
		{JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: (
				sections
					.flatMap(section => section.subsections
						.filter(subsection => subsection.caption !== null && subsection.body !== null)
						.map(subsection => ({
							'@type': 'Question',
							name: typeof subsection.title === 'string' && subsection.title !== ''
								? subsection.title
								: 'Feature question',
							acceptedAnswer: {
								'@type': 'Answer',
								text: `{{WALLET_NAME}} supports this feature.`
							}
						}))
					)
			)
		})}
	</script>
</svelte:head>


<a href="#top" class="return-to-top">↑</a>

<div class="container">
	<main>
		<div class="nav-title">Navigation</div>
		
		<header id="top" class="page-header">
			{#if wallet}
				<h1>
					<img
						class="wallet-icon"
						alt={wallet.metadata.displayName}
						src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
					/>
					<span>{wallet.metadata.displayName}</span>
				</h1>
			{/if}

			{#if wallet}
				<article class="wallet-overview">
					<nav class="wallet-links">
						<a 
							href={typeof wallet.metadata.url === 'string' 
								? wallet.metadata.url 
								: wallet.metadata.url?.url || '#'} 
							class="wallet-link website" 
							target="_blank" 
							rel="noopener noreferrer"
						>
							Website
						</a>
						
						{#if wallet.metadata.repoUrl}
							<a 
								href={typeof wallet.metadata.repoUrl === 'string' 
									? wallet.metadata.repoUrl 
									: wallet.metadata.repoUrl?.url || '#'} 
								class="wallet-link repo" 
								target="_blank" 
								rel="noopener noreferrer"
							>
								GitHub Repository
							</a>
						{/if}
					</nav>
					
					<div class="wallet-blurb">
						<Typography 
							content={wallet.metadata.blurb} 
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					</div>
					
					<footer class="wallet-platforms">
						<span class="platforms-label">Platforms: </span>
						{#each Object.keys(wallet.variants) as variant, i}
							{i > 0 ? ', ' : ''}<strong>{variantToRunsOn(variant as Variant)}</strong>
						{/each}.
						
						{#if singleVariant === null}
							<span class="variant-disclaimer">
								The ratings below vary depending on the version.
								{#if pickedVariant === null}
									Select a version to see version-specific ratings.
								{:else}
									You are currently viewing the ratings for the 
									<strong>{variantToName(pickedVariant, false)}</strong> version.
								{/if}
							</span>
						{/if}
					</footer>
				</article>
			{/if}
		</header>

		{#each sections as section}
			<hr />

			<section 
				id={section.subHeader !== null ? slugifyCamelCase(section.subHeader) : slugifyCamelCase(section.header)} 
				class="wallet-section"
				aria-label={section.title}
				data-score={sectionData.get(section.header)?.scoreLevel}
				data-icon={section.icon}
				style:--accent={sectionData.get(section.header)?.score 
					? percentageToCSS(sectionData.get(section.header).score.score)
					: 'transparent'
				}
			>
				<header class="section-header">
					<h2>{section.title}</h2>
					<div class="section-controls">
						{#if sectionData.get(section.header)?.score}
							<div class="section-score">
								{Math.round(sectionData.get(section.header).score.score * 100)}%
								
								{#if sectionData.get(section.header).score.hasUnratedComponent}
									<span class="unrated-hint" title="This section contains unrated components">ⓘ</span>
								{/if}
							</div>
						{/if}
						
						{#if section.cornerControl}
							{section.cornerControl}
						{/if}
					</div>
				</header>
				
				{#if section.caption}
					<div class="section-caption">
						<Typography 
							content={typeof section.caption === 'string' 
								? sentence(section.caption) 
								: section.caption}
							strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
						/>
					</div>
				{/if}
				
				<div class="section-body">
					{#if sectionData.get(section.header)}
						{@const sectionInfo = sectionData.get(section.header)}
						{@const evalGroup = sectionInfo.evalGroup}
						{@const attributeCount = numNonExemptGroupAttributes(evalGroup)}

						<div class="attribute-group-body">
							<div class="overview-container">
								{#if numNonExemptGroupAttributes(evalGroup) > 0}
									<div class="chart-container">
										<Pie 
											slices={mapNonExemptGroupAttributes(evalGroup, (evalAttr, i) => ({
												id: evalAttr.attribute.id,
												color: ratingToColor(evalAttr.evaluation.value.rating),
												weight: 1,
												arcLabel: '',
												tooltip: evalAttr.attribute.displayName,
												tooltipValue: evalAttr.evaluation.value.rating,
												href: `#${slugifyCamelCase(evalAttr.attribute.id)}`
											}))}
											layout="Full"
											radius={140}
											outerRadiusFraction={0.85}
											innerRadiusFraction={0}
											highlightedSliceId={highlightedAttributeId}
											onSliceMouseEnter={(id) => { highlightedAttributeId = id }}
											onSliceMouseLeave={() => { highlightedAttributeId = null }}
										/>
									</div>
									
									<div class="attributes-list">
										<h3>Attribute Details:</h3>
										<div class="attributes-container">
											{#each mapNonExemptGroupAttributes(evalGroup, (evalAttr) => evalAttr) as evalAttr}
												{@const attribute = evalAttr.attribute}
												{@const evaluation = evalAttr.evaluation}
												{@const attributeUrl = `#${slugifyCamelCase(attribute.id)}`}
												<a 
													href={attributeUrl} 
													class="attribute-link"
													data-highlighted={highlightedAttributeId === attribute.id ? '' : undefined}
													onmouseenter={() => { highlightedAttributeId = attribute.id }}
													onmouseleave={() => { highlightedAttributeId = null }}
												>
													<div 
														class="attribute-color-indicator" 
														style={`background-color: ${ratingToColor(evaluation.value.rating)}`}
													></div>
													<span class="attribute-name">{attribute.displayName}</span>
													<span class="attribute-rating rating-{evaluation.value.rating.toLowerCase()}">{evaluation.value.rating}</span>
												</a>
											{/each}
										</div>
									</div>
								{:else}
									<div class="no-attributes">
										No attribute ratings available for this category.
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				
				{#if section.subsections}
					<div class="subsections-grid">
						{#each section.subsections as subsection}
							<details 
								id={subsection.subHeader !== null ? slugifyCamelCase(subsection.subHeader) : slugifyCamelCase(subsection.header)}
								aria-label={subsection.title}
								data-icon={subsection.icon}
								class="subsection"
								style:--accent={borderRatingToColor(subsection.evalAttr.evaluation.value.rating)}
								data-rating={subsection.evalAttr.evaluation.value.rating.toLowerCase()}
								open
							>
								<summary class="subsection-header">
									<div class="summary-content">
										<h3>{subsection.title}</h3>
										
										{#if subsection.cornerControl}
											<div class="subsection-controls">{subsection.cornerControl}</div>
										{:else if subsection.relevantVariants?.length > 0}
											<div class="variant-controls">
												{#if subsection.relevantVariants.length === 1}
													<div class="variant-indicator">
														<span class="variant-label">Only for</span>
														<span class="variant-badge">
															<span class="variant-icon">{@html variants[subsection.relevantVariants[0]].icon}</span>
															<span>{variants[subsection.relevantVariants[0]].label}</span>
														</span>
													</div>
												{:else if subsection.relevantVariants.length > 1}
													<div class="variant-selector">
														<span class="variant-label">
															{pickedVariant === null ? 'Select version:' : 'Viewing:'}
														</span>
														<div class="variant-buttons">
															{#each subsection.relevantVariants as variant}
																<button 
																	class="variant-button"
																	class:active={pickedVariant === variant}
																	onclick={() => updatePickedVariant(pickedVariant === variant ? null : variant)}
																	aria-pressed={pickedVariant === variant ? true : false}
																	title={pickedVariant === variant ? 'Remove version filter' : `View rating for ${variantToName(variant, false)} version`}
																>
																	<span class="variant-icon">{@html variants[variant].icon}</span>
																	<span class="variant-name">{variants[variant].label}</span>
																</button>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								</summary>
								
								<div class="subsection-content">
									{#if subsection.caption}
										<div class="subsection-caption">
											<Typography 
												content={typeof subsection.caption === 'string' 
													? sentence(subsection.caption) 
													: subsection.caption}
												strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
											/>
										</div>
									{/if}

									<div class="subsection-body">
										{#if subsection.evalAttr}
											{@const relevantVariants = subsection.relevantVariants || []}
											{@const thisVariantSpecificity = 
												relevantVariants.length === 0 
													? VariantSpecificity.ALL_SAME 
													: relevantVariants.length === 1 
														? VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT 
														: VariantSpecificity.NOT_UNIVERSAL
											}
											{@const thisDisplayedVariant = 
												relevantVariants.length === 1 
													? relevantVariants[0] 
													: pickedVariant
											}
											{@const evalAttrDetails = subsection.evalAttr.evaluation.details}
											{@const qualRefs = toFullyQualified(subsection.evalAttr.evaluation.references || [])}
											{@const override = getAttributeOverride(wallet, subsection.attrGroup.id, subsection.evalAttr.attribute.id)}
											{@const howToImprove = override?.howToImprove !== undefined ? override.howToImprove : subsection.evalAttr.evaluation.howToImprove}
											
											{@const variantSpecificCaption = (() => {
												switch (thisVariantSpecificity) {
													case VariantSpecificity.ALL_SAME:
														return null
													case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
														return thisDisplayedVariant ? 
															`This rating is only relevant for the ${variantToName(thisDisplayedVariant, false)} version.` : 
															null
													default:
														return thisDisplayedVariant === null
															? 'This rating differs across versions. Select a specific version for details.'
															: `This rating is specific to the ${variantToName(thisDisplayedVariant, false)} version.`
												}
											})()}

											<div class="wallet-attribute">
												<div class="attribute-content rating-{subsection.evalAttr.evaluation.value.rating.toLowerCase()}">
													<div class="rating-icon">{ratingIconMap[subsection.evalAttr.evaluation.value.rating]}</div>
													<div class="attribute-details">
														{#if isTypographicContent(evalAttrDetails)}
															<Typography 
																content={evalAttrDetails}
																strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
															/>
														{:else if evalAttrDetails}
															<div class="custom-content">
																<RenderCustomContent
																	content={evalAttrDetails}
																	{wallet}
																	value={subsection.evalAttr.evaluation.value}
																	references={toFullyQualified(subsection.evalAttr.evaluation.references || [])}
																/>
															</div>
														{:else}
															<div class="no-details">
																<Typography 
																	content={sentence(`No detailed evaluation available for ${subsection.evalAttr.attribute.displayName}`)}
																/>
															</div>
														{/if}
													</div>
												</div>

												{#if variantSpecificCaption}
													<div class="variant-caption">
														{variantSpecificCaption}
													</div>
												{/if}

												{#if subsection.evalAttr.evaluation.impact}
													<div class="attribute-impact">
														<Typography 
															content={subsection.evalAttr.evaluation.impact}
															strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
														/>
													</div>
												{/if}

												{#if qualRefs.length > 0}
													<div class="attribute-references">
														<h4>References</h4>
														<ul>
															{#each qualRefs as ref}
																<li>
																	<a href={ref.urls?.[0]?.url || '#'} target="_blank" rel="noopener noreferrer">
																		{ref.urls?.[0]?.label || ref.explanation || 'Reference'}
																	</a>
																</li>
															{/each}
														</ul>
													</div>
												{/if}

												{#if subsection.evalAttr.attribute.id === 'hardwareWalletSupport' && 
													subsection.evalAttr.evaluation.value && 
													typeof subsection.evalAttr.evaluation.value === 'object' &&
													'supportedHardwareWallets' in subsection.evalAttr.evaluation.value && 
													Array.isArray(subsection.evalAttr.evaluation.value.supportedHardwareWallets) && 
													subsection.evalAttr.evaluation.value.supportedHardwareWallets.length > 0}
													<div class="supported-hardware-wallets">
														<h5>Supported Hardware Wallets:</h5>
														<div class="hw-wallet-list">
															{#each subsection.evalAttr.evaluation.value.supportedHardwareWallets as hwWallet}
																<div class="hw-wallet-badge" data-type={typeof hwWallet === 'string' ? hwWallet.toLowerCase() : ''}>
																	{typeof hwWallet === 'string' ? 
																		(() => {
																			switch (hwWallet) {
																				case 'LEDGER': return 'Ledger'
																				case 'TREZOR': return 'Trezor'
																				case 'KEYSTONE': return 'Keystone'
																				case 'GRIDPLUS': return 'GridPlus'
																				case 'KEEPKEY': return 'KeepKey'
																				case 'FIREFLY': return 'FireFly'
																				default: return hwWallet
																			}
																		})() : 'Unknown'
																	}
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<div class="attribute-accordions">
													<details class="accordion">
														<summary>
															<h4>
																{subsection.evalAttr.evaluation.value.rating === Rating.PASS || 
																subsection.evalAttr.evaluation.value.rating === Rating.UNRATED
																	? 'Why does this matter?'
																	: 'Why should I care?'
																}
															</h4>
														</summary>
														<div class="accordion-content">
															{#if subsection.evalAttr.attribute.why}
																<Typography 
																	content={subsection.evalAttr.attribute.why}
																	strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																/>
															{:else}
																<p class="no-content">No explanation available.</p>
															{/if}
														</div>
													</details>

													<details class="accordion">
														<summary>
															<h4>
																{subsection.evalAttr.attribute.wording?.midSentenceName === null
																	? (subsection.evalAttr.attribute.wording?.howIsEvaluated || 'How is this evaluated?')
																	: `How is ${subsection.evalAttr.attribute.wording?.midSentenceName || 'this'} evaluated?`
																}
															</h4>
														</summary>
														<div class="accordion-content">
															<div class="methodology">
																{#if subsection.evalAttr.attribute.methodology}
																	<Typography 
																		content={subsection.evalAttr.attribute.methodology}
																		strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																	/>
																{:else}
																	<p class="no-content">No methodology information available.</p>
																{/if}

																{#if subsection.evalAttr?.attribute && 
																	'failureModes' in subsection.evalAttr.attribute && 
																	Array.isArray(subsection.evalAttr.attribute['failureModes' as keyof typeof subsection.evalAttr.attribute]) && 
																	(subsection.evalAttr.attribute['failureModes' as keyof typeof subsection.evalAttr.attribute] as unknown[]).length > 0}
																	<div class="failure-modes">
																		<h5>Failure Modes</h5>
																		<ul class="failure-list">
																			{#each (subsection.evalAttr.attribute['failureModes' as keyof typeof subsection.evalAttr.attribute] as unknown[]) as mode}
																				<li>
																					{#if typeof mode === 'string'}
																						<span>{mode}</span>
																					{:else if mode && typeof mode === 'object' && 'contentType' in mode}
																						<Typography 
																							content={mode as TypographicContent}
																							strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																						/>
																					{:else}
																						<span>Invalid content format</span>
																					{/if}
																				</li>
																			{/each}
																		</ul>
																	</div>
																{/if}

																{#if subsection.evalAttr.attribute.ratingScale && subsection.evalAttr.attribute.ratingScale.display === 'simple'}
																	<div class="rating-scale simple-scale">
																		<Typography 
																			content={subsection.evalAttr.attribute.ratingScale.content}
																			strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																		/>
																	</div>
																{:else if subsection.evalAttr.attribute.ratingScale}
																	<div class="rating-scale example-scale">
																		<h5>Rating Examples</h5>
																		
																		{#if subsection.evalAttr.attribute.ratingScale.pass}
																			<div class="example-rating pass">
																				<h6><span class="rating-icon pass">✓</span> Passing Rating Example</h6>
																				<ul>
																					{#if Array.isArray(subsection.evalAttr.attribute.ratingScale.pass)}
																						{#each subsection.evalAttr.attribute.ratingScale.pass as example}
																							<li>
																								<Typography 
																									content={example.description}
																									strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																								/>
																							</li>
																						{/each}
																					{:else}
																						<li>
																							<Typography 
																								content={subsection.evalAttr.attribute.ratingScale.pass.description}
																								strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																							/>
																						</li>
																					{/if}
																				</ul>
																			</div>
																		{/if}
																		
																		{#if subsection.evalAttr.attribute.ratingScale.partial}
																			<div class="example-rating partial">
																				<h6><span class="rating-icon partial">⚠️</span> Partial Rating Example</h6>
																				<ul>
																					{#if Array.isArray(subsection.evalAttr.attribute.ratingScale.partial)}
																						{#each subsection.evalAttr.attribute.ratingScale.partial as example}
																							<li>
																								<Typography 
																									content={example.description}
																									strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																								/>
																							</li>
																						{/each}
																					{:else}
																						<li>
																							<Typography 
																								content={subsection.evalAttr.attribute.ratingScale.partial.description}
																								strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																							/>
																						</li>
																					{/if}
																				</ul>
																			</div>
																		{/if}
																		
																		{#if subsection.evalAttr.attribute.ratingScale.fail}
																			<div class="example-rating fail">
																				<h6><span class="rating-icon fail">✗</span> Failing Rating Example</h6>
																				<ul>
																					{#if Array.isArray(subsection.evalAttr.attribute.ratingScale.fail)}
																						{#each subsection.evalAttr.attribute.ratingScale.fail as example}
																							<li>
																								<Typography 
																									content={example.description}
																									strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																								/>
																							</li>
																						{/each}
																					{:else}
																						<li>
																							<Typography 
																								content={subsection.evalAttr.attribute.ratingScale.fail.description}
																								strings={{ WALLET_NAME: wallet?.metadata.displayName || '' }}
																							/>
																						</li>
																					{/if}
																				</ul>
																			</div>
																		{/if}
																	</div>
																{/if}
															</div>
														</div>
													</details>

													{#if howToImprove}
														<details class="accordion">
															<summary>
																<h4>
																	{subsection.evalAttr.attribute.wording?.midSentenceName === null
																		? (subsection.evalAttr.attribute.wording?.whatCanWalletDoAboutIts || `What can ${wallet?.metadata.displayName} do about this?`)
																		: `What can ${wallet?.metadata.displayName} do about its ${subsection.evalAttr.attribute.wording?.midSentenceName || 'feature'}?`
																	}
																</h4>
															</summary>
															<div class="accordion-content">
																<Typography 
																	content={howToImprove}
																	strings={{ 
																		WALLET_NAME: wallet?.metadata.displayName || '',
																		WALLET_PSEUDONYM_SINGULAR: wallet?.metadata.pseudonymType?.singular || '',
																		WALLET_PSEUDONYM_PLURAL: wallet?.metadata.pseudonymType?.plural || ''
																	}}
																/>

																{#if override}
																	<div class="override-note">
																		<div class="note-icon">ℹ️</div>
																		<div class="note-content">
																			<p>
																				Note: This recommendation is specific to {wallet?.metadata.displayName} from the Wallet Beat team, not our general recommendation for all wallets of this type.
																			</p>
																		</div>
																	</div>
																{/if}
															</div>
														</details>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								</div>
							</details>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</main>
</div>


<style>
	.container {
		--wallet-icon-size: 3rem;
		--spacing-sm: 0.5rem;
		--spacing-md: 1rem;
		--spacing-lg: 1.5rem;
		--spacing-xl: 3rem;
		--border-radius: 0.375rem;
		--border-radius-sm: 0.25rem;
		--nav-width: 20rem;
		--marker-gap: 0.375rem;

		display: grid;
		grid-template:
			'Nav Main'
			/ auto 1fr
		;
		gap: var(--spacing-md);

		@supports not (scroll-marker-group: before) {
			&::before {
				content: '';
				grid-area: Nav;
			}
		}

		main {
			grid-area: Main;

			max-height: 100dvh;
			overflow-y: auto;

			scroll-marker-group: before;

			display: grid;

			&::scroll-marker-group {
				grid-area: Nav;

				position: sticky;
				top: 0;

				overflow-y: auto;
				scroll-behavior: smooth;

				max-height: 100dvh;

				display: grid;
				width: var(--nav-width);
				padding: calc(2.5rem + var(--spacing-md)) var(--spacing-md) var(--spacing-md);
				background-color: var(--background-primary);
				border-right: 1px solid var(--border-color);
				gap: var(--marker-gap);
			}

			> :is(header, section, footer) {
				display: grid;
				grid-template-columns: minmax(0, 54rem);
				justify-content: center;
				padding: var(--spacing-xl) var(--spacing-lg);
			}

			.wallet-section {
				display: grid;
				gap: var(--spacing-md);
				scroll-margin-top: 3.5rem;
				padding: var(--spacing-xl) var(--spacing-lg);

				&::scroll-marker {
					content: attr(data-icon) '\00a0\00a0' attr(aria-label);
					text-decoration: none;
					padding: 0.75em 2.5em 0.75em 0.75em;
					color: var(--text-secondary);
					position: relative;
					transition: all 0.2s ease;
					border-radius: var(--border-radius-sm);
					display: flex;
					align-items: center;

					background:
						radial-gradient(
							circle closest-side,
							var(--accent, var(--text-secondary)) calc(100% - 0.5px),
							transparent 100%
						)
						no-repeat
						right calc(1.15rem - 0.25em) center / 0.5em 0.5em
						var(--background-secondary)
					;
					opacity: 0.8;

					&:target-current {
						background-color: var(--background-primary);
						color: var(--accent);
						font-weight: 500;
						opacity: 1;
						
						background-image: radial-gradient(
							circle at right 1.15rem center,
							var(--accent) 0,
							var(--accent) 0.4rem,
							transparent 0.4rem
						);
						box-shadow: inset 2px 0 0 var(--accent, transparent);
					}

					&:hover {
						background-color: var(--background-tertiary);
						color: var(--accent);
						opacity: 1;
					}
				}

				.section-header {
					display: flex;	
					align-items: center;
					justify-content: space-between;
					position: relative;
					padding-block: 1rem;
					position: sticky;
					top: 0;
					z-index: 1;
					background-color: color-mix(var(--background-secondary), transparent);

					&::before {
						content: '';
						position: absolute;
						inset: -0.5rem -2rem;
						backdrop-filter: blur(0.5rem);
						z-index: -1;
						mask-image: linear-gradient(to top, transparent, white 0.5rem);
					}

					/* &::after {
						content: '';
						position: absolute;
						bottom: 0;
						left: 0;
						width: 100%;
						height: 2px;
						background: linear-gradient(to right, var(--accent), transparent);
					} */
					
					h2 {
						font-size: 1.8rem;
						font-weight: 700;
					}

					.section-controls {
						display: flex;
						align-items: center;
						gap: var(--spacing-md);

						.section-score {
							display: flex;
							align-items: center;
							gap: 0.25rem;
							padding: 0.5rem 1.15rem;
							border-radius: var(--border-radius);
							font-weight: 500;
							color: white;
							font-size: 0.9rem;
							box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
							background-color: var(--accent, transparent);

							.unrated-hint {
								cursor: help;
							}
						}
					}
				}
				
				.section-caption {
					opacity: 0.8;
				}

				.section-body {
					.attribute-group-body {
						background-color: var(--background-primary);
						border-radius: var(--border-radius);
						padding: var(--spacing-md);
						box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

						.overview-container {
							display: grid;
							grid-template-columns: 280px 1fr;
							gap: 1rem;
							align-items: start;

							.attributes-list {
								flex: 1;
								width: 100%;
								
								h3 {
									font-size: 1rem;
									font-weight: 700;
									margin: 0 0 0.5rem 0;
								}

								.attributes-container {
									display: flex;
									flex-direction: column;
									gap: 0.5rem;
									max-height: 300px;
									overflow-y: auto;
									padding-right: 0.25rem;

									.attribute-link {
										display: flex;
										align-items: center;
										padding: 0.5rem;
										background-color: var(--background-secondary);
										border-radius: var(--border-radius);
										color: var(--text-primary);
										text-decoration: none;
										font-size: 0.875rem;

										&:hover,
										&[data-highlighted] {
											background-color: var(--background-tertiary);
										}

										.attribute-color-indicator {
											width: 1.15rem;
											height: 1.15rem;
											border-radius: 50%;
											margin-right: 1.15rem;
											border: 1px solid var(--border-color);
											flex-shrink: 0;
										}

										.attribute-name {
											flex: 1;
										}

										.attribute-rating {
											font-size: 0.75rem;
											font-weight: 500;
											padding: 0.25rem 0.5rem;
											border-radius: var(--border-radius-sm);
											
											&.rating-pass {
												background-color: rgba(46, 204, 113, 0.25);
												color: var(--success);
											}
											
											&.rating-partial {
												background-color: rgba(241, 196, 15, 0.25);
												color: var(--warning);
											}
											
											&.rating-fail {
												background-color: rgba(231, 76, 60, 0.25);
												color: var(--error);
											}
											
											&.rating-unrated {
												background-color: rgba(127, 127, 127, 0.25);
												color: var(--neutral);
											}
										}
									}
								}
							}

							.no-attributes {
								color: var(--text-secondary);
								font-style: italic;
								font-size: 0.875rem;
								text-align: center;
								padding: 2rem 0;
							}
						}
					}
				}

				.subsections-grid {
					display: grid;
					gap: var(--spacing-lg);

					.subsection {
						display: grid;
						gap: var(--spacing-md);
						padding: var(--spacing-lg);
						border-radius: var(--border-radius);
						border: 2px solid var(--accent);
						background-color: var(--background-primary);
						color: var(--text-primary);
						scroll-margin-top: 3.5rem;
						box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
						transition: box-shadow 0.2s ease, transform 0.2s ease;
						
						&:hover {
							box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
							transform: translateY(-1px);
						}

						&::scroll-marker {
							content: attr(data-icon) '\00a0\00a0' attr(aria-label);
							text-decoration: none;
							padding: 0.6em 2.5em 0.6em 0.75em;
							font-size: 0.85rem;
							color: var(--text-secondary);
							position: relative;
							transition: all 0.2s ease;
							border-radius: var(--border-radius-sm);
							margin-left: 1.15rem;
							display: flex;
							align-items: center;
							opacity: 0.8;
							background:
								radial-gradient(
									circle closest-side,
									var(--accent, var(--text-secondary)) calc(100% - 0.5px),
									transparent 100%
								)
								no-repeat
								right calc(1.15rem - 0.25em) center / 0.5em 0.5em
								var(--background-secondary)
							;

							&:target-current {
								background-color: var(--background-primary);
								background-color: white;
								color: var(--accent);
								font-weight: 500;
								opacity: 1;

								box-shadow: inset 1px 0 0 var(--accent, transparent);
							}

							&:hover {
								background-color: var(--background-tertiary);
								color: var(--accent);
								opacity: 1;
							}
						}

						summary {
							list-style: none;
							cursor: pointer;

							&::-webkit-details-marker {
								display: none;
							}

							.summary-content {
								display: grid;
								grid-template-columns: 1fr auto;
								align-items: center;
								position: relative;

								&::after {
									content: "▼";
									font-size: 0.8rem;
									position: absolute;
									right: -1.5rem;
									top: 50%;
									transform: translateY(-50%);
									opacity: 0.5;
								}

								h3 {
									font-weight: 600;
								}

								.variant-controls {
									display: flex;
									align-items: center;
									font-size: 0.85rem;
									
									.variant-indicator {
										display: flex;
										align-items: center;
										gap: var(--spacing-sm);
										
										.variant-label {
											color: var(--text-secondary);
											font-size: 0.8rem;
										}
										
										.variant-badge {
											padding: 0.2rem 0.5rem;
											background-color: var(--background-tertiary);
											border-radius: var(--border-radius-sm);
											font-weight: 500;
											display: flex;
											align-items: center;
											gap: 0.25rem;
											
											.variant-icon {
												font-size: 1rem;
											}
										}
									}
									
									.variant-selector {
										display: flex;
										align-items: center;
										gap: var(--spacing-sm);
										
										.variant-label {
											color: var(--text-secondary);
											font-size: 0.8rem;
										}
										
										.variant-buttons {
											display: flex;
											gap: var(--spacing-xs, 0.25rem);
											flex-wrap: wrap;
										}
									}
								}
							}
						}

						&[open] .summary-content::after {
							content: "▲";
						}

						.subsection-caption {
							opacity: 0.8;
							margin: 0 0 var(--spacing-lg) 0;
							color: var(--text-secondary);
						}

						.subsection-content {
							.subsection-body {
								.wallet-attribute {
									display: grid;
									gap: var(--spacing-md);

									.attribute-content {
										display: grid;
										grid-template-columns: auto 1fr;
										gap: var(--spacing-md);
										font-weight: 500;
										padding: var(--spacing-md);
										background-color: var(--background-secondary);
										border-radius: var(--border-radius);
										box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
										
										&.rating-pass {
											background-color: rgba(46, 204, 113, 0.05);
											border-left: 3px solid var(--success);
											
											.rating-icon {
												color: var(--success);
											}
										}
										
										&.rating-partial {
											background-color: rgba(241, 196, 15, 0.05);
											border-left: 3px solid var(--warning);
											
											.rating-icon {
												color: var(--warning);
											}
										}
										
										&.rating-fail {
											background-color: rgba(231, 76, 60, 0.05);
											border-left: 3px solid var(--error);
											
											.rating-icon {
												color: var(--error);
											}
										}
										
										&.rating-unrated {
											background-color: rgba(127, 127, 127, 0.05);
											border-left: 3px solid var(--neutral);
											
											.rating-icon {
												color: var(--neutral);
											}
										}
										
										&.rating-exempt {
											background-color: rgba(127, 127, 127, 0.05);
											border-left: 3px solid var(--neutral);
											opacity: 0.7;
											
											.rating-icon {
												color: var(--neutral);
											}
										}
										
										.rating-icon {
											display: flex;
											align-items: center;
											justify-content: center;
											width: 1.5rem;
											height: 1.5rem;
											font-size: 1.2rem;
										}
										
										.attribute-details {
											font-weight: 400;

											.custom-content, .no-details {
												font-style: italic;
												color: var(--text-secondary);
											}
										}
									}

									.variant-caption {
										margin-top: var(--spacing-sm);
										font-size: 0.9rem;
										font-style: italic;
										color: var(--text-secondary);
										padding: var(--spacing-sm);
										background-color: var(--background-secondary);
										border-radius: var(--border-radius-sm);
										border-left: 3px solid var(--accent, var(--border-color));
									}

									.attribute-impact {
										margin-top: var(--spacing-md);
										font-style: italic;
										opacity: 0.9;
									}

									.attribute-references {
										margin-top: var(--spacing-md);
										
										h4 {
											margin: 0 0 0.5rem 0;
											font-size: 0.9rem;
											font-weight: 600;
										}
										
										ul {
											margin: 0;
											padding-left: 1.5rem;
											
											li {
												margin-bottom: 0.3rem;
												
												a {
													color: var(--link);
													text-decoration: none;
													
													&:hover {
														text-decoration: underline;
													}
												}
											}
										}
									}

									.attribute-accordions {
										margin-top: var(--spacing-md);

										.accordion {
											margin-top: var(--spacing-md);
											background-color: var(--background-tertiary);
											border-radius: var(--border-radius);
											overflow: hidden;

											&:first-child {
												margin-top: var(--spacing-md);
											}

											summary {
												display: flex;
												align-items: center;
												justify-content: space-between;
												padding: var(--spacing-md);
												cursor: pointer;
												user-select: none;

												h4 {
													margin: 0;
													font-size: 1rem;
													font-weight: 600;
												}

												&::after {
													content: '▼';
													margin-left: var(--spacing-md);
													font-size: 0.8rem;
													transition: transform 0.2s;
												}

												&::-webkit-details-marker {
													display: none;
												}
											}

											&[open] summary::after {
												transform: rotate(180deg);
											}

											.accordion-content {
												padding: 0 var(--spacing-md) var(--spacing-md);
												font-size: 0.95rem;
												line-height: 1.5;

												.no-content {
													font-style: italic;
													opacity: 0.7;
												}

												p {
													margin-top: 0.5rem;
													margin-bottom: 0.5rem;

													&:first-child {
														margin-top: 0;
													}

													&:last-child {
														margin-bottom: 0;
													}
												}

												.methodology {
													.failure-modes {
														margin-top: var(--spacing-md);
														
														h5 {
															margin-top: 0;
															margin-bottom: 0.5rem;
															font-size: 0.9rem;
															font-weight: 600;
														}
														
														ul {
															margin: 0;
															padding-left: 1.5rem;
														}
													}

													.rating-scale {
														margin-top: var(--spacing-lg);
														padding: var(--spacing-md);
														background-color: var(--background-tertiary);
														border-radius: var(--border-radius);
														
														h5 {
															margin-top: 0;
															margin-bottom: var(--spacing-md);
															font-size: 1rem;
															font-weight: 600;
														}
														
														&.simple-scale {
															line-height: 1.5;
															color: var(--text-secondary);
														}
														
														&.example-scale {
															.example-rating {
																margin-bottom: var(--spacing-md);
																
																&:last-child {
																	margin-bottom: 0;
																}
																
																h6 {
																	margin: 0 0 0.5rem 0;
																	font-size: 0.9rem;
																	font-weight: 600;
																	display: flex;
																	align-items: center;
																	gap: var(--spacing-sm);
																}
																
																.rating-icon {
																	display: inline-flex;
																	align-items: center;
																	justify-content: center;
																	width: 1.2rem;
																	height: 1.2rem;
																	
																	&.pass {
																		color: var(--success);
																	}
																	
																	&.partial {
																		color: var(--warning);
																	}
																	
																	&.fail {
																		color: var(--error);
																	}
																}
																
																ul {
																	margin: 0;
																	padding-left: 1.5rem;
																	
																	li {
																		margin-bottom: 0.3rem;
																	
																		&:last-child {
																			margin-bottom: 0;
																		}
																	}
																}
															}
														}
													}
												}

												.override-note {
													display: grid;
													grid-template-columns: auto 1fr;
													gap: 0.5rem;
													margin-top: var(--spacing-md);
													padding: var(--spacing-md);
													background-color: var(--background-secondary);
													border-radius: var(--border-radius);
													
													.note-icon {
														font-size: 1.2rem;
													}
													
													.note-content {
														p:first-child {
															margin-top: 0;
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	.nav-title {
		position: absolute;
		top: var(--spacing-md);
		left: var(--spacing-md);
		width: calc(var(--nav-width) - var(--spacing-md) * 2);
		font-size: 0.9rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;
		opacity: 0.8;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
		z-index: 10;
		background-color: var(--background-primary);
	}

	.page-header {
		display: grid;
		padding: var(--spacing-xl) var(--spacing-md);
		gap: var(--spacing-lg);

		h1 {
			display: grid;
			grid-template-columns: auto 1fr;
			align-items: center;
			gap: var(--spacing-sm);
			font-size: 2.25rem;
			color: var(--text-primary);
		}
	}
	
	.wallet-icon {
		width: var(--wallet-icon-size);
		height: var(--wallet-icon-size);
		filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
	}
	
	hr {
		width: 80%;
		height: 1px;
		border: 0;
		border-bottom: 1px solid #313131;
		margin-inline: auto;
	}
	
	/* Wallet overview (first section) */
	.wallet-overview {
		display: grid;
		gap: var(--spacing-lg);

		.wallet-links {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(120px, auto));
			gap: var(--spacing-sm);

			.wallet-link {
				display: grid;
				grid-template-columns: auto 1fr;
				align-items: center;
				gap: var(--spacing-sm);
				padding: var(--spacing-sm);
				border-radius: var(--border-radius);
				border: 1px solid var(--border-color);
				background-color: var(--background-primary);
				color: var(--text-primary);
				text-decoration: none;
				font-weight: 500;
				font-size: 0.9rem;

				&:hover {
					background-color: var(--background-secondary);
				}

				&::before {
					content: "";
					width: 1rem;
					height: 1rem;
					background-size: contain;
				}

				&.website::before {
					background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/></svg>");
				}

				&.repo::before {
					background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'/></svg>");
				}
			}
		}
		
		.wallet-platforms {
			font-size: 0.9rem;
			margin-top: var(--spacing-md);
			padding: var(--spacing-md);
			background-color: var(--background-primary);
			border-radius: var(--border-radius);
			color: var(--text-secondary);
			
			.variant-disclaimer {
				display: block;
				margin-top: var(--spacing-sm);
				font-style: italic;
			}
		}
	}
	
	.platforms-label {
		color: var(--accent);
	}
	
	.return-to-top {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 10;
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		background-color: var(--accent);
		color: var(--text-inverse);
		border-radius: 50%;
		text-decoration: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		font-weight: bold;
		
		&:hover {
			background-color: var(--accent-light);
		}
	}

	.not-implemented {
		opacity: 0.7;
	}

	.supported-hardware-wallets {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		background-color: var(--background-secondary);
		border-radius: var(--border-radius);
		
		h5 {
			margin: 0 0 var(--spacing-sm) 0;
			font-size: 0.9rem;
			font-weight: 600;
		}
		
		.hw-wallet-list {
			display: flex;
			flex-wrap: wrap;
			gap: var(--spacing-sm);
			
			.hw-wallet-badge {
				padding: 0.25rem 0.75rem;
				background-color: var(--background-tertiary);
				border-radius: var(--border-radius-sm);
				font-size: 0.85rem;
				font-weight: 500;
				display: flex;
				align-items: center;
				gap: 0.5rem;
				transition: all 0.2s ease;
				border: 1px solid transparent;
				box-shadow: 0 1px 2px rgba(0,0,0,0.05);
												
				&:hover {
					transform: translateY(-2px);
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				}
				
				&[data-type="ledger"] {
					&::before {
						content: "🔵";
						font-size: 0.9rem;
					}
					background-color: rgba(0, 82, 255, 0.1);
					border-color: rgba(0, 82, 255, 0.3);
				}
				
				&[data-type="trezor"] {
					&::before {
						content: "🟣";
						font-size: 0.9rem;
					}
					background-color: rgba(99, 0, 226, 0.1);
					border-color: rgba(99, 0, 226, 0.3);
				}
				
				&[data-type="gridplus"] {
					&::before {
						content: "🟢";
						font-size: 0.9rem;
					}
					background-color: rgba(0, 168, 98, 0.1);
					border-color: rgba(0, 168, 98, 0.3);
				}
				
				&[data-type="keystone"] {
					&::before {
						content: "🟠";
						font-size: 0.9rem;
					}
					background-color: rgba(255, 123, 0, 0.1);
					border-color: rgba(255, 123, 0, 0.3);
				}
				
				&[data-type="keepkey"] {
					&::before {
						content: "🔘";
						font-size: 0.9rem;
					}
					background-color: rgba(128, 128, 128, 0.1);
					border-color: rgba(128, 128, 128, 0.3);
				}
				
				&[data-type="firefly"] {
					&::before {
						content: "🔴";
						font-size: 0.9rem;
					}
					background-color: rgba(255, 59, 48, 0.1);
					border-color: rgba(255, 59, 48, 0.3);
				}
				
				&[data-type="other"] {
					&::before {
						content: "⚪";
						font-size: 0.9rem;
					}
				}
			}
		}
	}

	.variant-button {
		padding: 0.2rem 0.5rem;
		background-color: var(--background-tertiary);
		border: 1px solid transparent;
		border-radius: var(--border-radius-sm);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		gap: 0.25rem;
		color: var(--text-primary);
		position: relative;
		overflow: hidden;
		
		.variant-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1.1rem;
			position: relative;
			z-index: 2;
		}
		
		.variant-name {
			display: none;
			font-size: 0.8rem;
			position: relative;
			z-index: 2;
			white-space: nowrap;
			max-width: 0;
			opacity: 0;
			transition: max-width 0.3s ease, opacity 0.2s ease;
		}

		&:hover {
			background-color: var(--background-quaternary);
			transform: translateY(-1px);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			
			.variant-name {
				display: inline;
				max-width: 100px;
				opacity: 1;
			}
		}
		
		&.active {
			background-color: var(--primary-light);
			border-color: var(--primary);
			color: var(--primary);
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
			transform: translateY(-1px);
			
			.variant-name {
				display: inline;
				max-width: 100px;
				opacity: 1;
			}
			
			&::after {
				content: '';
				position: absolute;
				bottom: 0;
				left: 0;
				width: 100%;
				height: 2px;
				background-color: var(--primary);
			}
		}
		
		&:focus {
			outline: none;
			box-shadow: 0 0 0 2px var(--primary-light);
		}
	}

	.variant-selector {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: 0.25rem;
		background-color: var(--background-secondary);
		border-radius: var(--border-radius);
		
		.variant-label {
			color: var(--text-secondary);
			font-size: 0.8rem;
			white-space: nowrap;
		}
		
		.variant-buttons {
			display: flex;
			gap: var(--spacing-xs, 0.25rem);
			flex-wrap: wrap;
		}
	}

	@media (max-width: 768px) {
		.wallet-section {
			.section-body {
				.attribute-group-body {
					.overview-container {
						grid-template-columns: 1fr;
						justify-items: center;
					}
				}
			}

			.subsections-grid {
				.subsection {
					.subsection-content {
						.subsection-body {
							.wallet-attribute {
								.attribute-content {
									grid-template-columns: 1fr;
									
									.rating-icon {
										margin-bottom: var(--spacing-sm);
									}
								}
							}
						}
					}

					summary {
						.summary-content {
							.variant-controls {
								.variant-selector {
									flex-direction: column;
									align-items: flex-start;
									
									.variant-buttons {
										margin-top: var(--spacing-sm);
										flex-wrap: wrap;
									}
								}
							}
						}
					}
				}
			}
		}
	}
</style> 
