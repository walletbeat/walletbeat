import type { AddressCorrelationDetailsContent } from './content/address-correlation-details'
import type { ChainVerificationDetailsContent } from './content/chain-verification-details'
import type { UnratedAttributeContent } from './content/unrated-attribute'
import type { Value } from '../schema/attributes'
import type { SourceVisibilityDetailsContent } from './content/source-visibility-details'
import type { FundingDetailsContent } from './content/funding-details'
import type { LicenseDetailsContent } from './content/license-details'
import { trimWhitespacePrefix } from './utils/text'
import type { SecurityAuditsDetailsContent } from './content/security-audits-details'
import type { TransactionInclusionDetailsContent } from './content/transaction-inclusion-details'
import type { ScamAlertDetailsContent } from './content/scam-alert-details'

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
export interface TextContent {
	contentType: ContentType.TEXT
	text: string
}

/**
 * Markdown-based content that may be displayed on the UI.
 */
export interface MarkdownContent {
	contentType: ContentType.MARKDOWN
	markdown: string
}

/**
 * Custom-component-based content that may be displayed on the UI.
 */
export interface CustomContent {
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
export type Content = TypographicContent | CustomContent

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

/** Arbitrary renderable content. */
export interface Renderable<I extends Input = Input> {
	/** Renders the element given an input template. */
	render: (input: I) => Content
}

/** A Renderable that renders typographic content. */
export interface RenderableTypography<I extends Input = Input> extends Renderable<I> {
	render: (input: I) => TypographicContent
}

function textContent<I extends Input = Input>(
	text: string | ((input: I) => string),
	input: I,
): TextContent {
	return {
		contentType: ContentType.TEXT,
		text: trimWhitespacePrefix(typeof text === 'string' ? text : text(input)),
	}
}

function markdownContent<I extends Input = Input>(
	md: string | ((input: I) => string),
	input: I,
): MarkdownContent {
	return {
		contentType: ContentType.MARKDOWN,
		markdown: trimWhitespacePrefix(typeof md === 'string' ? md : md(input)),
	}
}

const sentenceBrand = 'sentence'
const sentenceMaxLength = 384

/** A single sentence. */
export type Sentence<I extends Input = Input> = RenderableTypography<I> & {
	__brand: 'sentence'
}

/** A renderable sentence. */
export function sentence<I extends Input = Input>(
	text: string | ((input: I) => string),
	isMarkdown?: boolean,
): Sentence<I> {
	if (text.length > sentenceMaxLength) {
		throw new Error(
			`Sentence text is too long (${text.length} characters is over the maximum length of ${sentenceMaxLength} characters).`,
		)
	}
	if (isMarkdown ?? false) {
		return {
			render: (input: I) => markdownContent(text, input),
			__brand: sentenceBrand,
		}
	}
	return {
		render: (input: I) => textContent(text, input),
		__brand: sentenceBrand,
	}
}

/** A renderable Markdown-rendered sentence. */
export function mdSentence<I extends Input = Input>(
	text: string | ((input: I) => string),
): Sentence<I> {
	return sentence(text, true /* isMarkdown */)
}

const paragraphBrand = 'paragraph'
const paragraphMaxLength = 1024

/** A short amount of text that fits in a single paragraph. */
export type Paragraph<I extends Input = Input> = RenderableTypography<I> & {
	__brand: 'paragraph'
}

/** A renderable paragraph. */
export function paragraph<I extends Input = Input>(
	text: string | ((input: I) => string),
	isMarkdown?: boolean,
): Paragraph<I> {
	if (text.length > paragraphMaxLength) {
		throw new Error(
			`Paragraph text is too long (${text.length} characters is over the maximum length of ${paragraphMaxLength} characters).`,
		)
	}
	if (isMarkdown ?? false) {
		return {
			render: (input: I) => markdownContent(text, input),
			__brand: paragraphBrand,
		}
	}
	return {
		render: (input: I) => textContent(text, input),
		__brand: paragraphBrand,
	}
}

/** A renderable Markdown-rendered paragraph. */
export function mdParagraph<I extends Input = Input>(
	text: string | ((input: I) => string),
): Paragraph<I> {
	return paragraph(text, true /* isMarkdown */)
}

const markdownBrand = 'markdown'

export type Markdown<I extends Input> = RenderableTypography<I> & {
	__brand: 'markdown'
}

export function markdown<I extends Input = Input>(
	md: string | ((input: I) => string),
): Markdown<I> {
	return {
		render: (input: I) => markdownContent(md, input),
		__brand: markdownBrand,
	}
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
 *
 * Type parameters:
 *   - C: One of the possible components in ComponentAndProps.
 *   - B: Set of keys in C's component props that will get baked in at
 *     the `component` function call site, as opposed to being specified
 *     as part of the `render` function's `input`.
 *   - I: The `Input` type passed to `render`. Must contain all of C's
 *     props that were not baked in B.
 *
 * @param component The custom component name.
 * @param bakedProps A subset of the component's props; the rest will need
 *                   to be passed to `render`.
 * @returns A `Renderable` that renders using a custom component.
 */
export function component<
	C extends ComponentAndProps,
	B extends keyof C['componentProps'],
	I extends Input & Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>> = Input &
		Pick<C['componentProps'], Exclude<keyof C['componentProps'], B>>,
>(componentName: C['component'], bakedProps: Pick<C['componentProps'], B>): Renderable<I> {
	return {
		render: (input: I): CustomContent => {
			const comp: { component: C['component']; componentProps: C['componentProps'] } = {
				component: componentName,
				componentProps: {
					...mergeProps<C['componentProps'], B>(bakedProps, input),
				},
			}
			return {
				contentType: ContentType.COMPONENT,
				component: comp as C, // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion -- We've already typechecked that both the component and its props correspond to C.
			}
		},
	}
}
