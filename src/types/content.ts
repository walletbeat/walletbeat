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
import type { Strings, StringsFromTemplate, ValidateText } from './utils/string-templates'
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
export type TextContent<_Strings extends Strings = null> = {
	contentType: ContentType.TEXT
	text: string
	strings?: _Strings
}

/**
 * Markdown-based content that may be displayed on the UI.
 * Also includes a text property to make it compatible with TypographicContent interfaces.
 */
export type MarkdownContent<_Strings extends Strings = null> = {
	contentType: ContentType.MARKDOWN
	markdown: string
	strings?: _Strings
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
export type TypographicContent<_Strings extends Strings = null> =
	| TextContent<_Strings>
	| MarkdownContent<_Strings>

/**
 * Represents any type of content that may be displayed on the UI.
 */
export type Content<_Strings extends Strings = null> = TypographicContent<_Strings> | CustomContent

/**
 * Type predicate for TypographicContent.
 * @param content The content to check.
 * @returns Whether `content` is of type `TypographicContent`.
 */
export function isTypographicContent<_Strings extends Strings = null>(
	content: Content<_Strings>,
): content is TypographicContent<_Strings> {
	return content.contentType === ContentType.TEXT || content.contentType === ContentType.MARKDOWN
}

/**
 * Upconvert content from one set of strings to a superset.
 */
export function typographicContentWithExtraOptionalStrings<
	_Strings extends Strings,
	_MoreStrings extends _Strings,
>(content: TypographicContent<_Strings>): TypographicContent<_MoreStrings> {
	function isTypographicContentWithExtraOptionalStrings<
		_Strings extends Strings,
		_MoreStrings extends _Strings,
	>(_: TypographicContent<_Strings>): _ is TypographicContent<_MoreStrings> {
		return true // Always true since ExtendedStrings extends BaseStrings.
	}

	if (!isTypographicContentWithExtraOptionalStrings<_Strings, _MoreStrings>(content)) {
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
export function prerenderTypographicContent<_Strings extends Strings = null>(
	content: TypographicContent<_Strings>,
	strings: _Strings,
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
function textContent<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Needed to enable type-level string validation.
	return {
		contentType: ContentType.TEXT,
		text: trimWhitespacePrefix(text),
		...(Boolean(strings) && { strings }),
	} as ValidateText<TextContent<_Strings>, _Text, _Strings>
}

export function markdown<_Text extends string>(
	markdownText: _Text,
): MarkdownContent<StringsFromTemplate<_Text>>
export function markdown<_Strings extends Strings, _Text extends string = string>(
	markdownText: _Text,
	strings?: _Strings,
): MarkdownContent<_Strings>
export function markdown<_Strings extends Strings, _Text extends string = string>(
	markdownText: _Text,
	strings?: _Strings,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Needed to enable type-level string validation.
	return {
		contentType: ContentType.MARKDOWN,
		markdown: trimWhitespacePrefix(markdownText),
		...(Boolean(strings) && { strings }),
	} as ValidateText<MarkdownContent<_Strings>, _Text, _Strings>
}

const sentenceMaxLength = 384

export type Sentence<_Strings extends Strings = null> = TypographicContent<_Strings>

/** A single sentence. */
export function sentence<_Text extends string>(text: _Text): TextContent<StringsFromTemplate<_Text>>
export function sentence<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
): Sentence<_Strings>
export function sentence<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
) {
	if (text.length > sentenceMaxLength) {
		throw new Error(
			`Sentence text is too long (${text.length} characters is over the maximum length of ${sentenceMaxLength} characters): ${text}`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered sentence. */
export function mdSentence<_Text extends string>(
	text: _Text,
): MarkdownContent<StringsFromTemplate<_Text>>
export function mdSentence<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
): MarkdownContent<_Strings>
export function mdSentence<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
) {
	return markdown(text, strings)
}

const paragraphMaxLength = 1024

/** A short amount of text that fits in a single paragraph. */

export type Paragraph<_Strings extends Strings = null> = TextContent<_Strings>

/** A short amount of markdown that fits in a single paragraph. */

export type MarkdownParagraph<_Strings extends Strings = null> = MarkdownContent<_Strings>

/** A renderable paragraph. */
export function paragraph<_Text extends string>(
	text: _Text,
): TextContent<StringsFromTemplate<_Text>>
export function paragraph<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
): Paragraph<_Strings>
export function paragraph<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
) {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}

	return textContent(text, strings)
}

/** A renderable Markdown-rendered paragraph. */
export function mdParagraph<_Text extends string>(
	text: _Text,
): MarkdownParagraph<StringsFromTemplate<_Text>>
export function mdParagraph<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
): MarkdownParagraph<_Strings>
export function mdParagraph<_Strings extends Strings, _Text extends string = string>(
	text: _Text,
	strings?: _Strings,
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
