interface CssAttributes {
	/**
	 * ## [data-badge]
	 *
	 * ### Purpose
	 * Compact badge / chip surface with size modifiers.
	 *
	 * ### Usage
	 * `<span data-badge='small'>…</span>`
	 *
	 * ### Tokens
	 * - `small`, `medium`, `large`
	 *
	 * ### CSS Variables
	 * - `--badge-backgroundColor`
	 * - `--badge-borderColor`
	 * - `--badge-textColor`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-badge]`
	 */
	'data-badge'?: string | boolean

	/**
	 * ## [data-card]
	 *
	 * ### Purpose
	 * Card surface: tone, radius, padding, and accent border via tokens.
	 *
	 * ### Usage
	 * `<article data-card='secondary radius-6 padding-4 border-accent'>…`
	 *
	 * ### Tokens
	 * - tone: `secondary`
	 * - radius: `radius-1`, `radius-2`, `radius-3`, `radius-4`, `radius-6`, `radius-8`
	 * - padding: `padding-0` … `padding-8`
	 * - border: `border-accent`
	 *
	 * ### CSS Variables
	 * - `--card-backgroundColor`
	 * - `--card-radius`
	 * - `--card-padding`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-card]`
	 */
	'data-card'?: string | boolean

	/**
	 * ## [data-column]
	 *
	 * ### Purpose
	 * One-column grid primitive for `[data-column]` (alignment + gap tokens). `[data-card]` shares the
	 * same column/grid defaults before card-specific rules apply below.
	 *
	 * ### Usage
	 * `<section data-column='start gap-4'>...</section>`
	 *
	 * ### Tokens
	 * - alignment: `start`, `center`, `end`
	 * - spacing: `gap-0`, `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-column]`
	 */
	'data-column'?: string | boolean

	/**
	 * ## [data-link]
	 *
	 * ### Purpose
	 * Shared link styling with optional camouflaged mode.
	 *
	 * ### Usage
	 * `<a data-link>` or `<a data-link='camouflaged'>`.
	 *
	 * ### Tokens
	 * - `camouflaged` (exact `=` selector).
	 *
	 * ### CSS Variables
	 * - `--text-primary`
	 * - `--accent`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-link]`
	 */
	'data-link'?: 'camouflaged' | boolean

	/**
	 * ## [data-list]
	 *
	 * ### Purpose
	 * List layout: gap, markers, and `data-list-item` / `data-list-item-marker` item spacing.
	 *
	 * ### Usage
	 * - `<ul data-list='gap-2'>…`
	 * - `<li data-list-item='gap-1' data-list-item-marker='•'>…`
	 *
	 * ### Tokens
	 * - list gap: `gap-0` … `gap-6`
	 * - item gap: `gap-0` … `gap-6` on `data-list-item`
	 * - marker: free text via `data-list-item-marker`
	 *
	 * ### CSS Variables
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 * - `--listItem-gap` (per item)
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list]`
	 */
	'data-list'?: string | boolean

	/**
	 * ## [data-list-item]
	 *
	 * ### Purpose
	 * List layout: gap, markers, and `data-list-item` / `data-list-item-marker` item spacing.
	 *
	 * ### Usage
	 * - `<ul data-list='gap-2'>…`
	 * - `<li data-list-item='gap-1' data-list-item-marker='•'>…`
	 *
	 * ### Tokens
	 * - list gap: `gap-0` … `gap-6`
	 * - item gap: `gap-0` … `gap-6` on `data-list-item`
	 * - marker: free text via `data-list-item-marker`
	 *
	 * ### CSS Variables
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 * - `--listItem-gap` (per item)
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item]`
	 */
	'data-list-item'?: string | boolean

	/**
	 * ## [data-list-item-marker]
	 *
	 * ### Purpose
	 * List layout: gap, markers, and `data-list-item` / `data-list-item-marker` item spacing.
	 *
	 * ### Usage
	 * - `<ul data-list='gap-2'>…`
	 * - `<li data-list-item='gap-1' data-list-item-marker='•'>…`
	 *
	 * ### Tokens
	 * - list gap: `gap-0` … `gap-6`
	 * - item gap: `gap-0` … `gap-6` on `data-list-item`
	 * - marker: free text via `data-list-item-marker`
	 *
	 * ### CSS Variables
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 * - `--listItem-gap` (per item)
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item-marker]`
	 */
	'data-list-item-marker'?: string | boolean

	/**
	 * ## [data-pressable]
	 *
	 * ### Purpose
	 * Consistent press-state feedback across interactive elements.
	 *
	 * ### Usage
	 * - add `data-pressable` on custom interactive wrappers
	 * - use `data-pressable='to-containing'` when the press overlay should cover the containing block
	 *
	 * ### Tokens
	 * - `to-containing` (exact `=` selector).
	 *
	 * ### CSS Variables
	 * - `--pressable-transitionOutDuration`
	 * - `--pressable-transitionInDuration`
	 * - `--pressable-pressed-opacity`
	 * - `--pressable-pressed-scale`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-pressable]`
	 */
	'data-pressable'?: 'to-containing' | boolean

