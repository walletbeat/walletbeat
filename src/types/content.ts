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
export type TextContent = {
	contentType: ContentType.TEXT
	text: string
}

/**
 * Markdown-based content that may be displayed on the UI.
 */
export type MarkdownContent = {
	contentType: ContentType.MARKDOWN
	markdown: string
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
export type TypographicContent = TextContent | MarkdownContent

/**
 * Represents any type of content that may be displayed on the UI.
 */
export type Content<I extends Input = {}> = TypographicContent | CustomContent

/**
 * Type predicate for TypographicContent.
 * @param content The content to check.
 * @returns Whether `content` is of type `TypographicContent`.
 */
export function isTypographicContent(content: Content): content is TypographicContent {
	return content.contentType === ContentType.TEXT || content.contentType === ContentType.MARKDOWN
}

/** An input template for rendering. */
type Input = object

function textContent(text: string): TextContent {
	return {
		contentType: ContentType.TEXT,
		text: trimWhitespacePrefix(text),
	}
}

export function markdown(markdown: string): MarkdownContent {
	return {
		contentType: ContentType.MARKDOWN,
		markdown: trimWhitespacePrefix(markdown),
	}
}

const sentenceMaxLength = 384

export type Sentence = TypographicContent

/** A single sentence. */
export function sentence(text: string): Sentence {
	if (text.length > sentenceMaxLength) {
		throw new Error(
			`Sentence text is too long (${text.length} characters is over the maximum length of ${sentenceMaxLength} characters).`,
		)
	}

	return textContent(text)
}

/** A renderable Markdown-rendered sentence. */
export function mdSentence(text: string) {
	return markdown(text)
}

const paragraphMaxLength = 1024

/** A short amount of text that fits in a single paragraph. */
export type Paragraph = TextContent

/** A renderable paragraph. */
export function paragraph(text: string): Paragraph {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}

	return textContent(text)
}

/** A renderable Markdown-rendered paragraph. */
export function mdParagraph(text: string): MarkdownContent {
	if (text.length > paragraphMaxLength)
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)

	return markdown(text)
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
		}
	}
}
