import {
	Rating,
	type AttributeGroup,
	type EvaluatedAttribute,
	type EvaluatedGroup,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import { getAttributeOverride, VariantSpecificity, type RatedWallet } from '@/schema/wallet'
import { Box, Typography } from '@mui/material'
import React from 'react'
import { WrapIcon } from '../atoms/WrapIcon'
import {
	subsectionBorderRadius,
	subsectionIconWidth,
	subsectionWeight,
} from '../../components/constants'
import { type AccordionData, Accordions } from '../atoms/Accordions'
import type { NonEmptyArray } from '@/types/utils/non-empty'
import { WrapRatingIcon } from '../atoms/WrapRatingIcon'
import { AttributeMethodology } from '@/ui/molecules/attributes/AttributeMethodology'
import { subsectionTheme } from '../../components/ThemeRegistry/theme'
import type { Variant } from '@/schema/variants'
import { variantToName } from '../../components/variants'
import { RenderContent } from '../atoms/RenderContent'
import { RenderTypographicContent } from '../atoms/RenderTypographicContent'
import { isTypographicContent } from '@/types/content'
import { refs, toFullyQualified } from '@/schema/reference'
import { ReferenceLinks } from '../atoms/ReferenceLinks'

export function WalletAttribute<Vs extends ValueSet, V extends Value>({
	wallet,
	attrGroup,
	evalAttr,
	variantSpecificity,
	displayedVariant,
}: {
	wallet: RatedWallet
	attrGroup: AttributeGroup<Vs>
	evalGroup: EvaluatedGroup<Vs>
	evalAttr: EvaluatedAttribute<V>
} & (
	| {
			variantSpecificity:
				| VariantSpecificity.ALL_SAME
				| VariantSpecificity.NOT_UNIVERSAL
				| VariantSpecificity.UNIQUE_TO_VARIANT
			displayedVariant: Variant | null
	  }
	| {
			variantSpecificity: VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT
			displayedVariant: Variant
	  }
)): React.JSX.Element {
	const details = evalAttr.evaluation.details.render({
		wallet,
		value: evalAttr.evaluation.value,
	})
	const override = getAttributeOverride(wallet, attrGroup.id, evalAttr.attribute.id)
	const variantSpecificCaption: React.ReactNode = (() => {
		switch (variantSpecificity) {
			case VariantSpecificity.ALL_SAME:
				return null
			case VariantSpecificity.ONLY_ASSESSED_FOR_THIS_VARIANT:
				return (
					<Typography variant="caption" sx={{ opacity: 0.8 }}>
						This rating is only relevant for the {variantToName(displayedVariant, false)} version.
					</Typography>
				)
			default:
				return (
					<Typography variant="caption" sx={{ opacity: 0.8 }}>
						{displayedVariant === null
							? 'This rating differs across versions. Select a specific version for details.'
							: `This rating is specific to the ${variantToName(displayedVariant, false)} version.`}
					</Typography>
				)
		}
	})()

	// Extract references from the evaluation
	// First check for references at the evaluation level, then fall back to extracting from value
	const attributeReferences =
		evalAttr.evaluation.references ||
		(evalAttr.evaluation.value ? refs(evalAttr.evaluation.value) : [])

	// Add additional references for certain categories and attributes that may not have built-in references
	const addAdditionalReferences = () => {
		// If we already have references, use them
		if (attributeReferences.length > 0) {
			return attributeReferences
		}

		const category = attrGroup.id
		const attributeId = evalAttr.attribute.id

		// Only add references for specific categories
		if (
			category === 'privacy' ||
			category === 'selfSovereignty' ||
			category === 'transparency' ||
			category === 'ecosystem'
		) {
			console.log(`Adding references for ${category}/${attributeId}`)

			// For open source in transparency category
			if (attributeId === 'openSource' && wallet.metadata.repoUrl) {
				return [
					{
						urls: [
							{
								url: wallet.metadata.repoUrl,
								label: `${wallet.metadata.displayName} Repository`,
							},
						],
						explanation: `${wallet.metadata.displayName}'s source code repository`,
					},
				]
			}

			// For specific wallet examples
			if (wallet.metadata.id) {
				switch (wallet.metadata.id) {
					case 'rainbow':
						if (attributeId === 'openSource') {
							return [
								{
									urls: [
										{
											url: 'https://github.com/rainbow-me/rainbow/blob/develop/LICENSE',
											label: 'Rainbow License File',
										},
									],
									explanation: 'Rainbow uses the GPL-3.0 license for its source code',
								},
							]
						}
						break

					case 'frame':
						if (attributeId === 'selfHostedNode') {
							return [
								{
									urls: [
										{
											url: 'https://frame.sh/docs/getting-started/connecting-to-ethereum/',
											label: 'Frame node connection documentation',
										},
									],
									explanation: 'Frame allows connecting to your own Ethereum node',
								},
							]
						}
						break

					case 'metamask':
						if (attributeId === 'passkeyImplementation') {
							return [
								{
									urls: [
										{
											url: 'https://github.com/MetaMask/delegation-framework/tree/main/lib',
											label: 'MetaMask Delegation Framework',
										},
									],
									explanation: 'MetaMask uses Smooth Crypto lib for passkey verification',
								},
							]
						}
						break

					case 'rabby':
						if (attributeId === 'scamPrevention') {
							return [
								{
									urls: [
										{
											url: 'https://github.com/RabbyHub/rabby-security-engine',
											label: 'Rabby Security Engine',
										},
									],
									explanation: 'Rabby provides warnings about potential scam activities',
								},
							]
						}
						break
				}
			}
		}

		// Return original references if no additions were made
		return attributeReferences
	}

	// Get enhanced references
	const enhancedReferences = addAdditionalReferences()

	// Ensure references are properly qualified
	const qualifiedReferences =
		enhancedReferences.length > 0 ? toFullyQualified(enhancedReferences) : []

	// Add debug logging
	console.log(
		`WalletAttribute references for ${attrGroup.id}/${evalAttr.attribute.id}:`,
		JSON.stringify(
			{
				category: attrGroup.id,
				attributeId: evalAttr.attribute.id,
				wallet: wallet.metadata.id,
				originalReferencesCount: attributeReferences.length,
				enhancedReferencesCount: enhancedReferences.length,
				qualifiedReferencesCount: qualifiedReferences.length,
			},
			null,
			2,
		),
	)

	let rendered = (
		<>
			<React.Fragment key="details">
				<RenderContent
					content={details}
					typography={{
						fontWeight: subsectionWeight,
					}}
				/>
			</React.Fragment>
			<React.Fragment key="variantSpecific">{variantSpecificCaption}</React.Fragment>
			<React.Fragment key="impact">
				{evalAttr.evaluation.impact === undefined ? null : (
					<>
						<Box height="1rem"></Box>
						<RenderTypographicContent
							content={evalAttr.evaluation.impact.render({
								wallet,
								value: evalAttr.evaluation.value,
							})}
							typography={{
								fontWeight: subsectionWeight,
							}}
						/>
					</>
				)}
			</React.Fragment>

			{/* Display references if available */}
			{qualifiedReferences.length > 0 && (
				<Box sx={{ mt: 2 }}>
					<ReferenceLinks references={qualifiedReferences} />
				</Box>
			)}
		</>
	)
	if (isTypographicContent(details)) {
		rendered = <WrapRatingIcon rating={evalAttr.evaluation.value.rating}>{rendered}</WrapRatingIcon>
	}
	const accordions: NonEmptyArray<AccordionData> = [
		{
			id: `why-${evalAttr.attribute.id}`,
			summary:
				evalAttr.evaluation.value.rating === Rating.PASS ||
				evalAttr.evaluation.value.rating === Rating.UNRATED
					? 'Why does this matter?'
					: 'Why should I care?',
			contents: (
				<RenderContent
					content={evalAttr.attribute.why.render({})}
					typography={{ variant: 'body2' }}
				/>
			),
		},
		{
			id: `methodology-${evalAttr.attribute.id}`,
			summary:
				evalAttr.attribute.wording.midSentenceName === null
					? evalAttr.attribute.wording.howIsEvaluated
					: `How is ${evalAttr.attribute.wording.midSentenceName} evaluated?`,
			contents: (
				<AttributeMethodology attribute={evalAttr.attribute} evaluation={evalAttr.evaluation} />
			),
		},
	]
	const howToImprove =
		override?.howToImprove !== undefined ? override.howToImprove : evalAttr.evaluation.howToImprove
	if (howToImprove !== undefined) {
		accordions.push({
			id: `how-${evalAttr.attribute.id}`,
			summary:
				evalAttr.attribute.wording.midSentenceName === null
					? evalAttr.attribute.wording.whatCanWalletDoAboutIts(wallet.metadata)
					: `What can ${wallet.metadata.displayName} do about its ${evalAttr.attribute.wording.midSentenceName}?`,
			contents: (
				<RenderTypographicContent
					content={howToImprove.render({ wallet, value: evalAttr.evaluation.value })}
					typography={{ variant: 'body2' }}
				/>
			),
		})
	}
	return (
		<>
			{rendered}
			{override?.note !== undefined ? (
				<WrapIcon
					icon={'\u{1f449}'}
					iconFontSize={subsectionTheme.typography.body1.fontSize}
					iconWidth={subsectionIconWidth}
					sx={{ marginTop: '1rem' }}
				>
					<RenderContent content={override.note.render({ wallet })} />
				</WrapIcon>
			) : null}
			<Accordions
				accordions={accordions}
				borderRadius={`${subsectionBorderRadius}px`}
				summaryTypographyVariant="h4"
				interAccordionMargin="1rem"
			/>
		</>
	)
}
