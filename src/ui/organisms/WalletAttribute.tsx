import { Typography } from '@mui/material'
import React from 'react'

import {
	type AttributeGroup,
	type EvaluatedAttribute,
	type EvaluatedGroup,
	Rating,
	type Value,
	type ValueSet,
} from '@/schema/attributes'
import { toFullyQualified } from '@/schema/reference'
import type { Variant } from '@/schema/variants'
import { type RatedWallet, VariantSpecificity, getAttributeOverride } from '@/schema/wallet'
import { type Sentence, isTypographicContent, sentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'
import { AttributeMethodology } from '@/ui/molecules/attributes/AttributeMethodology'

import { subsectionTheme } from '../../components/ThemeRegistry/theme'
import {
	subsectionBorderRadius,
	subsectionIconWidth,
	subsectionWeight,
} from '../../components/constants'
import { variantToName } from '../../components/variants'
import { type AccordionData, Accordions } from '../atoms/Accordions'
import { ReferenceLinks } from '../atoms/ReferenceLinks'
import { RenderCustomContent } from '../atoms/RenderCustomContent'
import { RenderTypographicContent } from '../atoms/RenderTypographicContent'
import { WrapIcon } from '../atoms/WrapIcon'
import { WrapRatingIcon } from '../atoms/WrapRatingIcon'

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
	const qualRefs = toFullyQualified(evalAttr.evaluation.references)
	const details = evalAttr.evaluation.details
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

	let rendered = (
		<>
			<React.Fragment key="details">
				{isTypographicContent(details) ? (
					<RenderTypographicContent
						content={details}
						strings={{
							WALLET_NAME: wallet.metadata.displayName,
						}}
						typography={{
							fontWeight: subsectionWeight,
						}}
					/>
				) : (
					<RenderCustomContent
						content={details}
						value={evalAttr.evaluation.value}
						wallet={wallet}
						references={qualRefs}
					/>
				)}
			</React.Fragment>
			<React.Fragment key="variantSpecific">{variantSpecificCaption}</React.Fragment>
			<React.Fragment key="impact">
				{evalAttr.evaluation.impact === undefined ? null : (
					<>
						<div style={{ height: '1rem' }}></div>
						<RenderTypographicContent
							content={evalAttr.evaluation.impact}
							strings={{
								WALLET_NAME: wallet.metadata.displayName,
							}}
							typography={{
								fontWeight: subsectionWeight,
							}}
						/>
					</>
				)}
			</React.Fragment>

			{/* Display references if available */}
			{qualRefs.length > 0 && (
				<div style={{ marginTop: '1rem' }}>
					<ReferenceLinks references={qualRefs} />
				</div>
			)}
		</>
	)

	if (isTypographicContent(details)) {
		rendered = <WrapRatingIcon rating={evalAttr.evaluation.value.rating}>{rendered}</WrapRatingIcon>
	}

	const accordions: NonEmptyArray<AccordionData> = [
		{
			id: `why-${evalAttr.attribute.id}`,
			summary: (
				<RenderTypographicContent<Sentence<null>>
					content={sentence(
						evalAttr.evaluation.value.rating === Rating.PASS ||
							evalAttr.evaluation.value.rating === Rating.UNRATED
							? 'Why does this matter?'
							: 'Why should I care?',
					)}
					typography={{ variant: 'h4' }}
				/>
			),
			contents: (
				<RenderTypographicContent
					content={evalAttr.attribute.why}
					typography={{ variant: 'body2' }}
				/>
			),
		},
		{
			id: `methodology-${evalAttr.attribute.id}`,
			summary: (
				<RenderTypographicContent<Sentence<null>>
					content={sentence(
						evalAttr.attribute.wording.midSentenceName === null
							? evalAttr.attribute.wording.howIsEvaluated
							: `How is ${evalAttr.attribute.wording.midSentenceName} evaluated?`,
					)}
					typography={{ variant: 'h4' }}
				/>
			),
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
			summary: (
				<RenderTypographicContent
					content={
						evalAttr.attribute.wording.midSentenceName === null
							? evalAttr.attribute.wording.whatCanWalletDoAboutIts
							: sentence<{ WALLET_NAME: string }>(
									`What can {{WALLET_NAME}} do about its ${evalAttr.attribute.wording.midSentenceName}?`,
								)
					}
					strings={{
						WALLET_NAME: wallet.metadata.displayName,
					}}
					typography={{ variant: 'h4' }}
				/>
			),
			contents: (
				<RenderTypographicContent
					content={howToImprove}
					strings={{
						WALLET_NAME: wallet.metadata.displayName,
						WALLET_PSEUDONYM_SINGULAR:
							wallet.metadata.pseudonymType === undefined
								? null
								: wallet.metadata.pseudonymType.singular,
						WALLET_PSEUDONYM_PLURAL:
							wallet.metadata.pseudonymType === undefined
								? null
								: wallet.metadata.pseudonymType.plural,
					}}
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
					<RenderTypographicContent
						content={override.note}
						strings={{
							WALLET_NAME: wallet.metadata.displayName,
						}}
					/>
				</WrapIcon>
			) : null}
			<Accordions
				accordions={accordions}
				borderRadius={`${subsectionBorderRadius}px`}
				interAccordionMargin="1rem"
			/>
		</>
	)
}
