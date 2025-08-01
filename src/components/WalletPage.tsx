import { Tooltip, Typography } from '@mui/material'
import { blend, ThemeProvider } from '@mui/system'
import React, { useEffect, useState } from 'react'

import { navigationListIconSize } from '@/components/constants'
import { scrollPastHeaderPixels } from '@/components/navigation'
import theme, { subsectionTheme } from '@/components/ThemeRegistry/theme'
import {
	variantFromUrlQuery,
	variantToIcon,
	variantToName,
	variantUrlQuery,
} from '@/components/variants'
import { allRatedWallets, type WalletName } from '@/data/wallets'
import { NavigationPageLayout } from '@/layouts/NavigationPageLayout'
import {
	type EvaluationTree,
	getEvaluationFromOtherTree,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { borderRatingToColor, ratingToColor } from '@/schema/attributes'
import { getSingleVariant, type Variant } from '@/schema/variants'
import { type ResolvedWallet, VariantSpecificity } from '@/schema/wallet'
import type { Sentence } from '@/types/content'
import {
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyEntries,
	nonEmptyMap,
	nonEmptyValues,
} from '@/types/utils/non-empty'
import { slugifyCamelCase } from '@/types/utils/text'
import { AnchorHeader } from '@/ui/atoms/AnchorHeader'
import { RenderTypographicContent } from '@/ui/atoms/RenderTypographicContent'
import { ReturnToTop } from '@/ui/atoms/ReturnToTop'
import { type PickableVariant, VariantPicker } from '@/ui/atoms/VariantPicker'
import { WalletIcon } from '@/ui/atoms/WalletIcon'
import { AttributeGroupBody } from '@/ui/molecules/AttributeGroupBody'
import { WalletHeading } from '@/ui/molecules/wallet/heading/WalletHeading'
import { WalletDropdown } from '@/ui/molecules/WalletDropdown'
import type { NavigationItem } from '@/ui/organisms/Navigation'
import { WalletAttribute } from '@/ui/organisms/WalletAttribute'

import { WalletSectionSummary } from './WalletSectionSummary'

const headerBottomMargin = 0

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
	css?: React.CSSProperties
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
		<div key='sectionCornerControl' className='flex flex-row'>
			<div className='flex flex-col justify-center flex-1'>{anchorHeader}</div>
			<div className='flex flex-col justify-center flex-initial'>{section.cornerControl}</div>
		</div>
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
function generateFaqSchema(sections: RichSection[], _walletName: string): string {
	// Extract questions and answers from sections
	const faqEntries: FAQSchemaEntry[] = []

	// Process all sections except the first one (details section)
	for (const section of sections.slice(1)) {
		// Only include sections with subsections
		if (section.subsections !== undefined && section.subsections.length > 0) {
			// For each attribute in the section, create a FAQ entry
			for (const subsection of section.subsections) {
				// Safely check for caption and body
				if (subsection.caption !== null && subsection.body !== null) {
					// Get a reasonable question text
					const questionText =
						typeof subsection.title === 'string' && subsection.title !== ''
							? subsection.title
							: 'Feature question'

					// Get a reasonable answer text
					const answerText = '{{WALLET_NAME}} supports this feature.'

					// Add to FAQ entries
					faqEntries.push({
						'@type': 'Question',
						name: questionText,
						acceptedAnswer: {
							'@type': 'Answer',
							text: answerText,
						},
					})
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

export function WalletPage({ walletName }: { walletName: WalletName }): React.JSX.Element {
	const wallet = allRatedWallets[walletName]
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
				<WalletHeading
					wallet={wallet}
					pickedVariant={pickedVariant}
					singleVariant={singleVariant}
				/>
			),
		},
	]

	mapNonExemptAttributeGroupsInTree(evalTree, (attrGroup, evalGroup) => {
		const section = {
			header: attrGroup.id,
			subHeader: null,
			title: attrGroup.displayName,
			icon: attrGroup.icon,
			cornerControl: <WalletSectionSummary wallet={wallet} attrGroup={attrGroup} />,
			caption: (
				<RenderTypographicContent
					content={attrGroup.perWalletQuestion}
					strings={{ WALLET_NAME: wallet.metadata.displayName }}
					typography={{
						variant: 'caption',
						fontStyle: 'italic',
					}}
				/>
			),
			body: <AttributeGroupBody wallet={wallet} attrGroup={attrGroup} />,
			subsections: mapNonExemptGroupAttributes(evalGroup, (evalAttr): RichSection | null => {
				const relevantVariants: Variant[] = attrToRelevantVariants.get(evalAttr.attribute.id) ?? []
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
									<div key='variantSpecificEval' className='flex flex-row items-center gap-2'>
										<Typography variant='caption' sx={{ opacity: 0.7 }}>
											Only
										</Typography>
										<Typography
											variant='caption'
											sx={{
												opacity: 0.7,
												lineHeight: 1,
												color: theme.palette.primary.light,
											}}
										>
											<VariantIcon />
										</Typography>
									</div>
								</Tooltip>
							),
							body: (
								<WalletAttribute
									wallet={wallet}
									attrGroup={attrGroup}
									evalGroup={evalGroup}
									evalAttr={evalAttr}
									variantSpecificity={VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT}
									displayedVariant={relevantVariants[0]}
								/>
							),
						}
					}

					const pickerVariants = nonEmptyValues<Variant, ResolvedWallet>(wallet.variants).filter(
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
							<div key='variantSpecificEval' className='flex flex-row items-center gap-2'>
								<Typography variant='caption' sx={{ opacity: 0.7 }}>
									{pickedVariant === null ? 'Version' : 'Viewing'}:
								</Typography>
								<VariantPicker
									pickerId={`variantSpecificEval-${evalAttr.attribute.id}`}
									variants={nonEmptyMap(
										pickerVariants,
										(variantWallet: ResolvedWallet): PickableVariant<Variant> => {
											const variantRating = getEvaluationFromOtherTree(
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
														pickedVariant === variantWallet.variant ? null : variantWallet.variant,
													)
												},
											}
										},
									)}
									pickedVariant={pickedVariant}
								/>
							</div>
						),
						body: (
							<WalletAttribute
								wallet={wallet}
								attrGroup={attrGroup}
								evalGroup={evalGroup}
								evalAttr={evalAttr}
								variantSpecificity={VariantSpecificity.NOT_UNIVERSAL}
								displayedVariant={pickedVariant}
							/>
						),
					}
				})()

				return {
					header: slugifyCamelCase(attrGroup.id),
					subHeader: slugifyCamelCase(evalAttr.attribute.id),
					title: evalAttr.attribute.displayName,
					icon: evalAttr.attribute.icon,
					cornerControl,
					css: {
						border: '2px solid',
						color: 'var(--text-primary)',
						borderColor: blend(
							theme.palette.background.paper,
							borderRatingToColor(evalAttr.evaluation.value.rating),
							1,
							1,
						),
						backgroundColor: 'var(--background-primary)',
					},
					caption: (
						<RenderTypographicContent<Sentence<{ WALLET_NAME: string }>>
							content={evalAttr.attribute.question}
							strings={{
								WALLET_NAME: wallet.metadata.displayName,
							}}
							typography={{
								variant: 'caption',
								fontStyle: 'italic',
							}}
						/>
					),
					body,
				}
			}).filter(subsection => subsection !== null),
		}

		if (section.subsections.length > 0) {
			sections.push(section)
		}
	})
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
				// {
				// 	id: 'rest-of-nav',
				// 	items: [navigationFaq, navigationAbout, navigationRepository, navigationFarcasterChannel],
				// 	overflow: false,
				// },
			]}
			stickyHeaderId='walletHeader'
			stickyHeaderMargin={0}
			contentDependencies={[wallet, pickedVariant]}
		>
			{/* Add structured data for FAQs */}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: generateFaqSchema(sections, wallet.metadata.displayName),
				}}
			/>

			<ReturnToTop />
			<div className='max-w-screen-lg 3xl:max-w-screen-xl mx-auto w-full'>
				<div className='flex flex-col lg:mt-10 gap-4'>
					<div className='flex flex-row'>
						<div className='flex-1 min-w-0'>
							<div style={{ height: headerBottomMargin }}></div>
							<div className='px-8'>
								<Typography
									variant='h4'
									component='h1'
									display='flex'
									flexDirection='row'
									alignItems='center'
									gap='12px'
									sx={{
										fontSize: '2.25rem', // equivalent to text-4xl
										color: 'var(--text-primary)',
									}}
								>
									<WalletIcon
										key='walletIcon'
										wallet={wallet}
										iconSize={navigationListIconSize * 2}
									/>
									{wallet.metadata.displayName}
								</Typography>
							</div>
							{nonEmptyMap(sections, (section, index) => (
								<React.Fragment key={sectionHeaderId(section)}>
									{index > 0 ? (
										<div key='sectionDivider' className='w-4/5 mx-auto mt-6 mb-6 border-b' />
									) : null}
									<div
										key='sectionContainer'
										className='p-4 flex flex-col gap-4'
										style={section.css}
									>
										<div key='sectionCornerControl' className='flex flex-row'>
											<div className='flex flex-col justify-center flex-1'>
												<AnchorHeader
													key='sectionHeader'
													id={sectionHeaderId(section)}
													sx={{ scrollMarginTop }}
													variant='h4'
													component='h2'
													marginBottom='0'
													fontSize='2rem'
													fontWeight='700'
													paddingLeft={theme.spacing(2)}
													paddingRight={theme.spacing(2)}
												>
													{section.title}
												</AnchorHeader>
											</div>
											<div className='flex flex-col justify-center flex-initial mr-4'>
												{section.cornerControl}
											</div>
										</div>
										{section.caption === null ? null : (
											<div
												key='sectionCaption'
												className='mb-4 opacity-80'
												style={{
													marginLeft: '16px',
												}}
											>
												{section.caption}
											</div>
										)}
										{section.body === null ? null : (
											<div
												key='sectionBody'
												className='text-primary px-4'
												// paddingTop={theme.spacing(2)}
											>
												{section.body}
											</div>
										)}
										{section.subsections?.map(subsection => (
											<div
												key={sectionHeaderId(subsection)}
												className='flex flex-col p-6 mt-0 mr-4 mb-4 ml-4 rounded-md border'
												style={subsection.css}
											>
												<ThemeProvider theme={subsectionTheme}>
													{maybeAddCornerControl(
														subsection,
														<AnchorHeader
															key='subsectionHeader'
															id={sectionHeaderId(subsection)}
															sx={{ scrollMarginTop }}
															variant='h3'
															marginBottom='.3rem'
														>
															{subsection.title}
														</AnchorHeader>,
													)}
													{subsection.caption === null ? null : (
														<div key='subsectionCaption' className='mb-8 opacity-80'>
															{subsection.caption}
														</div>
													)}
													{subsection.body === null ? null : (
														<div key='subsectionBody'>{subsection.body}</div>
													)}
												</ThemeProvider>
											</div>
										))}
									</div>
								</React.Fragment>
							))}
						</div>
					</div>
				</div>
			</div>
		</NavigationPageLayout>
	)
}
