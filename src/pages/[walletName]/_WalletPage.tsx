import { ratedWallets, type WalletName } from '@/data/wallets'
import { ratedHardwareWallets, type HardwareWalletName } from '@/data/hardware-wallets'
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
import { Box, Typography, Paper, styled, Tooltip } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { WalletIcon } from '@/ui/atoms/WalletIcon'
import { AnchorHeader } from '@/ui/atoms/AnchorHeader'
import { WalletAttribute } from '@/ui/organisms/WalletAttribute'
import { blend, ThemeProvider } from '@mui/system'
import theme, { subsectionTheme } from '@/components/ThemeRegistry/theme'
import {
	type AttributeGroup,
	borderRatingToColor,
	type EvaluatedAttribute,
	type EvaluatedGroup,
	Rating,
	ratingToColor,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import { navigationListIconSize, subsectionBorderRadius } from '@/components/constants'
import type { NavigationItem } from '@/ui/organisms/Navigation'
import {
	navigationAbout,
	navigationFaq,
	navigationFarcasterChannel,
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
	variantUrlQuery,
} from '@/components/variants'
import { VariantSpecificity, type ResolvedWallet } from '@/schema/wallet'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import { commaListPrefix, slugifyCamelCase } from '@/types/utils/text'
import { ReturnToTop } from '@/ui/organisms/ReturnToTop'
import { WalletDropdown } from '@/ui/molecules/WalletDropdown'
import { ExternalLink } from '@/ui/atoms/ExternalLink'
import LanguageIcon from '@mui/icons-material/Language'
import GitHubIcon from '@mui/icons-material/GitHub'

const headerBottomMargin = 0

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
	margin: '0rem 1rem 1rem 1rem',
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
						const questionText =
							typeof subsection.title === 'string' && subsection.title !== ''
								? subsection.title
								: 'Feature question'

						// Get a reasonable answer text
						const answerText = `${walletName} supports this feature.`

						// Add to FAQ entries
						faqEntries.push({
							'@type': 'Question',
							name: questionText,
							acceptedAnswer: {
								'@type': 'Answer',
								text: answerText,
							},
						})
					} catch (error) {
						// Error handling, silent in production
						if (process.env.NODE_ENV !== 'production') {
							// eslint-disable-next-line no-console
							console.error('Error creating FAQ entry:', error)
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
		mainEntity: faqEntries,
	}

	return JSON.stringify(faqSchema)
}

