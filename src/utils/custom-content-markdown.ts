import type { Component } from 'svelte'
import { render } from 'svelte/server'
import TurndownService from 'turndown'

import type { EvaluationData, Outcome, OutcomeMetadata } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'
import type { ScamPreventionMetadata } from '@/schema/attributes/security/scam-prevention'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'
import { type CustomContent, isCustomContent } from '@/types/content'
import { normalizeMarkdownBlankLines } from '@/utils/markdown-utils'
import AddressCorrelationDetails from '@/views/attributes/privacy/AddressCorrelationDetails.svelte'
import PrivateTransfersDetails from '@/views/attributes/privacy/PrivateTransfersDetails.svelte'
import AccountRecoveryDetails from '@/views/attributes/security/AccountRecoveryDetails.svelte'
import ChainVerificationDetails from '@/views/attributes/security/ChainVerificationDetails.svelte'
import ScamAlertDetails from '@/views/attributes/security/ScamAlertDetails.svelte'
import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
import AccountUnruggabilityDetails from '@/views/attributes/self-sovereignty/AccountUnruggabilityDetails.svelte'
import TransactionInclusionDetails from '@/views/attributes/self-sovereignty/TransactionInclusionDetails.svelte'
import FundingDetails from '@/views/attributes/transparency/FundingDetails.svelte'

/**
 * Context that `WalletPage.svelte` injects into detail components on top of the
 * props baked into the `CustomContent` itself.
 *
 * This is the same `{ outcome, references, wallet }` triple that detail
 * components declare via `EvaluationData`, minus the per-attribute metadata
 * type, which `CustomContent` does not carry.
 */
export interface CustomContentContext extends EvaluationData<OutcomeMetadata> {}

/**
 * Returned instead of Markdown by components that deliberately have no
 * Markdown rendering, so that callers omit the details section entirely rather
 * than falling back to something else.
 */
export const NO_MARKDOWN_DETAILS = Symbol('NO_MARKDOWN_DETAILS')

/**
 * Result of rendering evaluation details to Markdown:
 * - a string: the component's Markdown;
 * - `NO_MARKDOWN_DETAILS`: custom content that intentionally renders nothing;
 * - `null`: not custom content at all (i.e. typographic content).
 */
export type CustomContentMarkdown = string | typeof NO_MARKDOWN_DETAILS | null

/**
 * Heading level that component headings are rendered at.
 *
 * The wallet page puts each attribute under `###` and emits `#### Impact` /
 * `#### References` sections around the details, so component headings (`<h4>`)
 * are demoted by one level to sit underneath those.
 */
const headingDemotion = 1

/**
 * Turndown instance configured to match the Markdown conventions used by the
 * rest of the wallet page (ATX headings, `-` bullets, `**` for strong).
 */
const turndownService = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	emDelimiter: '*',
	strongDelimiter: '**',
})

// `ReferenceLinks` renders sources inline within some detail components, but
// the Markdown page already emits a single `#### References` section per
// attribute from `evaluation.references`. Keeping both would duplicate every
// URL, so the inline ones are dropped.
// Known limitation: components that call `ReferenceLinks` more than once
// (`ScamAlertDetails`, `SecurityAuditsDetails`) lose their per-claim source
// attribution, since the page-level section is a flat list. See issue #550.
turndownService.remove(node => {
	if (node.nodeName !== 'SECTION') {
		return false
	}

	// Svelte appends a scoping class, so match on the class list rather than
	// the whole attribute.
	return (node.getAttribute('class') ?? '').split(/\s+/).includes('references')
})

turndownService.addRule('demotedHeading', {
	filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
	replacement: (content, node) => {
		const level = Math.min(Number(node.nodeName.charAt(1)) + headingDemotion, 6)

		return `\n\n${'#'.repeat(level)} ${content}\n\n`
	},
})

// Turndown pads list markers to a fixed width (`-   item`); the wallet page
// writes plain `- item`, so use that instead.
turndownService.addRule('compactListItem', {
	filter: 'li',
	replacement: (content, node) => {
		const parent = node.parentElement
		const prefix =
			parent !== null && parent.nodeName === 'OL'
				? `${Number(parent.getAttribute('start') ?? 1) + [...parent.children].indexOf(node)}. `
				: '- '
		const body = content
			.replace(/^\n+/, '')
			.replace(/\n+$/, '\n')
			.replace(/\n/gm, `\n${' '.repeat(prefix.length)}`)

		return prefix + body + (node.nextSibling !== null && !/\n$/.test(body) ? '\n' : '')
	},
})

/**
 * Server-render a Svelte component and convert its HTML output to Markdown.
 *
 * The site is fully static, so this runs at build time only.
 *
 * @param component The Svelte component to render.
 * @param props Props to render it with.
 * @returns Markdown equivalent of the component's rendered HTML.
 */
