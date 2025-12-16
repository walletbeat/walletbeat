import type { Value } from '../schema/attributes'
import type { AccountRecoveryDetailsContent } from './content/account-recovery-details'
import type { AccountUnruggabilityDetailsContent } from './content/account-unruggability-details'
import type { AddressCorrelationDetailsContent } from './content/address-correlation-details'
import type { ChainVerificationDetailsContent } from './content/chain-verification-details'
import type { FundingDetailsContent } from './content/funding-details'
import type { PrivateTransfersDetailsContent } from './content/private-transfers-details'
import type { ScamAlertDetailsContent } from './content/scam-alert-details'
import type { SecurityAuditsDetailsContent } from './content/security-audits-details'
import type { TransactionInclusionDetailsContent } from './content/transaction-inclusion-details'
import type { UnratedAttributeContent } from './content/unrated-attribute'
import type { Strings as _Strings, ValidateText } from './utils/string-templates'
import { renderStrings, trimWhitespacePrefix } from './utils/text'

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
	| PrivateTransfersDetailsContent
	| ScamAlertDetailsContent
	| SecurityAuditsDetailsContent
	| TransactionInclusionDetailsContent
	| AccountRecoveryDetailsContent
	| AccountUnruggabilityDetailsContent
	| UnratedAttributeContent<Value>

/**
 * Text-based content that may be displayed on the UI.
 */
export type TextContent<Strings extends _Strings = null> = {
	contentType: ContentType.TEXT
	text: string
	strings?: Strings
}

/**
 * Markdown-based content that may be displayed on the UI.
 * Also includes a text property to make it compatible with TypographicContent interfaces.
 */
export type MarkdownContent<Strings extends _Strings = null> = {
	contentType: ContentType.MARKDOWN
	markdown: string
	strings?: Strings
}

/**
 * Custom-component-based content that may be displayed on the UI.
 */
export type CustomContent = {
	contentType: ContentType.COMPONENT
	component: ComponentAndProps
}

/** Type predicate for CustomContent. */
export function isCustomContent(content: unknown): content is CustomContent {
	if (typeof content !== 'object') {
		return false
	}

	if (content === null) {
		return false
	}

	if (!Object.hasOwn(content, 'component') || !Object.hasOwn(content, 'contentType')) {
		return false
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe as we just determined it has the right properties. We will check the `contentType` value just after this.
	const customContent = content as CustomContent

	if (customContent.contentType !== ContentType.COMPONENT) {
		return false
	}

	return true
}

/**
 * Typographic content that may be displayed on the UI.
 */
export type TypographicContent<Strings extends _Strings = null> =
	| TextContent<Strings>
	| MarkdownContent<Strings>

/**
 * Represents any type of content that may be displayed on the UI.
 */
export type Content<Strings extends _Strings = null> = TypographicContent<Strings> | CustomContent

/**
 * Type predicate for TypographicContent.
 * @param content The content to check.
 * @returns Whether `content` is of type `TypographicContent`.
 */
export function isTypographicContent<Strings extends _Strings = null>(
	content: Content<Strings>,
): content is TypographicContent<Strings> {
	return content.contentType === ContentType.TEXT || content.contentType === ContentType.MARKDOWN
}

/**
 * Upconvert content from one set of strings to a superset.
 */
export function typographicContentWithExtraOptionalStrings<
	BaseStrings extends _Strings,
	ExtendedStrings extends BaseStrings,
>(content: TypographicContent<BaseStrings>): TypographicContent<ExtendedStrings> {
	function isTypographicContentWithExtraOptionalStrings<
		BaseStrings extends _Strings,
		ExtendedStrings extends BaseStrings,
	>(_: TypographicContent<BaseStrings>): _ is TypographicContent<ExtendedStrings> {
		return true // Always true since ExtendedStrings extends BaseStrings.
	}

	if (!isTypographicContentWithExtraOptionalStrings<BaseStrings, ExtendedStrings>(content)) {
		throw new Error('Unreachable')
	}

	return content
}

/**
 * Pre-render typographic content such that it no longer requires any
 * template string.
 *
 * @param content TypographicContent to pre-render.
 * @param strings The strings to bake into it.
 * @returns A TypographicContent of the same type but with no template strings.
 */
export function prerenderTypographicContent<Strings extends _Strings = null>(
	content: TypographicContent<Strings>,
	strings: Strings,
): TypographicContent<null> {
	const bakedStrings = content.strings ?? {}

	switch (content.contentType) {
		case ContentType.TEXT:
			return textContent(renderStrings(content.text, { ...bakedStrings, ...strings }))
		case ContentType.MARKDOWN:
			return markdown(renderStrings(content.markdown, { ...bakedStrings, ...strings }))
	}
}

/**
 * Create text content with optional template variables
 */
function textContent<Strings extends _Strings, _Text extends string = string>(
	text: _Text,
	strings?: Strings,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Needed to enable type-level string validation.
	return {
		contentType: ContentType.TEXT,
		text: trimWhitespacePrefix(text),
		...(Boolean(strings) && { strings }),
	} as ValidateText<TextContent<Strings>, _Text, Strings>
}

export function markdown<Strings extends _Strings, _Text extends string = string>(
	markdownText: _Text,
	strings?: Strings,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Needed to enable type-level string validation.
	return {
		contentType: ContentType.MARKDOWN,
		markdown: trimWhitespacePrefix(markdownText),
		...(Boolean(strings) && { strings }),
	} as ValidateText<MarkdownContent<Strings>, _Text, Strings>
}

const sentenceMaxLength = 384

export type Sentence<Strings extends _Strings = null> = TypographicContent<Strings>

/** A single sentence. */
export function sentence<Strings extends _Strings, _Text extends string = string>(
	text: _Text,
	strings?: Strings,
) {
	if (text.length > sentenceMaxLength) {
		throw new Error(
			`Sentence text is too long (${text.length} characters is over the maximum length of ${sentenceMaxLength} characters): ${text}`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered sentence. */
export function mdSentence<Strings extends _Strings, _Text extends string = string>(
	text: _Text,
	strings?: Strings,
) {
	return markdown(text, strings)
}

const paragraphMaxLength = 1024

/** A short amount of text that fits in a single paragraph. */

export type Paragraph<Strings extends _Strings = null> = TextContent<Strings>

/** A renderable paragraph. */
export function paragraph<Strings extends _Strings, _Text extends string = string>(
	text: _Text,
	strings?: Strings,
) {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered paragraph. */
export function mdParagraph<Strings extends _Strings, _Text extends string = string>(
	text: _Text,
	strings?: Strings,
) {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}

	return markdown(text, strings)
}

/**
 * Custom content with a custom component type.
 */
export function component<
	C extends ComponentAndProps,
	B extends keyof C['componentProps'],
	// I extends Input & Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>> = Input &
	// 	Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>>,
>(componentName: C['component'], componentProps: Pick<C['componentProps'], B>): CustomContent {
	return {
		contentType: ContentType.COMPONENT,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- This is actually not safe; `componentProps` is actually only a `Partial` version here. This is meant to be merged later when rendering to make a complete `componentProps`.
		component: {
			component: componentName,
			componentProps,
		} as C,
	}
}