	/**
	 * ## [data-row]
	 *
	 * ### Purpose
	 * Flex row primitive: alignment, gap, wrap, and child `data-row-item` helpers. Also styles `<summary>`
	 * and shares flex defaults with `[data-badge]` in this block; see the dedicated `[data-badge]` block
	 * for badge size tokens.
	 *
	 * ### Usage
	 * - row: `<div data-row='center gap-2 wrap'>…`
	 * - item hints: `<div data-row-item='basis-3 flexible'>…`
	 *
	 * ### Tokens
	 * - container: `start`, `center`, `end`
	 * - cross-axis: `align-start`, `align-center`, `align-end`
	 * - gap: `gap-0` … `gap-8`
	 * - wrap: `wrap`, `wrap-first-last`
	 * - item: `flexible`, `basis-1`..`basis-6`, `basis-full`, `wrap-start`, `wrap-center`, `wrap-end`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-row]`
	 */
	'data-row'?: string | boolean

	/**
	 * ## [data-row-item]
	 *
	 * ### Purpose
	 * Flex row primitive: alignment, gap, wrap, and child `data-row-item` helpers. Also styles `<summary>`
	 * and shares flex defaults with `[data-badge]` in this block; see the dedicated `[data-badge]` block
	 * for badge size tokens.
	 *
	 * ### Usage
	 * - row: `<div data-row='center gap-2 wrap'>…`
	 * - item hints: `<div data-row-item='basis-3 flexible'>…`
	 *
	 * ### Tokens
	 * - container: `start`, `center`, `end`
	 * - cross-axis: `align-start`, `align-center`, `align-end`
	 * - gap: `gap-0` … `gap-8`
	 * - wrap: `wrap`, `wrap-first-last`
	 * - item: `flexible`, `basis-1`..`basis-6`, `basis-full`, `wrap-start`, `wrap-center`, `wrap-end`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-row]`
	 */
	'data-row-item'?: string | boolean

	/**
	 * ## [data-scroll-container]
	 *
	 * ### Purpose
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers.
	 *
	 * ### Usage
	 * - `data-scroll-container='block|inline'`
	 * - `data-sticky-container` for nested sticky subtrees
	 * - `data-sticky='…'` sticky item tokens
	 * - `data-scroll-item='…'` scroll item modifiers
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-scroll-container]`
	 */
	'data-scroll-container'?: string | boolean

	/**
	 * ## [data-scroll-item]
	 *
	 * ### Purpose
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers.
	 *
	 * ### Usage
	 * - `data-scroll-container='block|inline'`
	 * - `data-sticky-container` for nested sticky subtrees
	 * - `data-sticky='…'` sticky item tokens
	 * - `data-scroll-item='…'` scroll item modifiers
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-scroll-item]`
	 */
	'data-scroll-item'?: string | boolean

	/**
	 * ## [data-stack]
	 *
	 * ### Purpose
	 * Overlay direct children in one shared grid cell (`grid-area: stack`).
	 *
	 * ### Usage
	 * Container whose direct children should stack visually.
	 *
	 * ### Tokens
	 * None (`[data-stack]` presence only).
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-stack]`
	 */
	'data-stack'?: string | boolean

	/**
	 * ## [data-sticky]
	 *
	 * ### Purpose
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers.
	 *
	 * ### Usage
	 * - `data-scroll-container='block|inline'`
	 * - `data-sticky-container` for nested sticky subtrees
	 * - `data-sticky='…'` sticky item tokens
	 * - `data-scroll-item='…'` scroll item modifiers
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-sticky]`
	 */
	'data-sticky'?: string | boolean

	/**
	 * ## [data-sticky-container]
	 *
	 * ### Purpose
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers.
	 *
	 * ### Usage
	 * - `data-scroll-container='block|inline'`
	 * - `data-sticky-container` for nested sticky subtrees
	 * - `data-sticky='…'` sticky item tokens
	 * - `data-scroll-item='…'` scroll item modifiers
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-sticky-container]`
	 */
	'data-sticky-container'?: string | boolean

	/**
	 * ## [data-tag]
	 *
	 * ### Purpose
	 * Semantic tag / chip with category-based color families (`~=` tokens map to theme variables).
	 *
	 * ### Usage
	 * `<button data-tag='eip'>EIP-4337</button>`
	 *
	 * ### Tokens
	 * - `wallet-type`, `account-type`, `eip`, `eip-status`, `manufacture-type`, `eoa`
	 *
	 * ### CSS Variables
	 * - `--tag-backgroundColor`
	 * - `--tag-textColor`
	 * - `--tag-borderColor`
	 * - `--tag-hover-backgroundColor`
	 * - `--tag-hover-textColor`
	 * - `--tag-hover-borderColor`
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-tag]`
	 */
	'data-tag'?: string | boolean
}

declare namespace astroHTML.JSX {
	interface HTMLAttributes extends CssAttributes {}
}

declare module 'svelte/elements' {
	export interface HTMLAttributes<_T extends EventTarget> extends CssAttributes {}
}
