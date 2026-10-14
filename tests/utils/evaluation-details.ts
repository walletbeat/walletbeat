import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import type { Root } from 'mdast'
import { remark } from 'remark'
import { render } from 'svelte/server'

import type { Evaluation, OutcomeMetadata } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import EvaluationDetails from '@/views/attributes/EvaluationDetails.svelte'

/** Server-render the details of a wallet's evaluation as the wallet page displays them. */
export function renderEvaluationDetailsHtml(
	wallet: RatedWallet<string>,
	evaluation: Evaluation<OutcomeMetadata>,
): string {
	return render(EvaluationDetails, { props: { wallet, evaluation } }).body
}

/**
 * Convert server-rendered HTML to Markdown that keeps the visible text and its
 * structure (headings, lists, emphasis, links). Svelte hydration comments are dropped.
 */
export function renderedHtmlToMarkdown(html: string): string {
	const mdast = toMdast(fromHtml(html, { fragment: true }), {
		nodeHandlers: { comment: () => undefined },
	})
	const root: Root = mdast.type === 'root' ? mdast : { type: 'root', children: [mdast] }

	return remark().stringify(root)
}
