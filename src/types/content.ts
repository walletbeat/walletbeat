import type { Value } from '../schema/attributes'
import type { AddressCorrelationDetailsContent } from './content/address-correlation-details'
import type { ChainVerificationDetailsContent } from './content/chain-verification-details'
import type { FundingDetailsContent } from './content/funding-details'
import type { LicenseDetailsContent } from './content/license-details'
import type { ScamAlertDetailsContent } from './content/scam-alert-details'
import type { SecurityAuditsDetailsContent } from './content/security-audits-details'
import type { SourceVisibilityDetailsContent } from './content/source-visibility-details'
import type { TransactionInclusionDetailsContent } from './content/transaction-inclusion-details'
import type { UnratedAttributeContent } from './content/unrated-attribute'
import type { Strings, ValidateText } from './utils/string-templates'
import { trimWhitespacePrefix } from './utils/text'

/**
 * Type of content that may be displayed on the UI.
 */
export enum ContentType {
	/** Plain text typographic content. */
	TEXT = 'TEXT',

	/** Markdown-based typographic content. */
	MARKDOWN = 'MARKDOWN',

	/** Arbitrary content using a custom component. */
	COMPONENT = 'COMPONENT',
}

/**
 * Set of custom-component-typed components that may be displayed on the UI.
 */
export type ComponentAndProps =
	| AddressCorrelationDetailsContent
	| ChainVerificationDetailsContent
	| FundingDetailsContent
	| LicenseDetailsContent
	| ScamAlertDetailsContent
	| SecurityAuditsDetailsContent
	| SourceVisibilityDetailsContent
	| TransactionInclusionDetailsContent
	| UnratedAttributeContent<Value>

/**
 * Text-based content that may be displayed on the UI.
 */
export type TextContent<Strings_ extends Strings = Strings> = {
	contentType: ContentType.TEXT
	text: string
	strings?: Strings_
}

/**
 * Markdown-based content that may be displayed on the UI.
 * Also includes a text property to make it compatible with TypographicContent interfaces.
 */
export type MarkdownContent<Strings_ extends Strings = Strings> = {
	contentType: ContentType.MARKDOWN
	markdown: string
	strings?: Strings_
}

/**
 * Custom-component-based content that may be displayed on the UI.
 */
export type CustomContent = {
	contentType: ContentType.COMPONENT
	component: ComponentAndProps
}

/**
 * Typographic content that may be displayed on the UI.
 */
export type TypographicContent<Strings_ extends Strings = Strings> = (
	| TextContent<Strings_>
	| MarkdownContent<Strings_>
)

/**
 * Represents any type of content that may be displayed on the UI.
 */
export type Content<Strings_ extends Strings = Strings> = (
	| TypographicContent<Strings_>
	| CustomContent
)

/**
 * Type predicate for TypographicContent.
 * @param content The content to check.
 * @returns Whether `content` is of type `TypographicContent`.
 */
export function isTypographicContent<Strings_ extends Strings>(content: Content): content is TypographicContent<Strings_> {
	return content.contentType === ContentType.TEXT || content.contentType === ContentType.MARKDOWN
}

/**
 * Create text content with optional template variables
 */
function textContent<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	text: _Text,
	strings?: Strings_,
) {
	return {
		contentType: ContentType.TEXT,
		text: trimWhitespacePrefix(text),
		...strings && { strings },
	} as ValidateText<TextContent<Strings_>, _Text, Strings_>
}

export function markdown<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	markdownText: _Text,
	strings?: Strings_,
) {
	return {
		contentType: ContentType.MARKDOWN,
		markdown: trimWhitespacePrefix(markdownText),
		...strings && { strings },
	} as ValidateText<MarkdownContent<Strings_>, _Text, Strings_>
}

const sentenceMaxLength = 384

export type Sentence<Strings_ extends Strings> = (
	TypographicContent<Strings_>
)

/** A single sentence. */
export function sentence<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	text: _Text,
	strings?: Strings_,
) {
	if (text.length > sentenceMaxLength) {
		throw new Error(
			`Sentence text is too long (${text.length} characters is over the maximum length of ${sentenceMaxLength} characters).`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered sentence. */
export function mdSentence<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	text: _Text,
	strings?: Strings_,
) {
	return markdown(text, strings)
}

const paragraphMaxLength = 1024

/** A short amount of text that fits in a single paragraph. */

export type Paragraph<Strings_ extends Strings> = (
	TextContent<Strings_>
)

/** A renderable paragraph. */
export function paragraph<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	text: _Text,
	strings?: Strings_,
) {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered paragraph. */
export function mdParagraph<
	Strings_ extends Strings,
	_Text extends string = string,
>(
	text: _Text,
	strings?: Strings_,
) {
	if (text.length > paragraphMaxLength)
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)

	return markdown(text, strings)
}

/**
 * Merge two objects that add up to a complete XY.
 */
function mergeProps<XY extends object, X extends keyof XY>(
	x: Pick<XY, X>,
	y: Pick<XY, Exclude<keyof XY, X>>,
): XY {
	/* eslint-disable eslint-comments/no-unlimited-disable -- The set of ESLint failures on this next block varies depending on some versions. */
	/* eslint-disable -- This is valid because xy is the union of two objects which add up to the set of keys in XY. */
	const xy: XY = { ...x, ...y } as XY
	/* eslint-enable */
	return xy
}

/**
 * Custom content with a custom component type.
 */
export function component<
	C extends ComponentAndProps,
	B extends keyof C['componentProps'],
// I extends Input & Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>> = Input &
// 	Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>>,
>(
	componentName: C['component'],
	componentProps: Pick<C['componentProps'], B>
): CustomContent {
	return {
		contentType: ContentType.COMPONENT,
		component: {
			component: componentName,
			componentProps,
			// componentProps: {
			// 	...mergeProps<C['componentProps'], B>(, input),
			// },
		} as C
	}
}