function renderComponentToMarkdown<_Props extends Record<string, unknown>>(
	component: Component<_Props, {}, ''>,
	props: _Props,
): string {
	const { body } = render(component, { props })

	// Indenting nested list items leaves lines that hold nothing but the
	// indentation; blank them out so blank lines are really blank.
	const markdown = turndownService.turndown(body).replace(/^[ \t]+$/gm, '')

	return normalizeMarkdownBlankLines(markdown).trim()
}

/**
 * Narrow the erased outcome from the rendering context back to the shape that a
 * detail component declares.
 *
 * `CustomContent` does not carry its attribute's metadata type, so this module
 * only ever sees `Outcome<OutcomeMetadata>`. This is the same erasure that makes
 * `WalletPage.svelte` write `metadata={outcome.metadata!}`; what guarantees the
 * shape in both places is the attribute that produced the `CustomContent`.
 *
 * @param outcome The outcome from the rendering context.
 * @returns The same outcome, typed as the component expects it.
 */
function narrowOutcome<_Metadata extends OutcomeMetadata>(
	outcome: Outcome<OutcomeMetadata>,
): Outcome<_Metadata> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- See doc comment; mirrors `outcome.metadata!` in `WalletPage.svelte`.
	return outcome as Outcome<_Metadata>
}

/**
 * Same as `narrowOutcome`, for components that take `metadata` rather than the
 * whole outcome.
 *
 * @param outcome The outcome from the rendering context.
 * @returns The outcome's metadata, typed as the component expects it.
 */
function narrowMetadata<_Metadata extends object>(outcome: Outcome<OutcomeMetadata>): _Metadata {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- See `narrowOutcome`.
	return outcome.metadata as _Metadata
}

/**
 * Render `CustomContent` (a Svelte component) to Markdown for the LLM-friendly
 * `index.html.md` wallet pages.
 *
 * Every component in `ComponentAndProps` is handled here; the `assertNever` in
 * the default case makes adding one to that union a compile error until it is.
 * The props each component receives must stay in sync with the dispatch in
 * `WalletPage.svelte`.
 *
 * @param content The content to render; typographic content returns `null`.
 * @param context Props that the wallet page injects into every detail component.
 * @returns Markdown for the component, or one of the sentinels documented on
 * `CustomContentMarkdown`.
 */
export function renderCustomContentToMarkdown(
	content: unknown,
	context: CustomContentContext,
): CustomContentMarkdown {
	if (!isCustomContent(content)) {
		return null
	}

	const componentAndProps: CustomContent['component'] = content.component
	const { wallet, outcome, references } = context

	switch (componentAndProps.component) {
		case 'AddressCorrelationDetails':
			return renderComponentToMarkdown(AddressCorrelationDetails, {
				...componentAndProps.componentProps,
				wallet,
			})
		case 'PrivateTransfersDetails':
			return renderComponentToMarkdown(PrivateTransfersDetails, {
				...componentAndProps.componentProps,
				wallet,
			})
		case 'ChainVerificationDetails':
			return renderComponentToMarkdown(ChainVerificationDetails, {
				...componentAndProps.componentProps,
				wallet,
				refs: references,
			})
		case 'ScamAlertDetails':
			return renderComponentToMarkdown(ScamAlertDetails, {
				...componentAndProps.componentProps,
				wallet,
				outcome: narrowOutcome<ScamPreventionMetadata>(outcome),
			})
		case 'SecurityAuditsDetails':
			return renderComponentToMarkdown(SecurityAuditsDetails, {
				...componentAndProps.componentProps,
				wallet,
				metadata: narrowMetadata<SecurityAuditsMetadata>(outcome),
			})
		case 'TransactionInclusionDetails':
			return renderComponentToMarkdown(TransactionInclusionDetails, {
				...componentAndProps.componentProps,
				wallet,
			})
		case 'FundingDetails':
			return renderComponentToMarkdown(FundingDetails, {
				...componentAndProps.componentProps,
				wallet,
			})
		case 'AccountRecoveryDetails':
			return renderComponentToMarkdown(AccountRecoveryDetails, {
				...componentAndProps.componentProps,
				wallet,
				metadata: narrowMetadata<AccountRecoveryMetadata>(outcome),
			})
		case 'AccountUnruggabilityDetails':
			return renderComponentToMarkdown(AccountUnruggabilityDetails, {
				...componentAndProps.componentProps,
				wallet,
				metadata: narrowMetadata<AccountUnruggabilityMetadata>(outcome),
			})
		case 'UnratedAttribute':
			// Deliberately not rendered: `UnratedAttribute` restates the
			// attribute's `shortExplanation` (already emitted just above the
			// details on the Markdown page) and adds a call to action to
			// contribute the rating on GitHub, which is only useful to a human
			// reading the site. It is by far the most common detail component,
			// so rendering it would bloat every page for no gain to an LLM
			// reader.
			return NO_MARKDOWN_DETAILS
		default:
			return assertNever(componentAndProps)
	}
}

function assertNever(componentAndProps: never): never {
	const { component } = componentAndProps as CustomContent['component']

	throw new Error(`No Markdown renderer for detail component: ${component}`)
}