export function WalletPage({
	walletName,
}: {
	walletName: WalletName | HardwareWalletName
}): React.JSX.Element {
	// Determine if this is a hardware wallet or regular wallet
	const isHardwareWallet = Object.keys(ratedHardwareWallets).includes(walletName)
	const wallet = isHardwareWallet
		? ratedHardwareWallets[walletName as HardwareWalletName]
		: ratedWallets[walletName as WalletName]
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
	const sections: NonEmptyArray<RichSection> = [
		{
			header: 'details',
			subHeader: null,
			title: '',
			cornerControl: null,
			caption: null,
			icon: null,
			body: (
				<div data-testid="wallet-blurb" className="break-words whitespace-normal">
					<div className="flex flex-row gap-2 mt-2 mb-[24px] items-center flex-wrap p-[2px]">
						{[
							<div className="flex flex-row gap-2 items-center" key="website">
								<LanguageIcon fontSize="small" sx={{ color: 'var(--text-primary)' }} />
								<ExternalLink
									url={wallet.metadata.url}
									defaultLabel={`${wallet.metadata.displayName} website`}
									style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}
								/>
							</div>,
							wallet.metadata.repoUrl !== null ? (
								<div className="flex flex-row gap-2 items-center" key="repo">
									<GitHubIcon fontSize="small" sx={{ color: 'var(--text-primary)' }} />
									<ExternalLink
										url={wallet.metadata.repoUrl}
										defaultLabel="GitHub Repository"
										style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}
									/>
								</div>
							) : undefined,
						]
							.filter(Boolean)
							.map(
								value =>
									value !== undefined && (
										<div
											key={value.key ?? 'hi'}
											className="bg-primary border px-2 py-1 rounded-md hover:bg-secondary"
										>
											{value}
										</div>
									),
							)}
					</div>
					<div className="break-words whitespace-normal">
						<RenderTypographicContent
							content={wallet.metadata.blurb.render({})}
							typography={{ variant: 'body1' }}
						/>
					</div>
					<Typography fontSize="0.9rem" marginTop="3rem">
						<React.Fragment key="begin">
							<span style={{ color: 'var(--accent)' }}>Platforms: </span>
						</React.Fragment>
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
				</div>
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
					<V extends Value>(
						evalAttr: EvaluatedAttribute<V>,
						attributeKey: keyof Vs,
					): RichSection | null => {
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
											attributeKey={String(attributeKey)}
											variantSpecificity={VariantSpecificity.ALL_SAME}
											displayedVariant={pickedVariant}
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
											attributeKey={String(attributeKey)}
											variantSpecificity={VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT}
											displayedVariant={relevantVariants[0]}
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
										attributeKey={String(attributeKey)}
										variantSpecificity={VariantSpecificity.NOT_UNIVERSAL}
										displayedVariant={pickedVariant}
									/>
								),
							}
						})()
						return {
							header: slugifyCamelCase(String(attributeKey)),
							subHeader: null,
							title: evalAttr.attribute.displayName,
							icon: evalAttr.attribute.icon,
							cornerControl,
							sx: {
								border: '2px solid',
								color: 'var(--text-primary)',
								borderColor: blend(
									theme.palette.background.paper,
									borderRatingToColor(evalAttr.evaluation.value.rating),
									1,
									1,
								),
								backgroundColor: 'transparent',
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
	const scrollMarginTop = `${headerBottomMargin + scrollPastHeaderPixels}px`

	const nonHeaderSections: RichSection[] = sections.slice(1)
	if (!isNonEmptyArray(nonHeaderSections)) {
		throw new Error('No non-header sections defined for navigation')
	}
	return (
		<NavigationPageLayout
			prefix={<WalletDropdown wallet={wallet} />}
			groups={[
				{
					id: 'wallet-sections',
					items: nonEmptyMap(
						nonHeaderSections,
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
					overflow: true,
				},
				{
					id: 'rest-of-nav',
					items: [navigationFaq, navigationAbout, navigationRepository, navigationFarcasterChannel],
					overflow: false,
				},
			]}
			stickyHeaderId="walletHeader"
			stickyHeaderMargin={0}
			contentDependencies={[wallet, pickedVariant]}
		>
			{/* Add structured data for FAQs */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: generateFaqSchema(sections, wallet.metadata.displayName),
				}}
			/>

			<ReturnToTop />
			<div className="max-w-screen-lg 3xl:max-w-screen-xl mx-auto w-full">
				<div className="flex flex-col lg:mt-10 mt-24 gap-4">
					<div className="flex flex-row">
						<div className="flex-1 min-w-0">
							<div style={{ height: headerBottomMargin }}></div>
							<div className="px-8">
								<Typography
									variant="h4"
									component="h1"
									display="flex"
									flexDirection="row"
									alignItems="center"
									gap="12px"
									sx={{
										fontSize: '2.25rem', // equivalent to text-4xl
										color: 'var(--text-primary)',
									}}
								>
									<WalletIcon
										key="walletIcon"
										wallet={wallet}
										iconSize={navigationListIconSize * 2}
									/>
									{wallet.metadata.displayName}
								</Typography>
							</div>
							{nonEmptyMap(sections, (section, index) => (
								<React.Fragment key={sectionHeaderId(section)}>
									{index > 0 ? (
										<div key="sectionDivider" className="w-4/5 mx-auto mt-6 mb-6 border-b" />
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
												fontSize="2rem"
												fontWeight="700"
												paddingLeft={theme.spacing(2)}
												paddingRight={theme.spacing(2)}
											>
												{section.title}
											</AnchorHeader>,
										)}
										{section.caption === null ? null : (
											<div
												key="sectionCaption"
												className="mb-4 opacity-80"
												style={{
													marginLeft: '16px',
												}}
											>
												{section.caption}
											</div>
										)}
										{section.body === null ? null : (
											<Box
												key="sectionBody"
												color="var(--text-primary)"
												// paddingTop={theme.spacing(2)}
												paddingLeft={theme.spacing(2)}
												paddingRight={theme.spacing(2)}
											>
												{section.body}
											</Box>
										)}
										{section.subsections?.map(subsection => (
											<div
												key={sectionHeaderId(subsection)}
												/*sx={subsection.sx}*/ className="flex flex-col p-6 mt-0 mr-4 mb-4 ml-4 rounded-md border"
												style={subsection.sx ?? ({} as unknown as object)}
											>
												<ThemeProvider theme={subsectionTheme}>
													{maybeAddCornerControl(
														subsection,
														<AnchorHeader
															key="subsectionHeader"
															id={sectionHeaderId(subsection)}
															sx={{ scrollMarginTop }}
															variant="h3"
															marginBottom=".3rem"
														>
															{subsection.title}
														</AnchorHeader>,
													)}
													{subsection.caption === null ? null : (
														<Box
															key="subsectionCaption"
															marginLeft="0"
															marginBottom="2rem"
															sx={{ opacity: 0.8 }}
														>
															{subsection.caption}
														</Box>
													)}
													{subsection.body === null ? null : (
														<Box key="subsectionBody">{subsection.body}</Box>
													)}
												</ThemeProvider>
											</div>
										))}
									</StyledSection>
								</React.Fragment>
							))}
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
