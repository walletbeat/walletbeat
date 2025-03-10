import { ratedWallets, type WalletName } from '@/data/wallets'
import {
	type EvaluationTree,
	getEvaluationFromOtherTree,
	mapAttributeGroups,
	mapGroupAttributes,
} from '@/schema/attribute-groups'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyEntries,
	nonEmptyKeys,
	nonEmptyMap,
	nonEmptyValues,
} from '@/types/utils/non-empty'
import { Box, Typography, Paper, styled, Divider, Tooltip } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { WalletIcon } from '@/ui/atoms/WalletIcon'
import { AnchorHeader } from '@/ui/atoms/AnchorHeader'
import { WalletAttribute } from '@/ui/organisms/WalletAttribute'
import { blend, ThemeProvider } from '@mui/system'
import theme, { subsectionTheme } from '@/components/ThemeRegistry/theme'
import {
	type AttributeGroup,
	type EvaluatedAttribute,
	type EvaluatedGroup,
	Rating,
	ratingToColor,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import {
	navigationListIconSize,
	sectionIconWidth,
	subsectionBorderRadius,
	subsectionIconWidth,
} from '@/components/constants'
import type { NavigationItem } from '@/ui/organisms/Navigation'
import {
	navigationAbout,
	navigationFaq,
	navigationFarcasterChannel,
	navigationHome,
	navigationRepository,
	scrollPastHeaderPixels,
} from '@/components/navigation'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import { type PickableVariant, VariantPicker } from '@/ui/atoms/VariantPicker'
import { getSingleVariant, type Variant } from '@/schema/variants'
import {
	variantFromUrlQuery,
	variantToIcon,
	variantToName,
	variantToRunsOn,
	variantToTooltip,
	variantUrlQuery,
} from '@/components/variants'
import { VariantSpecificity, type ResolvedWallet } from '@/schema/wallet'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import { commaListPrefix, slugifyCamelCase } from '@/types/utils/text'
import { ReturnToTop } from '@/ui/organisms/ReturnToTop'

const headerHeight = 80
const headerBottomMargin = 24

const StyledHeader = styled(Paper)(({ theme }) => ({
	position: 'sticky',
	top: 40,
	zIndex: 1100,
	backgroundColor: theme.palette.background.paper,
	padding: theme.spacing(2),
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	gap: theme.spacing(2),
	height: headerHeight,
	marginBottom: `${headerBottomMargin}px`,
	borderRadius: '24px',
}))

const StyledSection = styled(Box)(({ theme }) => ({
	padding: theme.spacing(2),
	display: 'flex',
	flexDirection: 'column',
}))

const StyledSubsection = styled(Paper)(({ theme }) => ({
	padding: theme.spacing(3),
	display: 'flex',
	flexDirection: 'column',
	borderRadius: `${subsectionBorderRadius}px`,
	marginTop: '1rem',
	marginBottom: '1rem',
}))

interface Section {
	header: string
	subHeader: string | null
}

interface RichSection extends Section {
	icon: React.ReactNode
	title: string
	cornerControl: React.ReactNode | null
	caption: React.ReactNode | null
	body: React.ReactNode | null
	sx?: React.ComponentProps<typeof Paper>['sx']
	subsections?: RichSection[] // Only one level of nesting is supported.
}

function sectionHeaderId(section: Section): string {
	if (section.subHeader !== null) {
		return slugifyCamelCase(section.subHeader)
	}
	return slugifyCamelCase(section.header)
}

function maybeAddCornerControl(
	section: RichSection,
	anchorHeader: React.JSX.Element,
): React.JSX.Element {
	if (section.cornerControl === null) {
		return anchorHeader
	}
	return (
		<Box key="sectionCornerControl" display="flex" flexDirection="row">
			<Box flex="1" display="flex" flexDirection="column" justifyContent="center">
				{anchorHeader}
			</Box>
			<Box flex="0" flexDirection="column" justifyContent="center">
				{section.cornerControl}
			</Box>
		</Box>
	)
}

// Helper type for FAQ schema generation
interface FAQSchemaEntry {
	'@type': 'Question'
	name: string
	acceptedAnswer: {
		'@type': 'Answer'
		text: string
	}
}

// Function to generate FAQ structured data in LDJSON format
function generateFaqSchema(sections: RichSection[], walletName: string): string {
	// Extract questions and answers from sections
	const faqEntries: FAQSchemaEntry[] = []

	// Process all sections except the first one (details section)
	for (const section of sections.slice(1)) {
		// Only include sections with subsections
		if (section.subsections && section.subsections.length > 0) {
			// For each attribute in the section, create a FAQ entry
			for (const subsection of section.subsections) {
				// Safely check for caption and body
				if (subsection.caption !== null && subsection.body !== null) {
					try {
						// Get a reasonable question text
						const questionText = typeof subsection.title === 'string' && subsection.title !== ''
							? subsection.title
							: 'Feature question';

						// Get a reasonable answer text
						const answerText = `${walletName} supports this feature.`;

						// Add to FAQ entries
						faqEntries.push({
							'@type': 'Question',
							'name': questionText,
							'acceptedAnswer': {
								'@type': 'Answer',
								'text': answerText
							}
						});
					} catch (error) {
						// Error handling, silent in production
						if (process.env.NODE_ENV !== 'production') {
							// eslint-disable-next-line no-console
							console.error('Error creating FAQ entry:', error);
						}
					}
				}
			}
		}
	}

	// Create the complete FAQ schema
	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		'mainEntity': faqEntries
	}

	return JSON.stringify(faqSchema)
}

