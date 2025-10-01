<script lang="ts">
	// Types/constants
	import {
		ratingToColor,
		Rating,
		type EvaluatedAttribute,
		type AttributeGroup,
		type Attribute,
		type EvaluatedGroup,
		ratingIcons,
	} from '@/schema/attributes'
	import { VariantSpecificity } from '@/schema/wallet'
	import { getSingleVariant, type Variant } from '@/schema/variants'
	import { allRatedWallets, type WalletName } from '@/data/wallets'
	import { ContentType, isTypographicContent } from '@/types/content'
	import { objectEntries, objectKeys } from '@/types/utils/object'


	// Functions
	import {
		variants,
		variantFromUrlQuery,
		variantToName,
		variantUrlQuery,
		variantToRunsOn,
	} from '@/components/variants'
	import {
		attributeTree,
		calculateAttributeGroupScore,
		calculateOverallScore,
	} from '@/schema/attribute-groups'
	import { nonEmptyEntries } from '@/types/utils/non-empty'
	import { renderStrings, slugifyCamelCase } from '@/types/utils/text'
	import { toFullyQualified } from '@/schema/reference'
	import { getAttributeOverride } from '@/schema/wallet'
	import { scoreToColor } from '@/utils/colors'


	// Components
	import Typography from '@/ui/atoms/Typography.svelte'
	import Pie, { PieLayout } from '@/ui/atoms/Pie.svelte'
	import RenderCustomContent from '@/ui/atoms/RenderCustomContent.svelte'
	import ReferenceLinks from '@/ui/atoms/ReferenceLinks.svelte'
	import ScoreBadge from '@/ui/atoms/ScoreBadge.svelte'
	import WalletAttributeGroupSummary from '@/ui/molecules/WalletAttributeGroupSummary.svelte'


	// Props
	const {
		walletName
	}: {
		walletName: WalletName,
	} = $props()


	// State
	let pickedVariant = $state<Variant | null>(
		null
	)
	let highlightedAttributeId = $state<string | null>(
		null
	)

	// (Derived)
	const wallet = $derived(
		allRatedWallets[walletName]
	)
	const singleVariant = $derived(
		getSingleVariant(wallet.variants ?? {}).singleVariant
	)


	$effect(() => {
		pickedVariant = singleVariant !== null ? singleVariant : wallet ? variantFromUrlQuery(wallet.variants) : null
	})

	// Derived evaluation tree based on picked variant
	const evalTree = $derived(
		pickedVariant === null || !wallet.variants[pickedVariant] ? wallet.overall : wallet.variants[pickedVariant]?.attributes
	)

	// Map variants to attributes
	const attrToRelevantVariants = $derived.by(() => {
		const map = new Map<string, Variant[]>()

		if (!wallet.variantSpecificity) return map

		for (const [variant, variantSpecificityMap] of nonEmptyEntries(wallet.variantSpecificity)) {
			if (!variantSpecificityMap) continue
			for (const [evalAttrId, variantSpecificity] of Object.entries(variantSpecificityMap)) {
				switch (variantSpecificity) {
					case VariantSpecificity.ALL_SAME:
					case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
						break
					case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
						map.set(evalAttrId, [variant as Variant])
						break
					default:
						const relevantVariants = map.get(evalAttrId)
						relevantVariants ? relevantVariants.push(variant as Variant) : map.set(evalAttrId, [variant as Variant])
				}
			}
		}

		return map
	})

	const overallScore = $derived(
		calculateOverallScore(wallet.overall)
	)


	// Actions
	const updatePickedVariant = (variant: Variant | null) => {
		if (singleVariant !== null) return // If there is a single variant, do not pollute the URL with it

		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${variantUrlQuery(
				wallet.variants,
				variant ?? null,
			)}${window.location.hash}`,
		)

		pickedVariant = variant
	}
</script>


<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: evalTree
			? objectEntries(attributeTree).flatMap(([attrGroupId, attrGroup]) =>
					objectEntries(attrGroup.attributes as AttributeGroup<any>['attributes'])
						.map(([attrId, attribute]) => ({
							evalAttr: evalTree[attrGroupId][
								attrId as keyof (typeof evalTree)[typeof attrGroupId]
							] as EvaluatedAttribute<any> | undefined,
							attribute,
						}))
						.filter(
							({ evalAttr }) => evalAttr && evalAttr.evaluation.value.rating !== Rating.EXEMPT,
						)
						.map(({ attribute }) => ({
							'@type': 'Question',
							name: renderStrings(
								attribute.question.contentType === ContentType.MARKDOWN
									? attribute.question.markdown
									: attribute.question.contentType === ContentType.TEXT
										? attribute.question.text
										: attribute.displayName,
								{
									WALLET_NAME: wallet.metadata.displayName,
								},
							),
							acceptedAnswer: {
								'@type': 'Answer',
								text: renderStrings(
									attribute.why.contentType === ContentType.MARKDOWN
										? attribute.why.markdown
										: attribute.why.contentType === ContentType.TEXT
											? attribute.why.text
											: 'No explanation available',
									{
										WALLET_NAME: wallet.metadata.displayName,
									},
								),
							},
						})),
				)
			: [],
		about: {
			'@type': 'SoftwareApplication',
			name: wallet.metadata.displayName,
			description: renderStrings(
				wallet.metadata.blurb.contentType === ContentType.TEXT
					? wallet.metadata.blurb.text
					: `${wallet.metadata.displayName} wallet`,
				{
					WALLET_NAME: wallet.metadata.displayName,
				},
			),
			url: typeof wallet.metadata.url === 'string' ? wallet.metadata.url : wallet.metadata.url?.url,
			applicationCategory: 'Cryptocurrency Wallet',
			operatingSystem: objectKeys(wallet.variants)
				.map(variant => variantToRunsOn(variant))
				.join(', '),
		},
	})}</script>`}
