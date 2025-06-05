import { Divider, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import React from 'react'

import {
	type Attribute,
	type Evaluation,
	type ExampleRating,
	Rating,
	type Value,
	ratingToIcon,
} from '@/schema/attributes'
import { type Sentence, mdSentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import { RenderTypographicContent } from '../../atoms/RenderTypographicContent'

const typographyPropsHeader: React.ComponentProps<typeof RenderTypographicContent>['typography'] = {
	variant: 'h6',
}

const typographyPropsBody: React.ComponentProps<typeof RenderTypographicContent>['typography'] = {
	variant: 'body2',
}

interface ListItemProps {
	isFirstItem: boolean
	bulletText: string
	bulletFontSize?: string
	spaceBetweenItems?: string
}

export const StyledListItem = styled('li')<ListItemProps>`
  margin-top: ${props => (props.isFirstItem ? '0px' : (props.spaceBetweenItems ?? '0.75rem'))};
  padding-bottom: 0.5rem;
  &::marker {
    content: '${props => props.bulletText}  ';
    font-size: ${props => props.bulletFontSize ?? 'inherit'};
    padding-right: 0.5rem;
  }
`

function replaceExampleRatingPrefix(
	theWallet: string,
	theWalletPossessive: string,
): (text: string) => string {
	return (text: string): string => {
		const whitespacePrefixLength = text.length - text.trimStart().length
		const whitespacePrefix =
			whitespacePrefixLength === 0 ? '' : text.substring(0, whitespacePrefixLength)
		const unprefixedText =
			whitespacePrefixLength === 0 ? text : text.substring(whitespacePrefix.length)

		// Accept "The wallet" as before
		if (unprefixedText.startsWith('The wallet ')) {
			return `${whitespacePrefix}${theWallet}${unprefixedText.substring('The wallet '.length)}`
		}

		// Accept "The wallet's" as before
		if (unprefixedText.startsWith("The wallet's ")) {
			return `${whitespacePrefix}${theWalletPossessive}${unprefixedText.substring("The wallet's ".length)}`
		}

		// Accept "The hardware wallet"
		if (unprefixedText.startsWith('The hardware wallet ')) {
			return `${whitespacePrefix}${theWallet}${unprefixedText.substring('The hardware wallet '.length)}`
		}

		// Accept "The hardware wallet's"
		if (unprefixedText.startsWith("The hardware wallet's ")) {
			return `${whitespacePrefix}${theWalletPossessive}${unprefixedText.substring("The hardware wallet's ".length)}`
		}

		// Accept "The smart wallet"
		if (unprefixedText.startsWith('The smart wallet ')) {
			return `${whitespacePrefix}${theWallet}${unprefixedText.substring('The smart wallet '.length)}`
		}

		// Accept "The smart wallet's"
		if (unprefixedText.startsWith("The smart wallet's ")) {
			return `${whitespacePrefix}${theWalletPossessive}${unprefixedText.substring("The smart wallet's ".length)}`
		}

		// More general approach to handle any wallet type
		const walletTypeRegex = /^The\s+([a-zA-Z]+\s+)?wallet\s+/
		const possessiveWalletTypeRegex = /^The\s+([a-zA-Z]+\s+)?wallet's\s+/

		const walletTypeMatch = walletTypeRegex.exec(unprefixedText)

		if (walletTypeMatch !== null) {
			return `${whitespacePrefix}${theWallet}${unprefixedText.substring(walletTypeMatch[0].length)}`
		}

		const possessiveWalletTypeMatch = possessiveWalletTypeRegex.exec(unprefixedText)

		if (possessiveWalletTypeMatch !== null) {
			return `${whitespacePrefix}${theWalletPossessive}${unprefixedText.substring(possessiveWalletTypeMatch[0].length)}`
		}

		throw new Error(
			`Example ratings should ideally begin with the phrase "The wallet" or "The [type] wallet". Using original text: "${unprefixedText}"`,
		)
	}
}

function ExampleRatings<V extends Value>({
	displayOrder,
	passExamples,
	partialExamples,
	failExamples,
	exhaustive,
}: {
	displayOrder: 'pass-fail' | 'fail-pass'
	passExamples: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>
	partialExamples: ExampleRating<V> | Array<ExampleRating<V>> | undefined
	failExamples: ExampleRating<V> | NonEmptyArray<ExampleRating<V>>
	exhaustive: boolean
}): React.JSX.Element {
	const renderListItem = (
		exampleRating: ExampleRating<V>,
		index: number,
		rating: Rating,
	): React.JSX.Element => (
		// Safe to use index as key here because example ratings are static and
		// never change order within the same rating.
		<StyledListItem
			key={`example-${index}`}
			bulletText={ratingToIcon(rating)}
			bulletFontSize="75%"
			isFirstItem={index === 0}
			spaceBetweenItems="0.75rem"
		>
			<RenderTypographicContent
				content={exampleRating.description}
				typography={typographyPropsBody}
				textTransform={replaceExampleRatingPrefix('It ', 'Its ')}
			/>
		</StyledListItem>
	)
	const renderExamples = (
		rating: Rating,
		singularPreamble: Sentence,
		pluralPreamble: Sentence,
		exampleRatings: ExampleRating<V> | Array<ExampleRating<V>> | undefined,
	): { key: string; element: React.JSX.Element | null } => {
		const ratingsList: Array<ExampleRating<V>> =
			exampleRatings === undefined
				? []
				: Array.isArray(exampleRatings)
					? exampleRatings
					: [exampleRatings]

		if (ratingsList.length === 0) {
			return { key: rating, element: null }
		}

		const preamble = ratingsList.length === 1 ? singularPreamble : pluralPreamble

		return {
			key: rating,
			element: (
				<React.Fragment>
					<RenderTypographicContent content={preamble} typography={typographyPropsHeader} />
					<ul style={{ paddingLeft: '2rem' }}>
						{ratingsList.map((exampleRating, index) =>
							renderListItem(exampleRating, index, rating),
						)}
					</ul>
				</React.Fragment>
			),
		}
	}
	const passRendered = renderExamples(
		Rating.PASS,
		mdSentence('A wallet would get a **passing** rating if...'),
		mdSentence('A wallet would get a **passing** rating in any of these cases:'),
		passExamples,
	)
	const partialRendered = renderExamples(
		Rating.PARTIAL,
		mdSentence('A wallet would get a **partial** rating if...'),
		mdSentence('A wallet would get a **partial** rating in any of these cases:'),
		partialExamples,
	)
	const failRendered = renderExamples(
		Rating.FAIL,
		mdSentence('A wallet would get a **failing** rating if...'),
		mdSentence('A wallet would get a **failing** rating in any of these cases:'),
		failExamples,
	)
	const renderedExamples: Array<{
		key: string
		element: React.JSX.Element | null
	}> = (() => {
		switch (displayOrder) {
			case 'pass-fail':
				return [passRendered, partialRendered, failRendered]
			case 'fail-pass':
				return [failRendered, partialRendered, passRendered]
		}
	})()

	return (
		<>
			<Typography variant="h5">{exhaustive ? '' : 'A few examples'}</Typography>
			<div>
				{renderedExamples.map(renderedExample =>
					renderedExample.element === null ? null : (
						<div key={renderedExample.key}>{renderedExample.element}</div>
					),
				)}
			</div>
		</>
	)
}

/**
 * Explain how an attribute is evaluated.
 * This is a wallet-agnostic, attribute-specific description.
 * However, it can optionally take in an `Evaluation`, which is used to match
 * a wallet's evaluation against one of the example evaluations of the
 * attribute and highlight this example.
 */
export function AttributeMethodology<V extends Value>({
	attribute,
}: {
	attribute: Attribute<V>
	evaluation?: Evaluation<V>
}): React.JSX.Element {
	return (
		<>
			<div key="methodology">
				<RenderTypographicContent
					content={attribute.methodology}
					typography={typographyPropsBody}
				/>
			</div>
			<Divider
				key="after-methodology"
				sx={{
					marginTop: '1rem',
					marginBottom: '1rem',
				}}
			/>
			<div key="example-ratings">
				{attribute.ratingScale.display === 'simple' ? (
					<RenderTypographicContent
						content={attribute.ratingScale.content}
						typography={typographyPropsBody}
					/>
				) : (
					<ExampleRatings
						displayOrder={attribute.ratingScale.display}
						passExamples={attribute.ratingScale.pass}
						partialExamples={attribute.ratingScale.partial}
						failExamples={attribute.ratingScale.fail}
						exhaustive={attribute.ratingScale.exhaustive}
					/>
				)}
			</div>
		</>
	)
}
