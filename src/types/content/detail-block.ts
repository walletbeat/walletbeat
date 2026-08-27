import type { ReferenceInput } from '@/schema/reference'

/**
 * The layout vocabulary shared by every structured detail model.
 *
 * Models describe *what* a detail says as blocks; adapters decide how a block
 * looks in their format. Keeping the vocabulary this small is deliberate: a
 * model that needs a new block kind is usually a model trying to do layout.
 */

/**
 * One bullet, with the nesting the detail models actually need.
 *
 * `items` are sub-bullets and `conclusion` is prose that belongs to the bullet
 * rather than following the list, so adapters keep both visually inside it.
 */
export interface DetailListItem {
	text: string
	items?: string[]
	conclusion?: string
	references?: ReferenceInput
}

export type DetailBlock =
	| { kind: 'heading'; text: string }
	| { kind: 'paragraph'; text: string; references?: ReferenceInput }
	| { kind: 'list'; items: DetailListItem[] }
	/** Sources supporting the blocks above, with no prose of their own. */
	| { kind: 'references'; references: ReferenceInput }

/** The blocks a model may produce inside a section that already has a heading. */
export type DetailProseBlock = Extract<DetailBlock, { kind: 'paragraph' | 'list' }>