</svelte:head>


<a href="#top" class="return-to-top">↑</a>

<div class="container">
	<article>
		<div
			data-sticky
			class="nav-title"
		>
			Table of contents
		</div>

		<header id="top">
			<div>
				<h1>
					<img
						class="wallet-icon"
						alt={wallet.metadata.displayName}
						src={`/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`}
					/>
					<span>{wallet.metadata.displayName}</span>
				</h1>

				<div>
					<span>Walletbeat score: </span>
					<ScoreBadge score={overallScore} size="large" />
				</div>
			</div>

			<section class="wallet-overview">
				<nav class="wallet-links">
					<a
						href={typeof wallet.metadata.url === 'string' ? wallet.metadata.url : wallet.metadata.url?.url ?? '#'}
						class="wallet-link website"
						target="_blank"
						rel="noopener noreferrer"
					>
						Website
					</a>

					{#if wallet.metadata.repoUrl}
						<a
							href={typeof wallet.metadata.repoUrl === 'string' ? wallet.metadata.repoUrl : wallet.metadata.repoUrl?.url ?? '#'}
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
			</section>
		</header>

		{#each evalTree ? objectEntries(attributeTree) : [] as [attrGroupId, attrGroup]}
			{@const evalGroup = evalTree?.[attrGroupId]}

			{#if evalGroup}
				{@render attributeGroupSnippet({
					attrGroup,
					evalGroup,
				})}
			{/if}
		{/each}
	</article>
</div>


{#snippet attributeGroupSnippet({
	attrGroup,
	evalGroup,
}: {
	attrGroup: AttributeGroup<any>
	evalGroup: EvaluatedGroup<any>
})}
	{@const attributes = objectEntries(attrGroup.attributes as AttributeGroup<any>['attributes'])
		.map(([attrId, attribute]) => ({
			attribute,
			evalAttr: evalGroup[attrId] as EvaluatedAttribute<any> | undefined,
		}))
		.filter(({ evalAttr }) => evalAttr && evalAttr.evaluation.value.rating !== Rating.EXEMPT)
		.map(({ attribute, evalAttr }) => ({
			attribute,
			evalAttr: evalAttr!,
		}))}

	{#if attributes.length > 0}
		{@const score = evalGroup ? calculateAttributeGroupScore(attrGroup.attributeWeights, evalGroup) : null}
		{@const scoreLevel = score?.score ? score.score >= 0.7 ? 'high' : score.score >= 0.4 ? 'medium' : 'low' : undefined}

		<hr />

		<section
			class="attribute-group"
			id={slugifyCamelCase(attrGroup.id)}
			aria-label={attrGroup.displayName}
			data-score={scoreLevel}
			data-icon={attrGroup.icon}
			style:--accent={scoreToColor(score?.score)}
		>
			<header data-sticky>
				<h2>{attrGroup.displayName}</h2>

				<ScoreBadge
					{score}
				/>
			</header>

			{#if attrGroup.perWalletQuestion}
				<div class="section-caption">
					<Typography
						content={attrGroup.perWalletQuestion}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>
			{/if}

			<div class="attributes-overview-container">
				<section class="attributes-overview">
					<div class="attributes-pie">
						<Pie
							layout={PieLayout.FullTop}
							radius={120}
							padding={20}
							levels={[{
								outerRadiusFraction: 0.95,
								innerRadiusFraction: 0.125,
								gap: 8,
								angleGap: 0,
							}]}
							slices={
								attributes
									.map(({ attribute, evalAttr }) => ({
										id: attribute.id,
										color: ratingToColor(evalAttr.evaluation.value.rating),
										weight: attrGroup.attributeWeights[attribute.id],
										arcLabel: evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon,
										tooltip: attribute.displayName,
										tooltipValue: evalAttr.evaluation.value.rating,
										href: `#${slugifyCamelCase(attribute.id)}`,
									}))
							}
							highlightedSliceId={highlightedAttributeId}
							onSliceMouseEnter={id => {
								highlightedAttributeId = id
							}}
							onSliceMouseLeave={() => {
								highlightedAttributeId = null
							}}
						>
							{#snippet centerContentSnippet()}
								<circle
									r="8"
									fill={scoreToColor(score?.score)}
								>
									{#if score?.hasUnratedComponent}
										<title>
											*contains unrated components
										</title>
									{/if}
								</circle>
							{/snippet}
						</Pie>
					</div>

					<div class="attributes-list">
						<h3>Attribute Details:</h3>

						<ul>
							{#each attributes as { attribute, evalAttr }}
								{@const attributeUrl = `#${slugifyCamelCase(attribute.id)}`}
								<li>
									<a
										href={attributeUrl}
										style:--accent={ratingToColor(evalAttr.evaluation.value.rating)}
										data-highlighted={highlightedAttributeId === attribute.id ? '' : undefined}
										onmouseenter={() => {
											highlightedAttributeId = attribute.id
										}}
										onmouseleave={() => {
											highlightedAttributeId = null
										}}
									>
										<span>{attribute.displayName}</span>
										<data
											class="rating"
											value={evalAttr.evaluation.value.rating}
										>{evalAttr.evaluation.value.rating}</data>
									</a>
								</li>
							{/each}
						</ul>
					</div>
				</section>
			</div>

			<div class="attributes">
				{#each attributes as { attribute, evalAttr }}
					{@render attributeSnippet({
						attrGroupId: attrGroup.id,
						attribute,
						evalAttr,
					})}
				{/each}
			</div>
		</section>
	{/if}
{/snippet}


{#snippet attributeSnippet({
	attrGroupId,
	attribute,
	evalAttr,
}: {
	attrGroupId: string
	attribute: Attribute<any>
	evalAttr: EvaluatedAttribute<any>
})}
	{@const relevantVariants = attrToRelevantVariants.get(attribute.id) ?? []}

	{@const override = getAttributeOverride(wallet, attrGroupId, attribute.id)}

	{@const howToImprove = override?.howToImprove !== undefined ? override.howToImprove : evalAttr.evaluation.howToImprove}

	{@const variantSpecificCaption = (() => {
		const thisVariantSpecificity = relevantVariants.length === 0 ? VariantSpecificity.ALL_SAME : relevantVariants.length === 1 ? VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT : VariantSpecificity.NOT_UNIVERSAL

		const thisDisplayedVariant = relevantVariants.length === 1 ? relevantVariants[0] : pickedVariant

		switch (thisVariantSpecificity) {
			case VariantSpecificity.ALL_SAME:
				return null
			case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
				return thisDisplayedVariant ? `This rating is only relevant for the ${variantToName(thisDisplayedVariant, false)} version.` : null
			default:
				return thisDisplayedVariant === null ? 'This rating differs across versions. Select a specific version for details.' : `This rating is specific to the ${variantToName(thisDisplayedVariant, false)} version.`
		}
	})()}

	<section 
		class="attribute" 
		id={slugifyCamelCase(attribute.id)} 
		aria-label={attribute.displayName}
		style:--accent={ratingToColor(evalAttr.evaluation.value.rating)}
		data-rating={evalAttr.evaluation.value.rating.toLowerCase()}
		data-icon={attribute.icon}
	>
		<details
			open
		>
			<summary>
				<header>
					<div>
						<h3 data-icon={attribute.icon}>{attribute.displayName}</h3>

						{#if attribute.question}
							<div class="subsection-caption">
								<Typography
									content={attribute.question}
									strings={{ WALLET_NAME: wallet.metadata.displayName }}
								/>
							</div>
						{/if}
					</div>
					
					<data
						class="rating"
						value={evalAttr.evaluation.value.rating}
					>{evalAttr.evaluation.value.rating}</data>
				</header>

				{#if relevantVariants.length === 1}
					<div class="variant-controls">
						<div
							class="variant-indicator"
							title={`Only rated on the ${variantToName(relevantVariants[0], false)} version`}
						>
							<small>Only</small>
							<span class="variant-badge">
								<span class="variant-icon" aria-hidden="true"
									>{@html variants[relevantVariants[0]].icon}</span
								>
							</span>
						</div>
					</div>
				{:else if relevantVariants.length > 1}
					<fieldset class="variant-selector">
						<legend>
							{pickedVariant === null ? 'Version:' : 'Viewing:'}
						</legend>
						<div class="variant-buttons">
							{#each relevantVariants as variant}
								<button
									class="variant-button"
									class:active={pickedVariant === variant}
									onclick={() => updatePickedVariant(pickedVariant === variant ? null : variant)}
									aria-pressed={pickedVariant === variant}
									title={pickedVariant === variant ? 'Remove version filter' : `View rating for ${variantToName(variant, false)} version`}
								>
									<span class="variant-icon" aria-hidden="true">{@html variants[variant].icon}</span
									>
									<span class="variant-name">{variants[variant].label}</span>
								</button>
							{/each}
						</div>
					</fieldset>
				{/if}
			</summary>

			<div class="rating-display" data-rating={evalAttr.evaluation.value.rating.toLowerCase()}>
				<div class="rating-icon">
					{ratingIcons[evalAttr.evaluation.value.rating]}
				</div>
				<div class="rating-content">
					{#if isTypographicContent(evalAttr.evaluation.details)}
						<Typography
							content={evalAttr.evaluation.details}
							strings={{ WALLET_NAME: wallet.metadata.displayName }}
						/>
					{:else if evalAttr.evaluation.details}
						<div>
							<RenderCustomContent
								content={evalAttr.evaluation.details}
								{wallet}
								value={evalAttr.evaluation.value}
								references={toFullyQualified(evalAttr.evaluation.references || [])}
							/>
						</div>
					{:else}
						<div>
							<Typography
								content={{
									contentType: ContentType.TEXT,
									text: `No detailed evaluation available for ${attribute.displayName}`,
								}}
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

			{#if evalAttr.evaluation.impact}
				<div class="impact">
					<Typography
						content={evalAttr.evaluation.impact}
						strings={{ WALLET_NAME: wallet.metadata.displayName }}
					/>
				</div>
			{/if}

			<ReferenceLinks references={toFullyQualified(evalAttr.evaluation.references || [])} />

			{#if attribute.id === 'hardwareWalletSupport' && evalAttr.evaluation.value && typeof evalAttr.evaluation.value === 'object' && 'supportedHardwareWallets' in evalAttr.evaluation.value && Array.isArray(evalAttr.evaluation.value.supportedHardwareWallets) && evalAttr.evaluation.value.supportedHardwareWallets.length > 0}
				<div class="supported-hardware-wallets">
					<h5>Supported Hardware Wallets:</h5>
					<div class="hw-wallet-list">
						{#each evalAttr.evaluation.value.supportedHardwareWallets as hwWallet}
							<div
								class="hw-wallet-badge"
								data-type={typeof hwWallet === 'string' ? hwWallet.toLowerCase() : ''}
							>
								{
									typeof hwWallet === 'string' ?
										{
											LEDGER: 'Ledger',
											TREZOR: 'Trezor',
											KEYSTONE: 'Keystone',
											GRIDPLUS: 'GridPlus',
											KEEPKEY: 'KeepKey',
											FIREFLY: 'FireFly',
										}[hwWallet]
										?? hwWallet
									:
										'Unknown'
								}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="attribute-accordions">
				<details>
					<summary>
						<h4>
							{evalAttr.evaluation.value.rating === Rating.PASS || evalAttr.evaluation.value.rating === Rating.UNRATED ? 'Why does this matter?' : 'Why should I care?'}
						</h4>
					</summary>

					<section>
						{#if attribute.why}
							<Typography
								content={attribute.why}
							/>
						{:else}
							<p>No explanation available.</p>
						{/if}
					</section>
				</details>

				<details>
					<summary>
						<h4>
							{attribute.wording?.midSentenceName === null ? attribute.wording?.howIsEvaluated ?? 'How is this evaluated?' : `How is ${attribute.wording?.midSentenceName ?? 'this'} evaluated?`}
						</h4>
					</summary>

					<section>
						<div class="methodology">
							{#if attribute.methodology}
								<Typography content={attribute.methodology} />
							{:else}
								<p>No methodology information available.</p>
							{/if}

							{#if attribute.ratingScale}
								<hr />

								{#if attribute.ratingScale.display === 'simple'}
									<div class="simple-scale">
										<Typography content={attribute.ratingScale.content} />
									</div>
								{:else}
									<div class="example-scale">
										{#if attribute.ratingScale.exhaustive}
											<h5>A few examples:</h5>
										{/if}

										<ul>
											{#if attribute.ratingScale.pass}
												<li data-icon={ratingIcons[Rating.PASS]}>
													<Typography
														content={{
															contentType: ContentType.MARKDOWN,
															markdown: [
																'A wallet would get a **passing** rating if...',
																[attribute.ratingScale.pass]
																	.flat()
																	.map(
																		example =>
																			`* ${(example.description.contentType === ContentType.MARKDOWN ? example.description.markdown : example.description.text).trim()}`,
																	)
																	.join('\n'),
															].join('\n\n'),
														}}
													/>
												</li>
											{/if}

											{#if attribute.ratingScale.partial}
												<li data-icon={ratingIcons[Rating.PARTIAL]}>
													<Typography
														content={{
															contentType: ContentType.MARKDOWN,
															markdown: [
																'A wallet would get a **partial** rating if...',
																[attribute.ratingScale.partial]
																	.flat()
																	.map(
																		example =>
																			`* ${(example.description.contentType === ContentType.MARKDOWN ? example.description.markdown : example.description.text).trim()}`,
																	)
																	.join('\n'),
															].join('\n\n'),
														}}
													/>
												</li>
											{/if}

											{#if attribute.ratingScale.fail}
												<li data-icon={ratingIcons[Rating.FAIL]}>
													<Typography
														content={{
															contentType: ContentType.MARKDOWN,
															markdown: [
																'A wallet would get a **failing** rating if...',
																[attribute.ratingScale.fail]
																	.flat()
																	.map(
																		example =>
																			`* ${(example.description.contentType === ContentType.MARKDOWN ? example.description.markdown : example.description.text).trim()}`,
																	)
																	.join('\n'),
															].join('\n\n'),
														}}
													/>
												</li>
											{/if}
										</ul>
									</div>
								{/if}
							{/if}
						</div>
					</section>
				</details>

				{#if howToImprove}
					<details>
						<summary>
							<h4>
								{#if attribute.wording?.midSentenceName === null}
									{#if attribute.wording?.whatCanWalletDoAboutIts}
										<Typography
											content={attribute.wording?.whatCanWalletDoAboutIts}
											strings={{ WALLET_NAME: wallet.metadata.displayName }}
										/>
									{:else}
										{`What can ${wallet.metadata.displayName} do about this?`}
									{/if}
								{:else}
									{`What can ${wallet.metadata.displayName} do about its ${attribute.wording?.midSentenceName || 'feature'}?`}
								{/if}
							</h4>
						</summary>

						<section>
							<Typography
								content={howToImprove}
								strings={{
									WALLET_NAME: wallet.metadata.displayName,
									WALLET_PSEUDONYM_SINGULAR: wallet.metadata.pseudonymType?.singular ?? null,
									WALLET_PSEUDONYM_PLURAL: wallet.metadata.pseudonymType?.plural ?? null,
								}}
							/>

							{#if override}
								<div class="note">
									<div class="icon">ℹ️</div>
									<div>
										<p>
											{`Note: This recommendation is specific to ${wallet.metadata.displayName} from the Wallet Beat team, not our general recommendation for all wallets of this type.`}
										</p>
									</div>
								</div>
							{/if}
						</section>
					</details>
				{/if}
			</div>
		</details>
	</section>
{/snippet}


<style>
	.container {
		--wallet-icon-size: 3rem;
		--border-radius-lg: 1rem;
		--border-radius: 0.5rem;
		--border-radius-sm: 0.25rem;
		--nav-width: 20rem;

		display: grid;
		grid-template:
			'Content Nav'
			/ 1fr auto
		;
		@media (max-width: 1024px) {
			grid-template:
				'Nav Content'
				/ auto 1fr
			;
		}
		@media (max-width: 864px) {
			grid-template:
				[Nav-start]
				'Content'
				[Nav-end]
				/ [Nav-start] 1fr [Nav-end]
			;
		}

		line-height: 1.6;

		position: relative;

		@supports not (scroll-marker-group: before) {
			&::before {
				content: '';
				grid-area: Nav;
			}
		}

		article {
			grid-area: Content;

			max-height: 100dvh;
			overflow: hidden auto;

			scroll-padding-block-start: 5rem;
			scroll-padding-block-end: 1rem;

			scroll-marker-group: before;

			display: grid;

			&::scroll-marker-group {
				z-index: 2;
				grid-area: Nav;

				scroll-padding-block: 0.5rem;
				box-sizing: border-box;
				position: sticky;
				top: 0;
				width: var(--nav-width);
				max-height: 100dvh;

				overflow-y: auto;
				scroll-behavior: smooth;

				display: grid;
				align-content: start;
				padding: calc(2.5rem + 1rem) 0.75rem 1rem;
				gap: 2px;

				background:
					linear-gradient(
						to right,
						transparent 1.66rem,
						var(--border-color) 1.66rem,
						var(--border-color) calc(1.66rem + 1px),
						transparent calc(1.66rem + 1px)
					) 
					0 calc(2.5rem + 1rem) / 100% calc(100% - calc(2.5rem + 1rem) - 1rem) no-repeat,
					var(--background-secondary)
				;
				border-inline: 1px solid var(--border-color);
			}

			@media (max-width: 864px) {
				&::scroll-marker-group {
					top: calc(var(--navigation-mobile-blockSize) + 4rem);
					max-height: calc(100dvh - var(--navigation-mobile-blockSize) - 4rem);

					transition-property: translate;
					transition-timing-function: var(--ease-out-expo);
					transition-duration: 0.3s;
				}

				&::scroll-marker-group:not(:focus-within) {
					translate: -100% 0;
				}
			}

			> :is(header, section, footer) {
				display: grid;
				grid-template-columns: minmax(0, 54rem);
				justify-content: center;
				padding: 3rem 1.5rem;
			}
		}
	}

	.nav-title {
		z-index: 3;

		position: absolute;
		left: auto;
		right: 0;

		@media (max-width: 1024px) {
			right: auto;
			left: 0;
		}

		@media (max-width: 864px) {
			transition-property: translate;
			translate: -100% 0;
		}

		bottom: auto;
		padding: 1rem;
		width: calc(var(--nav-width) - 1px);

		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border-color);

		font-size: 0.875rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 500;

		pointer-events: none;

		@supports not (scroll-marker-group: before) {
			display: none;
		}
	}

	header {
		gap: 1.5rem;

		> div {
			display: flex;
			align-items: center;
			gap: 1rem;
			justify-content: space-between;

			> h1 {
				display: grid;
				grid-template-columns: auto 1fr;
				align-items: center;
				gap: 0.5rem;
				font-size: 2.25rem;
				color: var(--text-primary);
			}

			> div {
				display: flex;
				align-items: center;
				gap: 0.5rem;
			}
		}
	}

	.wallet-icon {
		width: var(--wallet-icon-size);
		height: var(--wallet-icon-size);
		filter: drop-shadow(0 0 0.5rem rgba(255, 255, 255, 0.1));
	}

	.wallet-overview {
		display: grid;
		gap: 1.5rem;

		.wallet-links {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(120px, auto));
			gap: 0.5rem;

			.wallet-link {
				display: grid;
				grid-template-columns: auto 1fr;
				align-items: center;
				gap: 0.5rem;
				padding: 0.5rem;
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
					content: '';
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
			padding: 1rem;
			background-color: var(--background-primary);
			border-radius: var(--border-radius);
			color: var(--text-secondary);

			.variant-disclaimer {
				font-style: italic;
			}
		}
	}

	.platforms-label {
		color: var(--accent);
	}

	.attribute-group {
		&:has(.attribute:nth-of-type(1)) { --attributesCount: 1; }
		&:has(.attribute:nth-of-type(2)) { --attributesCount: 2; }
		&:has(.attribute:nth-of-type(3)) { --attributesCount: 3; }
		&:has(.attribute:nth-of-type(4)) { --attributesCount: 4; }
		&:has(.attribute:nth-of-type(5)) { --attributesCount: 5; }
		&:has(.attribute:nth-of-type(6)) { --attributesCount: 6; }
		&:has(.attribute:nth-of-type(7)) { --attributesCount: 7; }
		&:has(.attribute:nth-of-type(8)) { --attributesCount: 8; }
		&:has(.attribute:nth-of-type(9)) { --attributesCount: 9; }

		timeline-scope: --AttributesViewTimeline;

		display: grid;
		gap: 1em;
		scroll-margin-top: 3.5rem;
		padding: 3rem 1.5rem;

		&::scroll-marker {
			content: attr(data-icon) '\00a0\00a0' attr(aria-label);

			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.45rem 2rem 0.45rem 0.45rem;

			font-size: 0.975em;

			color: inherit;
			font-weight: 500;
			text-decoration: none;

			border-radius: 0.375rem;
			background:
				radial-gradient(
					circle closest-side,
					var(--accent, var(--text-secondary)) calc(100% - 0.5px),
					transparent 100%
				)
				no-repeat right calc(1.15rem - 0.25em) center / 0.5em 0.5em
				var(--background-secondary)
			;

			transition-property: background-color, color, outline;
		}

		&::scroll-marker:hover:not(:target-current) {
			background-color: var(--background-primary);
			color: var(--accent);
		}

		&::scroll-marker:target-current {
			background-color: var(--background-primary);
			color: var(--accent);
			font-weight: 500;
		}

		&::scroll-marker:focus {
			outline: 2px solid var(--accent);
			outline-offset: -1px;
		}

		&::scroll-marker:active {
			background-color: var(--background-primary);
		}

		> header {
			display: flex;
			align-items: center;
			justify-content: space-between;

			padding-block: 1rem;

			&[data-sticky]::before {
				content: '';
				inset: -0.5rem -6rem;
				mask-image: linear-gradient(to top, transparent, white 0.5rem);
			}

			h2 {
				font-size: 1.8rem;
				font-weight: 700;
			}

			.section-controls {
				display: flex;
				align-items: center;
				gap: 1rem;

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
			font-style: italic;
		}
	}

	.attributes-overview {
		background-color: var(--background-primary);
		border-radius: var(--border-radius-lg);
		padding: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-items: center;

		transition-property: background-color;

		@container not scroll-state(stuck: none) {
			background-color: transparent;
		}

		@container (max-width: 600px) {
			grid-template-columns: 1fr;
			justify-items: center;
		}

		> .attributes-pie {
			display: flex;
			align-items: center;

			font-size: 2.5em;
		}

		> .attributes-list {
			display: grid;
			gap: 0.75em;

			transition-property: translate, scale, opacity;

			@container not scroll-state(stuck: none) {
				translate: 0 -2rem;
				scale: 0.95;
				opacity: 0;
				pointer-events: none;
			}

			h3 {
				font-size: 1rem;
				font-weight: 700;
				margin: 0 0 0.5rem 0;
			}

			ul {
				display: grid;
				gap: 0.5em;
				list-style: none;
				margin: 0;
				padding: 0;

				li {
					display: contents;
				}

				a {
					display: grid;
					grid-template-columns: auto 1fr auto;
					gap: 0.5rem;
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

					&::before {
						content: '';
						width: 1em;
						height: 1em;
						border-radius: 50%;
						border: 1px solid var(--border-color);
						flex-shrink: 0;
						background-color: var(--accent);
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

	.score,
	.rating {
		font-size: 0.75em;
		font-weight: 500;
		padding: 0.25em 0.5em;
		border-radius: var(--border-radius-sm);
		background-color: color-mix(in srgb, var(--accent) 33%, transparent);
	}

	.score {
		font-size: 1em;
	}

	@media (min-width: 1800px) {
		.attributes-overview-container {
			@supports (container-type: scroll-state) {
				container-type: scroll-state;
				position: sticky;
				top: -1rem;
			}
		}

		.attributes-pie {
			background-image: radial-gradient(circle closest-side, var(--background-secondary) 90%, transparent 90%);

			animation:
				AttributesPieAngleAnimation steps(var(--attributesCount), jump-end) forwards,
				AttributesPieTransformAnimation var(--transition-easeOutExpo) both
			;
			animation-range:
				entry 50% exit 50%,
				entry 0% exit 100%
			;
			animation-timeline: --AttributesViewTimeline;

			> :global(*) {
				transition-property: translate, scale, opacity;
				transition-duration: 0.5s;
				translate: var(--translate);
				scale: var(--scale);
				opacity: var(--opacity);
			}
		}

		@keyframes AttributesPieAngleAnimation {
			from {
				--pie-rotate: calc(-0.25turn + 0.5turn / var(--attributesCount));
			}
			to {
				--pie-rotate: calc(-0.25turn + 0.5turn / var(--attributesCount) + 1turn);
			}
			exit 100% {
				--pie-rotate: 1turn;
			}
		}

		@keyframes AttributesPieTransformAnimation {
			entry 40% {
				--translate: 0px 0px;
			}
			entry 55% {
				--translate: calc(-50% - 1rem) calc(50vh - 50%);
			}	

			exit 47.5% {
				--translate: calc(-50% - 1rem) calc(50vh - 50%);
				--scale: 1;
				--opacity: 1;
			}
			exit 75% {
				--opacity: 0;
			}
			exit 100% {
				--scale: 0;
				--translate: 0 0;
			}
		}
	}

	.attributes {
		view-timeline: --AttributesViewTimeline block;

		position: relative;
		display: grid;
		gap: 1em;

		.attributes-pie {
			position: sticky;
			left: 0;
			top: 50vh;
			width: max-content;
			height: 0;
			translate: -50% -50%;
		}
	}

	.attribute {
		position: relative;

		&::scroll-marker {
			content: attr(data-icon) '\00a0\00a0' attr(aria-label);

			margin-left: 1.5rem;
			padding: 0.45rem 0.75rem;

			display: flex;
			align-items: center;
			gap: 0.5rem;
			position: relative;

			font-size: 0.9em;

			border-radius: 0.375rem;
			background:
				radial-gradient(
					circle closest-side,
					var(--accent, var(--text-secondary)) calc(100% - 0.5px),
					transparent 100%
				)
				no-repeat right calc(1.15rem - 0.25em) center / 0.5em 0.5em
				var(--background-secondary)
			;


			color: inherit;
			font-weight: 500;
			text-decoration: none;


			transition-property: background-color, color, outline;
		}

		&::scroll-marker:hover:not(:target-current) {
			background-color: var(--background-primary);
			color: var(--accent);
		}

		&::scroll-marker:target-current {
			background-color: var(--background-primary);
			color: var(--accent);
			font-weight: 500;
		}

		&::scroll-marker:focus {
			outline: 2px solid var(--accent);
			outline-offset: -1px;
		}

		&::scroll-marker:active {
			background-color: var(--background-primary);
		}

		> details {
			display: grid;
			padding: 1.5rem;
			border-radius: var(--border-radius-lg);
			border: 2px solid var(--accent);
			background-color: var(--background-primary);
			color: var(--text-primary);
			scroll-margin-top: 3.5rem;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
			transition:
				box-shadow 0.2s ease,
				transform 0.2s ease;

			&:hover {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				transform: translateY(-1px);
			}

			> summary {
				display: flex;
				justify-content: space-between;
				align-items: center;

				> header {
					flex-grow: 1;

					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 0.5rem;

					> div {
						display: grid;
						gap: 0.5rem;

						h3 {
							font-weight: 600;
						}
					}
				}
			}

			&::details-content {
				margin-top: 1.5rem;

				display: grid;
				gap: 1.5rem;
			}

			.subsection-caption {
				opacity: 0.8;
				color: var(--text-secondary);
			}

			.rating-display {
				display: grid;
				grid-template-columns: auto 1fr;
				gap: 1rem;
				font-weight: 500;
				padding: 1rem;
				background-color: color-mix(in srgb, var(--accent) 5%, var(--background-secondary));
				border-radius: var(--border-radius);
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

				@container (max-width: 400px) {
					grid-template-columns: 1fr;
					text-align: center;
				}

				&[data-rating='exempt'] {
					opacity: 0.7;
				}

				.rating-icon {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 1.5rem;
					height: 1.5rem;
					font-size: 1.2rem;
					color: var(--accent);
				}

				.rating-content > div {
					color: var(--text-secondary);
					display: grid;
					gap: 1em;
				}
			}

			.variant-caption {
				color: var(--text-secondary);
				font-style: italic;
				font-size: 0.9rem;
				opacity: 0.7;
			}

			.impact {
				color: var(--text-secondary);
				font-style: italic;
				opacity: 0.7;
			}
		}
	}

	.variant-controls {
		display: flex;
		align-items: center;
		font-size: 0.85rem;

		.variant-indicator {
			display: flex;
			align-items: center;
			gap: 0.5rem;

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

					:global(svg) {
						fill: currentColor;
					}
				}
			}
		}

		.variant-selector {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			border: none;
			padding: 0;
			margin: 0;
			flex-wrap: wrap;

			> legend {
				padding: 0;
				float: none;
				flex-shrink: 0;
			}
		}

		legend,
		small {
			color: var(--text-secondary);
			font-size: 0.8rem;

			.variant-buttons {
				display: flex;
				gap: 0.25rem;
				flex-wrap: wrap;

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
						transition:
							max-width 0.3s ease,
							opacity 0.2s ease;
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
			}
		}
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

	.methodology {
		display: grid;
		gap: 1.5rem;

		.simple-scale,
		.example-scale {
			padding: 1rem;
			background-color: var(--background-tertiary);
			border-radius: var(--border-radius);
			display: grid;
			gap: 1rem;

			> h5 {
				margin: 0;
				font-size: 1rem;
				font-weight: 600;
			}
		}

		.simple-scale {
			line-height: 1.5;
			color: var(--text-secondary);
		}

		.example-scale > ul {
			padding-inline-start: 1rem;
			display: grid;
			gap: 1rem;

			> li {
				padding-inline-start: 0.5rem;

				&::marker {
					content: attr(data-icon);
				}
			}
		}
	}

	.note {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		padding: 1rem;
		background-color: var(--background-secondary);
		border-radius: var(--border-radius);

		.icon {
			font-size: 1.2rem;
		}

		p:first-child {
			margin-top: 0;
		}
	}

	.supported-hardware-wallets {
		padding: 1rem;
		background-color: var(--background-secondary);
		border-radius: var(--border-radius);
		display: grid;
		gap: 0.5rem;

		h5 {
			margin: 0;
			font-size: 0.9rem;
			font-weight: 600;
		}

		.hw-wallet-list {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;

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
				box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

				&:hover {
					transform: translateY(-2px);
					box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				}
			}
		}
	}

	.attribute-accordions {
		display: grid;
		gap: 1rem;

		details {
			--details-transition-duration: 0.25s;
			--details-transform-closed: translateY(-4px);
			background-color: var(--background-secondary);
			border-radius: var(--border-radius);
			overflow: hidden;

			summary {
				cursor: pointer;
				padding: 1rem;
				transition: background-color 0.2s ease;
				border: 1px solid transparent;

				h4 {
					margin: 0;
					font-size: 1rem;
					font-weight: 600;
				}
			}

			section {
				display: grid;
				gap: 1rem;
				padding: 1rem;
				border-radius: var(--border-radius);
			}
		}
	}
</style>

