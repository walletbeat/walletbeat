import 'svelte/elements'

declare global {
	interface CssAttributes {
		/**
		 * ## [data-badge]
		 *
		 * Compact badge / chip surface with explicit size modifiers. Without a size token, text size is inherited and no badge padding is added.
		 *
		 * ### Tokens
		 * - `small`, `medium`, `large`
		 *
		 * ### CSS Variables
		 * - `--badge-borderWidth`: border width shared with intrinsic border-box measurement
		 * - `--badge-backgroundColor`
		 * - `--badge-borderColor`
		 * - `--badge-textColor`
		 *
		 * ### Examples
		 * - Default (inherited text size, no added padding):
		 *   ```html
		 *   <span data-badge>Status</span>
		 *   ```
		 * - `small`:
		 *   ```html
		 *   <span data-badge="small">Status</span>
		 *   ```
		 * - `large`:
		 *   ```html
		 *   <span data-badge="large">Status</span>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-badge]`
		 */
		'data-badge'?: string | boolean

		/**
		 * ## [data-card]
		 *
		 * Card surface: tone, radius, padding, and accent border via tokens. Card surface variables sit on the same column grid defaults as `[data-column]` / `[data-card]`.
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
		 * - `--card-borderWidth`: accent border width; defaults to 2px
		 *
		 * ### Examples
		 * - Default surface (primary background, `0.5em` radius, `1em` padding — omit tokens):
		 *   ```html
		 *   <article data-card>
		 *     <h2>Card title</h2>
		 *     <p>Card body.</p>
		 *   </article>
		 *   ```
		 * - Secondary tone, larger padding, accent border (omit radius when default `radius-4` / `0.5em` is fine):
		 *   ```html
		 *   <article data-card="secondary padding-6 border-accent">
		 *     <h2>Card title</h2>
		 *     <p>Card body.</p>
		 *   </article>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-card]`
		 */
		'data-card'?: string | boolean

		/**
		 * ## [data-collapsible]
		 *
		 * Shared disclosure / accordion styling for native `<details>` and optional `[data-collapsible]` wrappers. Disclosure animation and summary chevron apply to `<details>`. `[data-collapsible]` documents the hook and can mark optional wrappers if you add them in markup.
		 *
		 * ### Applied to
		 * - `<details>`
		 *
		 * ### CSS Variables
		 * - `--collapsible-summaryPaddingBlock`: block-axis padding on the native summary of a card disclosure; configure on the summary, defaults to `--card-padding`; inline and body padding retain the card value
		 * - `--collapsible-markerInlineTimeline`: local marker measurement clock; inherited from the nearest identified disclosure or breadcrumb scope, with an explicit local override for repeated anonymous owners
		 * - `--collapsible-markerMotion`: `clearance` enables caller-configured motion at the actual native marker owner and closed breadcrumb end clusters; open end clusters retain their arrival motion
		 * - `--collapsible-markerClearanceRadius`, `--collapsible-markerClearanceCenterInline`, `--collapsible-markerClearanceCenterBlock`: obstacle ink radius and logical viewport center; the native marker owns its measured inline end and line height
		 * - `--collapsible-markerAnimation`, `--collapsible-markerTimeline`, `--collapsible-markerRange`: native marker effect and its scroll timeline; independent disclosure rotation is preserved
		 *
		 * ### Examples
		 * - Native disclosure (`details` picks up animation and summary chrome — omit `[data-collapsible]` when you do not need the hook):
		 *   ```html
		 *   <details>
		 *     <summary>More</summary>
		 *     <div><p>Hidden body.</p></div>
		 *   </details>
		 *   ```
		 * - `[data-collapsible]` + `[data-card]` padding split between summary and body:
		 *   ```html
		 *   <details data-card="padding-6">
		 *     <summary data-row="wrap wrap-first-last">Title row</summary>
		 *     <div><p>Body</p></div>
		 *   </details>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-collapsible]`
		 */
		'data-collapsible'?: string | boolean

		/**
		 * ## [data-collapsible-marker]
		 * Decorative disclosure chevron with an independent paint owner. Replaces its parent's automatic marker while sharing native summary rotation and glyph styling.
		 *
		 * ### Placement
		 * - An `aria-hidden="true"` final child of a native summary's breadcrumb `end contents` cluster. Its children own the open arrival motion while the cluster retains intrinsic measurement and curve production.
		 *
		 * ### Examples
		 * - An explicit marker in a native summary's end cluster:
		 *   ```html
		 *   <details>
		 *     <summary><div data-row><h3>Details</h3><span data-row-item="wrap-end" data-sticky-breadcrumb="end contents"><span data-collapsible-marker aria-hidden="true"></span></span></div></summary>
		 *   </details>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-collapsible-marker]`
		 */
		'data-collapsible-marker'?: string | boolean

		/**
		 * ## [data-column]
		 * Vertical flex layout with alignment and gap tokens. `span-start` lets the first row’s leading
		 * icon span supporting copy; an extreme first-row aspect ratio moves that copy to full width.
		 * The first row remains a real box, independent of the supporting copy’s length.
		 * It can sit directly in the column or inside a header that owns compact sticky paint.
		 *
		 * ### Applied to
		 * - `[data-card]`
		 *
		 * ### Tokens
		 * - alignment: `start`, `center`, `end`
		 * - spacing: `gap-0`, `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-7`, `gap-8`
		 * - composition: `span-start`
		 *
		 * ### CSS Variables
		 * - `--column-sizeTimelinePrefix`: optional unique local measurement-clock prefix; defaults to `--column`
		 * - `--column-wrapRatio`: first-row ratio below which copy spans the full width; defaults to 4
		 * - `--column-supportFontSize`: supporting text and end-cluster size; defaults to 1rem
		 * - `--column-supportLineHeight`: supporting text line height; defaults to 1rlh
		 * - `--column-spanSize`: icon span override; defaults to the heading and supporting line heights plus their gap
		 * - `--column-supportGap`: gap between the first row and supporting copy; defaults to 0.5rem
		 * - `--column-iconGap`: inline gap after the leading icon; defaults to 0.625rem
		 *
		 * ### Examples
		 * - Default column grid (`1em` gap, start-aligned content):
		 *   ```html
		 *   <section data-column>
		 *     <h2>Overview</h2>
		 *     <p>Supporting copy.</p>
		 *   </section>
		 *   ```
		 * - Start-aligned items, tighter gap (`gap-2`):
		 *   ```html
		 *   <section data-column="start gap-2">
		 *     <h2>Overview</h2>
		 *     <p>Supporting copy.</p>
		 *   </section>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-column]`
		 */
		'data-column'?: string | boolean

		/**
		 * ## [data-column-item]
		 *
		 * Size and align a column child.
		 *
		 * ### Placement
		 * - Direct children of `[data-column]` or `[data-card]`.
		 *
		 * ### Tokens
		 * - growth: `flexible`
		 * - basis: `basis-1`, `basis-2`, `basis-3`, `basis-4`
		 * - alignment: `start`, `center`, `end`, `baseline`
		 *
		 * ### Examples
		 * ```html
		 * <section data-column>
		 *   <div data-column-item="flexible">Main</div>
		 * </section>
		 * ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-column-item]`
		 */
		'data-column-item'?: string | boolean

		/**
		 * ## [data-icon]
		 *
		 * Shared icon primitive for font icons, inline SVGs, and image icons. Font icons select detailed glyphs above 32px and simple glyphs otherwise; `emoji` preserves platform emoji. Add source-specific tokens such as `wbicons-simple`; add `circle` when the icon should render in a circular control; add `shadow` for image icons (e.g. wallet logos) that need a theme-aware halo to stay legible on both backgrounds.
		 *
		 * ### Tokens
		 * - shape: `circle`, `filled`
		 * - color: `accent`
		 * - source: `wbicons-simple`, `wbicons-complex`, `emoji`
		 * - effect: `shadow`, `grayscale`
		 *
		 * ### CSS Variables
		 * - `--icon-scale`: scale supplied by a transformed container (default `1`); style-range queries include it in icon detail selection
		 * - `--icon-content`
		 * - `--icon-size`
		 * - `--icon-navigation-borderColor`
		 * - `--icon-navigation-color`
		 * - `--icon-grayscale-filter` — filter applied by `grayscale`; set to `none` to show the icon in color.
		 *
		 * ### Examples
		 * ```html
		 * <span data-icon="&#x21b5;"></span>
		 * <span data-icon="wbicons-complex security"></span>
		 * <button data-icon="circle" type="button"><svg aria-hidden="true">...</svg></button>
		 * <span data-icon="shadow"><img src="/images/wallets/rabby.svg" alt="Rabby" /></span>
		 * <span data-icon="grayscale"><img src="/images/wallets/rabby.svg" alt="" /></span>
		 * ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-icon]`
		 */
		'data-icon'?: string | boolean

		/**
		 * ## [data-icon-metrics]
		 * Expose one icon's generated outline metrics on its closest layout owner without rendering a glyph.
		 *
		 * ### Placement
		 * - On a composition that reserves space for a descendant icon with the same identifier.
		 *
		 * ### Examples
		 * ```html
		 * <header data-column="span-start" data-icon-metrics="security">
		 *   <div data-row><a data-row href="#security"><span data-icon="wbicons-complex security"></span>Security</a></div>
		 *   <p>Supporting description.</p>
		 * </header>
		 * ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-icon-metrics]`
		 */
		'data-icon-metrics'?: string | boolean

		/**
		 * ## [data-input]
		 *
		 * Shared button and form-control surface for native controls and optional `[data-input]` wrappers. Native `<button>`, `<select>`, `<input>`, and checkbox or radio `<label>`s use this chrome automatically. Add `[data-input]` on a wrapper or extra element when you want the same look outside those tags.
		 *
		 * ### Applied to
		 * - `<button>`
		 * - `<select>`
		 * - `<input>`
		 * - `<label>` wrapping checkbox or radio inputs
		 *
		 * ### Examples
		 * - Native control (no `[data-input]`):
		 *   ```html
		 *   <button type="button">Save</button>
		 *   ```
		 *   ```html
		 *   <select>
		 *     <option>First</option>
		 *     <option>Second</option>
		 *   </select>
		 *   ```
		 * - Non-control host that should look like a control:
		 *   ```html
		 *   <span data-input role="button" tabindex="0">Custom</span>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-input]`
		 */
		'data-input'?: string | boolean

		/**
		 * ## [data-link]
		 *
		 * Shared link styling with optional camouflaged mode. `<a>` gets accent link chrome by default (no `[data-link]`). Add `[data-link]` on non-anchor elements when you want the same treatment; on `<a>`, use `[data-link]` only for non-default modes such as `camouflaged`.
		 *
		 * ### Tokens
		 * - `camouflaged`, `contents`.
		 *
		 * ### CSS Variables
		 * - `--text-primary`
		 * - `--accent`
		 * - `--accent-textColor`: legible text override for scopes whose accent supplies rating fills or borders.
		 *
		 * ### Examples
		 * - Default link (`<a>` — no `[data-link]`):
		 *   ```html
		 *   <a href="https://example.com/article">Read the article</a>
		 *   ```
		 * - `camouflaged` (inherits text color until hover):
		 *   ```html
		 *   <a data-link="camouflaged" href="#footnote">Footnote</a>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-link]`
		 */
		'data-link'?: 'camouflaged' | boolean

		/**
		 * ## [data-list]
		 *
		 * List layout: grid gap and marker column on `[data-list]`, `ul`, or `ol`. Per-row spacing and custom markers are documented on the list-item child rule below.
		 *
		 * ### Placement
		 * - On the list host: `[data-list]`, `ul`, or `ol` (including inside `[data-card]`).
		 *
		 * ### Tokens
		 * - list gap: `gap-0` … `gap-6`
		 *
		 * ### CSS Variables
		 * - `--list-markerGap`
		 * - `--list-gap`
		 * - `--list-marker-inlineSize`
		 *
		 * ### Examples
		 * - Native list (`ul` / `ol` use the same rules as `[data-list]` — omit `[data-list]` when defaults suffice):
		 *   ```html
		 *   <ul>
		 *     <li>First item</li>
		 *     <li>Second item</li>
		 *   </ul>
		 *   ```
		 * - Tighter list gap (`gap-0`; default without a token is `0.5lh`):
		 *   ```html
		 *   <ul data-list="gap-0">
		 *     <li>First</li>
		 *     <li>Second</li>
		 *   </ul>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list]`
		 *
		 * ---
		 *
		 * List row: per-item vertical rhythm (`[data-list-item]` gap tokens), marker column (`::before` / `[data-list-item-marker]`), and padding that pairs with `[data-list]` / `[data-card]` list padding. `[data-list-item-marker]` renders literal marker text.
		 *
		 * ### Placement
		 * - Direct child of `[data-list]`, `ul`, or `ol` — use native `<li>` or `[data-list-item]` for the same rules.
		 * - `[data-list-item-marker]` is an optional attribute on that same row when you want a custom marker string (otherwise the default bullet glyph applies).
		 *
		 * ### Tokens
		 * - item vertical gap: `gap-0` … `gap-6` on `[data-list-item]`
		 * - marker: the displayed marker string via `[data-list-item-marker]` (not space-separated tokens)
		 *
		 * ### CSS Variables
		 * - `--listItem-gap` (per row, driven by `[data-list-item]`)
		 *
		 * ### Examples
		 * - Per-row vertical rhythm (`gap-4` between blocks inside one item — omit `[data-list-item]` when default `gap-1` / `0.25lh` is fine):
		 *   ```html
		 *   <ul>
		 *     <li data-list-item="gap-4">
		 *       <p>Lead</p>
		 *       <p>Detail</p>
		 *     </li>
		 *   </ul>
		 *   ```
		 * - Custom marker string (`[data-list-item-marker]`):
		 *   ```html
		 *   <ul>
		 *     <li data-list-item-marker="*">First step</li>
		 *     <li data-list-item-marker="1.">Second step</li>
		 *   </ul>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item]`
		 */
		'data-list'?: string | boolean

		/**
		 * ## [data-list-item]
		 *
		 * List row: per-item vertical rhythm (`[data-list-item]` gap tokens), marker column (`::before` / `[data-list-item-marker]`), and padding that pairs with `[data-list]` / `[data-card]` list padding. `[data-list-item-marker]` renders literal marker text.
		 *
		 * ### Placement
		 * - Direct child of `[data-list]`, `ul`, or `ol` — use native `<li>` or `[data-list-item]` for the same rules.
		 * - `[data-list-item-marker]` is an optional attribute on that same row when you want a custom marker string (otherwise the default bullet glyph applies).
		 *
		 * ### Tokens
		 * - item vertical gap: `gap-0` … `gap-6` on `[data-list-item]`
		 * - marker: the displayed marker string via `[data-list-item-marker]` (not space-separated tokens)
		 *
		 * ### CSS Variables
		 * - `--listItem-gap` (per row, driven by `[data-list-item]`)
		 *
		 * ### Examples
		 * - Per-row vertical rhythm (`gap-4` between blocks inside one item — omit `[data-list-item]` when default `gap-1` / `0.25lh` is fine):
		 *   ```html
		 *   <ul>
		 *     <li data-list-item="gap-4">
		 *       <p>Lead</p>
		 *       <p>Detail</p>
		 *     </li>
		 *   </ul>
		 *   ```
		 * - Custom marker string (`[data-list-item-marker]`):
		 *   ```html
		 *   <ul>
		 *     <li data-list-item-marker="*">First step</li>
		 *     <li data-list-item-marker="1.">Second step</li>
		 *   </ul>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item]`
		 */
		'data-list-item'?: string | boolean

		/**
		 * ## [data-list-item-marker]
		 *
		 * Custom literal marker text for a list item.
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item-marker]`
		 */
		'data-list-item-marker'?: string | boolean

		/**
		 * ## [data-pressable]
		 *
		 * Consistent press-state feedback across interactive elements. Dims and scales slightly while active so press feedback matches across controls and custom targets.
		 * Native summaries own their feedback; breadcrumb summaries delegate it to their foreground row.
		 *
		 * ### Tokens
		 * - `to-containing`
		 *
		 * ### CSS Variables
		 * - `--pressable-transitionOutDuration`
		 * - `--pressable-transitionInDuration`
		 * - `--pressable-pressed-opacity`
		 * - `--pressable-pressed-scale`
		 *
		 * ### Examples
		 * - `to-containing` (press feedback covers the containing block — useful on block-level links):
		 *   ```html
		 *   <a data-pressable="to-containing" href="#section">
		 *     Jump to section
		 *   </a>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-pressable]`
		 */
		'data-pressable'?: 'to-containing' | boolean

		/**
		 * ## [data-pressable-name]
		 *
		 * Canonical same-page destination identity consumed by destination-scope interaction publishers. Associated non-link paint owners share the identity without acquiring interactive semantics. Source links declare their own and ancestor destination membership separately with `[data-pressable-targets]`.
		 *
		 * ### CSS Variables
		 * - `--link-current`, `--link-current-sources`: current destination timeline and own or ancestor destinations.
		 * - `--link-timelines`: destination timeline names at their closest shared scope.
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-pressable-name]`
		 */
		'data-pressable-name'?: string | boolean

		/**
		 * ## [data-pressable-state]
		 * Positive peer membership derived from native interaction and canonical destination relationships. Removing a token restores independently owned current/timeline presentation.
		 *
		 * ### Placement
		 * Published by the destination scope on named peers; related group surfaces may consume the relationship without becoming interactive.
		 *
		 * ### Tokens
		 * - `interacting`: a hovered, focused or pressed source includes this destination.
		 * - `pressed`: a natively active source includes this destination; anchors share its press feedback.
		 * - `exact`: an interacting or interested source has this exact destination identity.
		 * - `related`: the semantic group contains an interacting or interested source.
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-pressable-state]`
		 */
		'data-pressable-state'?: string | boolean

		/**
		 * ## [data-pressable-targets]
		 *
		 * Space-separated canonical destination memberships published by a source link. The own destination and its ancestor destinations remain distinct from the paint owner's single `[data-pressable-name]` identity, so interacting with a child highlights its parent without highlighting its siblings.
		 *
		 * ### CSS Variables
		 * - `--link-current-sources`: native current timelines corresponding to the destination memberships.
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-pressable-targets]`
		 */
		'data-pressable-targets'?: string | boolean

		/**
		 * ## [data-row], [data-badge]
		 * Flex row primitive: alignment, gap, and wrap on `[data-row]`, `[data-badge]`, and `<summary>` without an explicit `[data-column]`. Child `[data-row-item]` tokens are documented on the nested row-item rule below; badge size tokens stay on `[data-badge]`.
		 *
		 * ### Placement
		 * - On `[data-row]`, `[data-badge]`, or `<summary>` when it is the flex row container (not on `[data-row-item]` children).
		 *
		 * ### Tokens
		 * - container: `start`, `center`, `end`
		 * - cross-axis: `align-start`, `align-center`, `align-end`
		 * - gap: `gap-0` … `gap-8`
		 * - wrap: `wrap`, `wrap-first-last`
		 *
		 * ### Examples
		 * - Default row (`space-between`, `1em` gap):
		 *   ```html
		 *   <div data-row>
		 *     <span>Label</span>
		 *     <span>Value</span>
		 *   </div>
		 *   ```
		 * - Centered main axis, tighter gap, wrap:
		 *   ```html
		 *   <div data-row="center gap-2 wrap">
		 *     <span>Label</span>
		 *     <span>Value</span>
		 *   </div>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-row]`
		 */
		'data-row'?: string | boolean

		/**
		 * ## [data-row-item]
		 *
		 * Flex row child: basis, flex growth, and wrap-axis alignment tokens read by the parent `[data-row]` / `[data-badge]` / `<summary>` flex shell.
		 *
		 * ### Placement
		 * - Direct child of `[data-row]`, `[data-badge]`, or `<summary>` when that parent establishes the row flex container.
		 *
		 * ### Tokens
		 * - growth: `flexible`
		 * - basis: `basis-1`..`basis-6`, `basis-full`
		 * - wrap alignment: `wrap-start`, `wrap-center`, `wrap-end`
		 *
		 * ### Examples
		 * - `basis-3` + `flexible`:
		 *   ```html
		 *   <div data-row>
		 *     <span data-row-item="basis-3 flexible">Sidebar</span>
		 *     <span>Main</span>
		 *   </div>
		 *   ```
		 * - `wrap-end` on a wrapped row:
		 *   ```html
		 *   <div data-row="wrap">
		 *     <span>Title</span>
		 *     <span data-row-item="wrap-end">Action</span>
		 *   </div>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-row-item]`
		 */
		'data-row-item'?: string | boolean

		/**
		 * ## [data-safari]
		 *
		 * Workarounds for unsupported features in Safari.
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-safari]`
		 */
		'data-safari'?: string | boolean

		/**
		 * ## [data-scroll-container]
		 *
		 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
		 * item attachment, overflow, and snap helpers. `[data-scroll-container]` sets scroll axes and scroll-state container queries. Nest `[data-sticky-container]` / `[data-sticky]` for sticky insets; use `[data-scroll-item]` on children for snap and padding tricks.
		 * Measured `--scrollContainer-sizeInline` and `--scrollContainer-sizeBlock` outputs expose the owning
		 * scroll viewport dimensions to descendants; they are not authored sizing inputs.
		 *
		 * ### Placement
		 * - On scroll viewport roots and nested scroll regions that participate in the sticky inset chain (`[data-scroll-container]`).
		 *
		 * ### Tokens
		 * - scroll container: `block`, `inline`
		 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `background`, `background-always`, `backdrop-self`, `backdrop-before`, `backdrop-after`, `backdrop-stuck`, `backdrop-always`, `backdrop-none`
		 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `snap-prose`, `block-size-max`, `inline-size-max`
		 *
		 * ### CSS Variables
		 * - `--scrollContainer-perspective`: perspective applied to the scroll region.
		 * - `--scrollContainer-scrollPaddingBlockStart`, `--scrollContainer-scrollPaddingBlockEnd`
		 * - `--scrollContainer-scrollPaddingInlineStart`, `--scrollContainer-scrollPaddingInlineEnd`
		 *
		 * ### Examples
		 * - Default (both axes scrollable; omit `block` / `inline` when this matches your layout):
		 *   ```html
		 *   <main data-scroll-container>
		 *     <section>
		 *       <p>Content</p>
		 *     </section>
		 *   </main>
		 *   ```
		 * - Vertical scroll region (`block`):
		 *   ```html
		 *   <main data-scroll-container="block">
		 *     <section>
		 *       <p>Panel</p>
		 *     </section>
		 *   </main>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-scroll-container]`
		 */
		'data-scroll-container'?: string | boolean

		/**
		 * ## [data-scroll-item]
		 *
		 * Scroll/sticky subtree helpers on children of `[data-sticky-container]`: wide figures (`inline-detached` + padding match), attached rows, scroll snap, max intrinsic sizes, and overflow alignment. Many rules read `--sticky-sizeInline` and padding variables from the enclosing sticky layout.
		 *
		 * ### Placement
		 * - On descendants inside `[data-sticky-container]` that need snap, bleed, or overflow alignment (not on the scroll root itself).
		 *
		 * ### Tokens
		 * - width / bleed: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`
		 * - `flow`: retain inline-detached sizing in normal flow without a sticky stacking context
		 * - attached alignment: `underflow-start`, `underflow-center`, `underflow-end`, `overflow-start`, `overflow-center`, `overflow-end`
		 * - snap / size: `snap-block-start`, `snap-block-end`, `snap-prose`, `block-size-max`, `inline-size-max`
		 * - `snap-prose`: direct children and all nested paragraphs/list items clear the enclosing sticky inset by half their inherited column/list gap.
		 *
		 * ### Examples
		 * - Bleed + block-end padding match (`inline-detached` + `padding-match-end`):
		 *   ```html
		 *   <section data-scroll-item="inline-detached padding-match-end">
		 *     <figure>
		 *       <img src="figure.png" alt="" />
		 *     </figure>
		 *   </section>
		 *   ```
		 * - Scroll snap at block start:
		 *   ```html
		 *   <section data-scroll-item="snap-block-start">
		 *     <h2>Panel</h2>
		 *   </section>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-scroll-item]`
		 */
		'data-scroll-item'?: string | boolean

		/**
		 * ## [data-scroll-snap]
		 *
		 * Mandatory scroll snapping on the owning scroll viewport.
		 *
		 * ### Placement
		 * - On the element whose overflow scrolls; does not establish overflow or containment.
		 *
		 * ### Tokens
		 * - `block`, `inline`: snapping axis; defaults to both axes.
		 * - `unless-hovered`: release snapping while the scroll viewport is hovered.
		 *
		 * ### Examples
		 * - Follow snap targets until the pointer enters the scroll viewport:
		 *   ```html
		 *   <nav data-scroll-container="block" data-scroll-snap="block unless-hovered">
		 *     <a href="#section" style="scroll-snap-align: start">Section</a>
		 *   </nav>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-scroll-snap]`
		 */
		'data-scroll-snap'?: string | boolean

		/**
		 * ## [data-stack]
		 *
		 * Overlay direct children in one shared grid cell (`grid-area: stack`). Presence only (no tokens).
		 *
		 * ### Examples
		 * - Badge over media:
		 *   ```html
		 *   <div data-stack>
		 *     <img src="cover.jpg" alt="" />
		 *     <span>New</span>
		 *   </div>
		 *   ```
		 * - Image, overlay, caption in one cell:
		 *   ```html
		 *   <div data-stack>
		 *     <img src="hero.png" alt="" />
		 *     <div class="overlay"></div>
		 *     <p>Caption</p>
		 *   </div>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-stack]`
		 */
		'data-stack'?: string | boolean

		/**
		 * ## [data-sticky]
		 *
		 * Sticky panel: `position: sticky` with scroll-state container queries for optional item backgrounds and frosted backdrop. Space-separated attribute tokens select block vs inline axis, which edges stick, and background visibility; max sizes use `--scrollContainer-size*` minus resolved sticky insets from ancestor containers.
		 *
		 * ### Placement
		 * - On the element that should stick, inside a subtree bounded by `[data-sticky-container]` (and under `[data-scroll-container]`).
		 *
		 * ### Tokens
		 * - axis: `block`, `inline`
		 * - block edges: `block-start`, `block-end`
		 * - inline edges: `inline-start`, `inline-end`
		 * - background: `background`, `background-always`
		 * - backdrop placement: `backdrop-self`, `backdrop-before`, `backdrop-after`
		 * - backdrop condition: `backdrop-always`, `backdrop-stuck`, `backdrop-none`
		 *   Backdrop conditions require an explicit backdrop placement token.
		 *
		 * ### CSS Variables
		 * - `--sticky-backgroundColor`
		 * - `--sticky-background`: optional complete background override; use `none` for filter-only surfaces; reduced transparency uses the shared color fallback.
		 * - `--sticky-backdropFilter`
		 * - `--sticky-zIndex`: foreground stacking layer; defaults to `1`.
		 * - `--sticky-offset`: optional inset override for all sticky axes; `auto` retains ordinary-flow offsets.
		 * - `--sticky-position`: positioning participation; defaults to `sticky`; `relative` preserves local containing blocks in normal flow.
		 *
		 * ### Examples
		 * - Default sticky on both axes (omit axis and edge tokens):
		 *   ```html
		 *   <header data-sticky>
		 *     <h1>Title</h1>
		 *   </header>
		 *   ```
		 * - `block-start` (narrow column sidebar):
		 *   ```html
		 *   <nav data-sticky="block-start">Sections</nav>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-sticky]`
		 */
		'data-sticky'?: string | boolean

		/**
		 * ## [data-sticky-breadcrumb]
		 *
		 * Native sticky breadcrumbs use independent source and metadata dimensions to compose compact rows.
		 * A source retains its intrinsic layout box while its real item receives paint transforms.
		 * Compose the position with `data-sticky` for explicit backdrop placement.
		 * Without measured geometry, breadcrumb containers retain normal document flow.
		 *
		 * ### Placement
		 * - A scope contains its position (directly or inside details), followed by content and a flow marker.
		 * - The entry flow marker contains measure elements for independent item and row size clocks.
		 * - Source, item, support and end roles belong inside that position; nested scopes inherit the parent row.
		 * - Closed summaries retain their own end-content dimensions and destination clocks; sticky motion and arrival measurements apply only to open disclosures.
		 *
		 * ### Tokens
		 * - `scope`: natural section and animation-start fragment target containing a position and its following content
		 * - `clearance`: combines with `scope` to measure and route an end cluster around a circular obstacle; arrival currently requires zero inline displacement
		 * - `root`: starts a breadcrumb hierarchy
		 * - `position`: native heading/focus container coordinating its sticky foreground and natural measurements
		 * - `source`: untransformed intrinsic reservation for the item
		 * - `item`: transformed real heading identity and native controls
		 * - `support`: supporting copy; direct summary support stays in ordinary flow below the compact foreground
		 * - `fade`: combines with support for paragraph content that fades during its final line's passage behind the occupied sticky rows; existing direct children own opacity only
		 * - `end`: independently sized in-flow metadata
		 * - `flow`: non-sticky clock for foreground arrival and heading-start snap target; support copy does not extend the clock's subject
		 * - `approach`: direct child of a destination scope providing a compact-heading approach clock ending at leading-edge contact
		 * - `exit`: combines with `flow` to mark the departure start and end from the section bottom
		 * - `size`: source/row/end size exports use paired, transform-independent horizontal clocks; source exporters share sticky participation while row and end exporters retain visible closed summaries.
		 * - `size-export`: empty absolute size container; combine with `size-source`, `size-row` or `size-end` at the corresponding natural owner.
		 * - `measure`: hidden dimension probes inside the flow marker
		 * - `item-size`: combines with `measure` in a root flow marker; its local scroll container exports compact item width and natural item height to the shared layout owner
		 *
		 * - `contents`: on a transparent `end` cluster, existing children and marker own its paint motion; omit on a painted leaf end
		 *
		 * ### CSS Variables
		 * - `--stickyBreadcrumb-itemInlineTimeline`, `--stickyBreadcrumb-itemBlockTimeline`: source dimension clocks; local names by default, entry-derived names when globally scoped
		 * - `--stickyBreadcrumb-endInlineTimeline`, `--stickyBreadcrumb-endBlockTimeline`: metadata dimension clocks; local names by default, entry-derived names when globally scoped
		 * - `--stickyBreadcrumb-entryTimeline`: unique native heading view timeline required for an animated scope; `auto` at an item forces its compact presentation
		 * - `--stickyBreadcrumb-approachTimeline`: unique view timeline for an optional approach marker; `exit-crossing -100% exit-crossing 0%` spans one heading row before contact
		 * - `--stickyBreadcrumb-endPaintAnimation`, `--stickyBreadcrumb-endPaintTimeline`, `--stickyBreadcrumb-endPaintRange`: end paint motion; `contents` directs it to existing children and marker while retaining native cluster size and timeline ownership
		 * - `--stickyBreadcrumb-entryRange`: shared arrival range from the container's leading-edge contact through trailing-edge contact; defaults to `exit-crossing 0% contain 100%`
		 * - `--stickyBreadcrumb-scale`: compact identity scale; defaults to 1
		 * - `--stickyBreadcrumb-iconRatio`: compact glyph size relative to heading text; defaults to 1.5 line heights
		 * - `--stickyBreadcrumb-iconScale`: final painted icon scale relative to its source; derived for glyphs, configurable on images
		 * - `--stickyBreadcrumb-gap`: compact item gap; defaults to 1rem
		 * - `--stickyBreadcrumb-markerSize`: physical separator slot between adjacent headings; defaults to 0px
		 * - `--stickyBreadcrumb-paddingBlock`: compact row padding; defaults to 0.5rem
		 * - `--stickyBreadcrumb-minBlockSize`: minimum compact identity height; defaults to 0px
		 * - `--stickyBreadcrumb-forceRow`: starts a row when 1
		 * - `--stickyBreadcrumb-easing`: scale and fade curve; omitted preserves their individual defaults. Rounded arrival retains standard InOutExpo pacing
		 * - `--stickyBreadcrumb-inlineEasing`: horizontal motion and scaling override; defaults to the shared curve or OutExpo
		 * - `--stickyBreadcrumb-exitAnimation`: scope input for row and backdrop departure animations; `none` retains the row while its support content keeps scrolling
		 * - `--stickyBreadcrumb-availableInlineSize`: available compact row width; defaults to 100cqi
		 * - `--stickyBreadcrumb-insetBlockStart`: initial hierarchy inset
		 * - `--stickyBreadcrumb-sourcePaddingBlock`, `--stickyBreadcrumb-sourcePaddingInline`: padding at the real position owner
		 *
		 * - `--stickyBreadcrumb-endClearance`: nonnegative maximum inline paint displacement reserved by the real title/end row when analytic clearance is unavailable; defaults to 0px
		 * - `--stickyBreadcrumb-clearance`: `circle` enables circle clearance for the scope; omitted retains ordinary end motion
		 * - `--stickyBreadcrumb-clearanceInlineOffset`: signed inline offset of the end relative to the obstacle center; defaults to 0px
		 * - `--stickyBreadcrumb-clearanceGap`: block lead for a tangent-continuous rounded dodge; defaults to 0px (sharp contact for positive inline offsets); positive offsets require a positive gap for continuous arrival
		 * - `--stickyBreadcrumb-clearanceRadius`, `--stickyBreadcrumb-clearanceCenterBlock`: vertical obstacle radius and block center in viewport coordinates
		 * - `--stickyBreadcrumb-clearanceInlineRadius`: optional horizontal radius; defaults to the vertical radius
		 *
		 * ### Examples
		 * - Native heading and its natural-flow boundary:
		 *   ```html
		 *   <section id="section" data-sticky-container data-sticky-breadcrumb="scope" style="--stickyBreadcrumb-entryTimeline: --section-entry">
		 *     <header data-sticky="block block-start backdrop-after backdrop-stuck" data-sticky-breadcrumb="position">
		 *       <div data-row data-sticky="block block-start backdrop-self backdrop-always">
		 *         <div data-sticky-breadcrumb="source" data-row-item="flexible">
		 *           <a data-sticky-breadcrumb="item" href="#section"><h2>Section</h2></a>
		 *         </div>
		 *       </div>
		 *     </header>
		 *     <div>Section content</div>
		 *     <span data-sticky-breadcrumb="flow" aria-hidden="true"><span data-sticky-breadcrumb="measure"></span></span>
		 *     <span data-sticky-breadcrumb="flow exit" aria-hidden="true"></span>
		 *   </section>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-sticky-breadcrumb]`
		 */
		'data-sticky-breadcrumb'?: string | boolean

		/**
		 * ## [data-sticky-container]
		 *
		 * Sticky inset scope inside `[data-scroll-container]`: `isolation: isolate`, margin/padding inputs for the sticky math chain, and defaults for scroll-item “inline detached” clamp variables. Nest to deepen `--sticky-level` (`--sticky1-*` … `--sticky5-*`); descendants `[data-sticky]` and `[data-scroll-item]` consume the resolved insets and sizes.
		 *
		 * ### Placement
		 * - Anywhere under an ancestor `[data-scroll-container]` that should define a nested sticky/scroll-item scope (often wrapping a column that contains `[data-sticky]` and `[data-scroll-item]`).
		 *
		 * ### CSS Variables
		 * - `--sticky-marginBlockStart`, `--sticky-marginBlockEnd`, `--sticky-marginInlineStart`, `--sticky-marginInlineEnd`
		 * - `--sticky-paddingBlockStart`, `--sticky-paddingBlockEnd`, `--sticky-paddingInlineStart`, `--sticky-paddingInlineEnd`
		 * - `--scrollItem-inlineDetached-maxSize`, `--scrollItem-inlineDetached-paddingStart`, `--scrollItem-inlineDetached-maxPaddingMatchStart`, `--scrollItem-inlineDetached-paddingEnd`, `--scrollItem-inlineDetached-maxPaddingMatchEnd`
		 *
		 * ### Examples
		 * - Nested sticky scope (pair with an ancestor `[data-scroll-container]` in real pages):
		 *   ```html
		 *   <aside data-sticky-container>
		 *     <nav data-sticky="block-start">Sidebar</nav>
		 *   </aside>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-sticky-container]`
		 */
		'data-sticky-container'?: string | boolean

		/**
		 * ## [data-tag]
		 *
		 * Semantic tag / chip with category-based color families tied to theme variables. Omit a category token for the neutral palette; add one for a themed family.
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
		 * ### Examples
		 * - Neutral palette (omit category token):
		 *   ```html
		 *   <span data-tag>Label</span>
		 *   ```
		 * - `eip` family:
		 *   ```html
		 *   <button type="button" data-tag="eip">EIP-7702</button>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-tag]`
		 */
		'data-tag'?: string | boolean

		/**
		 * ## [data-visually-hidden]
		 *
		 * Visually hides an element while retaining its content in the accessibility tree and its accessible name.
		 *
		 * ### Applied to
		 * - Any element whose text is replaced visually by an icon or other presentation.
		 *
		 * ### Examples
		 * - Keep an icon-only control's name available to assistive technology:
		 *   ```html
		 *   <button type="button"><span data-visually-hidden>Open menu</span>☰</button>
		 *   ```
		 *
		 * ### Source
		 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-visually-hidden]`
		 */
		'data-visually-hidden'?: string | boolean
	}

	declare namespace astroHTML.JSX {
		interface HTMLAttributes extends CssAttributes {}
	}
}

declare module 'svelte/elements' {
	// eslint-disable-next-line unused-imports/no-unused-vars -- `T` must match Svelte's `HTMLAttributes<T>` declaration for the merge to apply.
	export interface HTMLAttributes<T extends EventTarget> extends CssAttributes {}
}