export function WalletPage({ walletName }: { walletName: WalletName }): React.JSX.Element {
	const wallet = ratedWallets[walletName]
	const { singleVariant } = getSingleVariant(wallet.variants)
	const [pickedVariant, setPickedVariant] = useState<Variant | null>(singleVariant)
	useEffect(() => {
		if (singleVariant !== null) {
			return
		}
		setPickedVariant(variantFromUrlQuery(wallet.variants))
	}, [singleVariant])
	const updatePickedVariant = (variant: Variant | null): void => {
		if (singleVariant !== null) {
			return // If there is a single variant, do not pollute the URL with it.
		}
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${variantUrlQuery(wallet.variants, variant)}${window.location.hash}`,
		)
		setPickedVariant(variant)
	}
	const evalTree: EvaluationTree =
		pickedVariant === null || wallet.variants[pickedVariant] === undefined
			? wallet.overall
			: wallet.variants[pickedVariant].attributes
	const attrToRelevantVariants = new Map<string, NonEmptyArray<Variant>>()
	let needsVariantFiltering = singleVariant === null
	for (const [variant, variantSpecificityMap] of nonEmptyEntries<
		Variant,
		Map<string, VariantSpecificity>
	>(wallet.variantSpecificity)) {
		for (const [evalAttrId, variantSpecificity] of variantSpecificityMap.entries()) {
			let relevantVariants: NonEmptyArray<Variant> | undefined = undefined
			switch (variantSpecificity) {
				case VariantSpecificity.ALL_SAME:
					break // Nothing.
				case VariantSpecificity.EXEMPT_FOR_THIS_VARIANT:
					break // Nothing.
				case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
					attrToRelevantVariants.set(evalAttrId, [variant])
					break
				default:
					needsVariantFiltering = true
					relevantVariants = attrToRelevantVariants.get(evalAttrId)
					if (relevantVariants === undefined) {
						attrToRelevantVariants.set(evalAttrId, [variant])
					} else {
						relevantVariants.push(variant)
					}
			}
		}
	}
	const headerVariants = nonEmptyMap(
		nonEmptyKeys(wallet.variants),
		(variant): PickableVariant<Variant> => ({
			id: variant,
			icon: variantToIcon(variant),
			tooltip: needsVariantFiltering
				? pickedVariant === variant
					? 'Remove version filter'
					: variantToTooltip(wallet.variants, variant)
				: `Runs on ${variantToName(variant, false)}`,
			click: needsVariantFiltering
				? () => {
					updatePickedVariant(pickedVariant === variant ? null : variant)
				}
				: undefined,
		}),
	)
	const sections: NonEmptyArray<RichSection> = [
		{
			header: 'details',
			subHeader: null,
			title: 'Details',
			cornerControl: null,
			caption: null,
			icon: '\u{2139}', // Info
			body: (
				<>
					<RenderTypographicContent
						content={wallet.metadata.blurb.render({})}
						typography={{ variant: 'body1' }}
					/>
					<Typography variant="body1">
						<React.Fragment key="begin">{wallet.metadata.displayName} runs </React.Fragment>
						{nonEmptyMap(nonEmptyKeys(wallet.variants), (variant, variantIndex) => (
							<React.Fragment key={variant}>
								{commaListPrefix(variantIndex, Object.keys(wallet.variants).length)}
								<strong>{variantToRunsOn(variant)}</strong>
							</React.Fragment>
						))}
						<React.Fragment key="afterVariants">.</React.Fragment>
						{needsVariantFiltering && (
							<React.Fragment key="variantSpecifier">
								<React.Fragment key="variantDisclaimer">
									{' '}
									The ratings below vary depending on the version.{' '}
								</React.Fragment>
								{pickedVariant === null ? (
									<React.Fragment key="variantReminder">
										Select a version to see version-specific ratings.
									</React.Fragment>
								) : (
									<React.Fragment key="variantReminder">
										You are currently viewing the ratings for the{' '}
										<strong>{variantToName(pickedVariant, false)}</strong> version.
									</React.Fragment>
								)}
							</React.Fragment>
						)}
					</Typography>
				</>
			),
		},
	]
	mapAttributeGroups(
		evalTree,
		<Vs extends ValueSet>(attrGroup: AttributeGroup<Vs>, evalGroup: EvaluatedGroup<Vs>) => {
			const section = {
				header: attrGroup.id,
				subHeader: null,
				title: attrGroup.displayName,
				icon: attrGroup.icon,
				cornerControl: null,
				caption: (
					<RenderTypographicContent
						content={attrGroup.perWalletQuestion.render(wallet.metadata)}
						typography={{
							variant: 'caption',
							fontStyle: 'italic',
						}}
					/>
				),
				body: null,
				subsections: mapGroupAttributes<RichSection | null, Vs>(
					evalGroup,
					<V extends Value>(evalAttr: EvaluatedAttribute<V>): RichSection | null => {
						if (evalAttr.evaluation.value.rating === Rating.EXEMPT) {
							return null
						}
						const relevantVariants: Variant[] =
							attrToRelevantVariants.get(evalAttr.attribute.id) ?? []
						const {
							cornerControl,
							body,
						}: {
							cornerControl: React.ReactNode
							body: React.ReactNode
						} = (() => {
							if (!needsVariantFiltering || relevantVariants.length === 0) {
								return {
									cornerControl: null,
									body: (
										<WalletAttribute
											wallet={wallet}
											attrGroup={attrGroup}
											evalGroup={evalGroup}
											evalAttr={evalAttr}
											displayedVariant={pickedVariant}
											variantSpecificity={VariantSpecificity.ALL_SAME}
										/>
									),
								}
							}
							if (relevantVariants.length === 1) {
								const VariantIcon = variantToIcon(relevantVariants[0])
								return {
									cornerControl: (
										<Tooltip
											title={`Only rated on the ${variantToName(relevantVariants[0], false)} version`}
											arrow={true}
										>
											<Box
												key="variantSpecificEval"
												display="flex"
												flexDirection="row"
												alignItems="center"
												gap="0.25rem"
											>
												<Typography variant="caption" sx={{ opacity: 0.7 }}>
													Only
												</Typography>
												<Typography
													variant="caption"
													sx={{
														opacity: 0.7,
														lineHeight: 1,
														color: blend(
															theme.palette.primary.light,
															ratingToColor(evalAttr.evaluation.value.rating),
															0.25,
															1,
														),
													}}
												>
													<VariantIcon />
												</Typography>
											</Box>
										</Tooltip>
									),
									body: (
										<WalletAttribute
											wallet={wallet}
											attrGroup={attrGroup}
											evalGroup={evalGroup}
											evalAttr={evalAttr}
											displayedVariant={relevantVariants[0]}
											variantSpecificity={VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT}
										/>
									),
								}
							}
							const pickerVariants = nonEmptyValues<Variant, ResolvedWallet>(
								wallet.variants,
							).filter(
								resolvedWallet =>
									resolvedWallet.variant === pickedVariant ||
									relevantVariants.includes(resolvedWallet.variant),
							)
							if (!isNonEmptyArray(pickerVariants)) {
								throw new Error(
									`Found no relevant variants to pick from in ${wallet.metadata.id} with picked variant ${pickedVariant}`,
								)
							}
							return {
								cornerControl: (
									<Box
										key="variantSpecificEval"
										display="flex"
										flexDirection="row"
										alignItems="center"
										gap="0.25rem"
									>
										<Typography variant="caption" sx={{ opacity: 0.7 }}>
											{pickedVariant === null ? 'Version' : 'Viewing'}:
										</Typography>
										<VariantPicker
											pickerId={`variantSpecificEval-${evalAttr.attribute.id}`}
											variants={nonEmptyMap(
												pickerVariants,
												(variantWallet: ResolvedWallet): PickableVariant<Variant> => {
													const variantRating = getEvaluationFromOtherTree<V>(
														evalAttr,
														variantWallet.attributes,
													).evaluation.value.rating
													return {
														id: variantWallet.variant,
														icon: variantToIcon(variantWallet.variant),
														colorTransform: (color: string | undefined): string =>
															blend(
																color ?? theme.palette.primary.light,
																ratingToColor(variantRating),
																0.25,
																1,
															),
														tooltip:
															pickedVariant !== null && pickedVariant === variantWallet.variant
																? 'Remove version filter'
																: `View rating for ${variantToName(variantWallet.variant, false)} version`,
														click: () => {
															updatePickedVariant(
																pickedVariant === variantWallet.variant
																	? null
																	: variantWallet.variant,
															)
														},
													}
												},
											)}
											pickedVariant={pickedVariant}
										/>
									</Box>
								),
								body: (
									<WalletAttribute
										wallet={wallet}
										attrGroup={attrGroup}
										evalGroup={evalGroup}
										evalAttr={evalAttr}
										displayedVariant={pickedVariant}
										variantSpecificity={VariantSpecificity.NOT_UNIVERSAL}
									/>
								),
							}
						})()
						return {
							header: attrGroup.id,
							subHeader: evalAttr.attribute.id,
							title: evalAttr.attribute.displayName,
							icon: evalAttr.evaluation.value.icon ?? evalAttr.attribute.icon,
							cornerControl,
							sx: {
								backgroundColor: blend(
									theme.palette.background.paper,
									ratingToColor(evalAttr.evaluation.value.rating),
									0.2,
									1,
								),
							},
							caption: (
								<RenderTypographicContent
									content={evalAttr.attribute.question.render(wallet.metadata)}
									typography={{
										variant: 'caption',
										fontStyle: 'italic',
									}}
								/>
							),
							body,
						}
					},
				).filter(subsection => subsection !== null),
			}
			if (section.subsections.length > 0) {
				sections.push(section)
			}
		},
	)
	const scrollMarginTop = `${headerHeight + headerBottomMargin + scrollPastHeaderPixels}px`

	return (
		<NavigationPageLayout
			groups={[
				{
					id: 'wallet-sections',
					items: [
						{
							id: sections[0].header,
							icon: (
								<WalletIcon
									walletMetadata={wallet.metadata}
									iconSize={navigationListIconSize * 0.75}
								/>
							),
							title: wallet.metadata.displayName,
							contentId: sectionHeaderId(sections[0]),
						},
						...sections.slice(1).map(
							(section): NavigationItem => ({
								id: sectionHeaderId(section),
								icon: section.icon,
								title: section.title,
								contentId: sectionHeaderId(section),
								children:
									section.subsections !== undefined && isNonEmptyArray(section.subsections)
										? nonEmptyMap(section.subsections, subsection => ({
											id: sectionHeaderId(subsection),
											icon: subsection.icon,
											title: subsection.title,
											contentId: sectionHeaderId(subsection),
										}))
										: undefined,
							}),
						),
					],
					overflow: true,
				},
				{
					id: 'rest-of-nav',
					items: [navigationFaq, navigationAbout, navigationRepository, navigationFarcasterChannel],
					overflow: false,
				},
			]}
			stickyHeaderId="walletHeader"
			stickyHeaderMargin={headerBottomMargin}
			contentDependencies={[wallet, pickedVariant]}
		>
			{/* Add structured data for FAQs */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: generateFaqSchema(sections, wallet.metadata.displayName) }}
			/>

			<ReturnToTop />
			<StyledHeader key="walletHeader" id="walletHeader">
				<Typography
					variant="h4"
					component="h1"
					display="flex"
					flexDirection="row"
					alignItems="center"
					gap="12px"
				>
					<WalletIcon
						key="walletIcon"
						walletMetadata={wallet.metadata}
						iconSize={navigationListIconSize * 2}
					/>
					{wallet.metadata.displayName}
				</Typography>
				<VariantPicker
					pickerId="variantPicker"
					variants={headerVariants}
					pickedVariant={pickedVariant}
				/>
			</StyledHeader>
			<div
				className="flex flex-col mt-10 gap-4"
			>
				<div key="walletPageBody" className="flex flex-row">
					<div key="walletPageContent" className="flex-1">
						<div key="topSpacer" style={{ height: headerBottomMargin }}></div>
						{nonEmptyMap(sections, (section, index) => (
							<React.Fragment key={sectionHeaderId(section)}>
								{index > 0 ? (
									<div
										key="sectionDivider"
										className="w-4/5 mx-auto mt-6 mb-6 border-b"
									/>
								) : null}
								<StyledSection key="sectionContainer" sx={section.sx}>
									{maybeAddCornerControl(
										section,
										<AnchorHeader
											key="sectionHeader"
											id={sectionHeaderId(section)}
											sx={{ scrollMarginTop }}
											variant="h4"
											component="h2"
											marginBottom="0"
											paddingLeft={theme.spacing(2)}
											paddingRight={theme.spacing(2)}
										>
											{section.icon} {section.title}
										</AnchorHeader>,
									)}
									{section.caption === null ? null : (
										<div
											key="sectionCaption"
											className="mb-4 opacity-80"
											style={{
												marginLeft: sectionIconWidth,
											}}
										>
											{section.caption}
										</div>
									)}
									{section.body === null ? null : (
										<Box
											key="sectionBody"
											paddingTop={theme.spacing(2)}
											paddingLeft={theme.spacing(2)}
											paddingRight={theme.spacing(2)}
										>
											{section.body}
										</Box>
									)}
									{section.subsections?.map(subsection => (
										<StyledSubsection key={sectionHeaderId(subsection)} sx={subsection.sx}>
											<ThemeProvider theme={subsectionTheme}>
												{maybeAddCornerControl(
													subsection,
													<AnchorHeader
														key="subsectionHeader"
														id={sectionHeaderId(subsection)}
														sx={{ scrollMarginTop }}
														variant="h3"
														marginBottom="0rem"
													>
														{subsection.icon} {subsection.title}
													</AnchorHeader>,
												)}
												{subsection.caption === null ? null : (
													<Box
														key="subsectionCaption"
														marginLeft={subsectionIconWidth}
														marginBottom="1rem"
														sx={{ opacity: 0.8 }}
													>
														{subsection.caption}
													</Box>
												)}
												{subsection.body === null ? null : (
													<Box key="subsectionBody">{subsection.body}</Box>
												)}
											</ThemeProvider>
										</StyledSubsection>
									))}
								</StyledSection>
							</React.Fragment>
						))}
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
