interface CssAttributes {
	/**
	 * ## [data-badge]
	 *
	 * Compact badge / chip surface with size modifiers. Chip uses the medium size when the attribute is present without a token.
	 *
	 * ### Tokens
	 * - `small`, `medium`, `large`
	 *
	 * ### CSS Variables
	 * - `--badge-backgroundColor`
	 * - `--badge-borderColor`
	 * - `--badge-textColor`
	 *
	 * ### Examples
	 * - Default size (medium — omit token):
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
	 * Shared disclosure / accordion styling for native `<details>` and optional `[data-collapsible]` wrappers. Disclosure animation and summary chevron apply to `<details>`. `data-collapsible` documents the hook and can mark optional wrappers if you add them in markup.
	 *
	 * ### Applied to
	 * - `<details>`
	 *
	 * ### Examples
	 * - Native disclosure (`details` picks up animation and summary chrome — omit `data-collapsible` when you do not need the hook):
	 *   ```html
	 *   <details>
	 *     <summary>More</summary>
	 *     <p>Hidden body.</p>
	 *   </details>
	 *   ```
	 * - `data-collapsible` + `data-card` padding split between summary and body:
	 *   ```html
	 *   <details data-collapsible data-card="padding-6">
	 *     <summary data-row="wrap wrap-first-last">Title row</summary>
	 *     <p>Body</p>
	 *   </details>
	 *   ```
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-collapsible]`
	 */
	'data-collapsible'?: string | boolean

	/**
	 * ## [data-column]
	 *
	 * One-column grid primitive for `[data-column]` (alignment + gap tokens). `[data-card]` shares the
	 * same column/grid defaults before card-specific rules apply below. Single-column grid with theme gap and alignment defaults. Add space-separated tokens on `data-column` for `~=` selectors.
	 *
	 * ### Applied to
	 * - `[data-card]`
	 *
	 * ### Tokens
	 * - alignment: `start`, `center`, `end`
	 * - spacing: `gap-0`, `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`
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
	 * ## [data-input]
	 *
	 * Shared button and form-control surface for native controls and optional `[data-input]` wrappers. Native `<button>`, `<select>`, `<input>`, and checkbox or radio `<label>`s use this chrome automatically. Add `data-input` on a wrapper or extra element when you want the same look outside those tags. No `~=` tokens yet.
	 *
	 * ### Applied to
	 * - `<button>`
	 * - `<select>`
	 * - `<input>`
	 * - `<label>` wrapping checkbox or radio inputs
	 *
	 * ### Examples
	 * - Native control (no `data-input`):
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
	 * Shared link styling with optional camouflaged mode. `<a>` gets accent link chrome by default (no `data-link`). Add `data-link` on non-anchor elements when you want the same treatment; on `<a>`, use `data-link` only for non-default modes such as `camouflaged`.
	 *
	 * ### Tokens
	 * - `camouflaged` (exact `=` selector).
	 *
	 * ### CSS Variables
	 * - `--text-primary`
	 * - `--accent`
	 *
	 * ### Examples
	 * - Default link chrome (`<a>` — no `data-link`):
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
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 *
	 * ### Examples
	 * - Native list (`ul` / `ol` use the same rules as `[data-list]` — omit `data-list` when defaults suffice):
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
	 */
	'data-list'?: string | boolean

	/**
	 * ## [data-list-item]
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
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 *
	 * ### Examples
	 * - Native list (`ul` / `ol` use the same rules as `[data-list]` — omit `data-list` when defaults suffice):
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
	 * List row: per-item vertical rhythm (`data-list-item` gap tokens), marker column (`::before` / `data-list-item-marker`), and padding that pairs with `[data-list]` / `[data-card]` list padding.
	 *
	 * ### Placement
	 * - Direct child of `[data-list]`, `ul`, or `ol` — use native `<li>` or `[data-list-item]` for the same rules.
	 * - `data-list-item-marker` is an optional attribute on that same row when you want a custom marker string (otherwise the default bullet glyph applies).
	 *
	 * ### Tokens
	 * - item vertical gap: `gap-0` … `gap-6` on `data-list-item`
	 * - marker: free text via `data-list-item-marker` (attribute value, not a `~=` token list)
	 *
	 * ### CSS Variables
	 * - `--listItem-gap` (per row, driven by `data-list-item`)
	 *
	 * ### Examples
	 * - Per-row vertical rhythm (`gap-4` between blocks inside one item — omit `data-list-item` when default `gap-1` / `0.25lh` is fine):
	 *   ```html
	 *   <ul>
	 *     <li data-list-item="gap-4">
	 *       <p>Lead</p>
	 *       <p>Detail</p>
	 *     </li>
	 *   </ul>
	 *   ```
	 * - Custom marker string (`data-list-item-marker`):
	 *   ```html
	 *   <ul>
	 *     <li data-list-item-marker="‣">Step one</li>
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
	 * List layout: grid gap and marker column on `[data-list]`, `ul`, or `ol`. Per-row spacing and custom markers are documented on the list-item child rule below.
	 *
	 * ### Placement
	 * - On the list host: `[data-list]`, `ul`, or `ol` (including inside `[data-card]`).
	 *
	 * ### Tokens
	 * - list gap: `gap-0` … `gap-6`
	 *
	 * ### CSS Variables
	 * - `--list-marker-inlineSize`
	 * - `--list-markerGap`
	 * - `--list-gap`
	 *
	 * ### Examples
	 * - Native list (`ul` / `ol` use the same rules as `[data-list]` — omit `data-list` when defaults suffice):
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
	 * List row: per-item vertical rhythm (`data-list-item` gap tokens), marker column (`::before` / `data-list-item-marker`), and padding that pairs with `[data-list]` / `[data-card]` list padding.
	 *
	 * ### Placement
	 * - Direct child of `[data-list]`, `ul`, or `ol` — use native `<li>` or `[data-list-item]` for the same rules.
	 * - `data-list-item-marker` is an optional attribute on that same row when you want a custom marker string (otherwise the default bullet glyph applies).
	 *
	 * ### Tokens
	 * - item vertical gap: `gap-0` … `gap-6` on `data-list-item`
	 * - marker: free text via `data-list-item-marker` (attribute value, not a `~=` token list)
	 *
	 * ### CSS Variables
	 * - `--listItem-gap` (per row, driven by `data-list-item`)
	 *
	 * ### Examples
	 * - Per-row vertical rhythm (`gap-4` between blocks inside one item — omit `data-list-item` when default `gap-1` / `0.25lh` is fine):
	 *   ```html
	 *   <ul>
	 *     <li data-list-item="gap-4">
	 *       <p>Lead</p>
	 *       <p>Detail</p>
	 *     </li>
	 *   </ul>
	 *   ```
	 * - Custom marker string (`data-list-item-marker`):
	 *   ```html
	 *   <ul>
	 *     <li data-list-item-marker="‣">Step one</li>
	 *   </ul>
	 *   ```
	 *
	 * ### Source
	 * @see [src/styles/css-attributes.css](./css-attributes.css) `[data-list-item]`
	 */
	'data-list-item-marker'?: string | boolean

	/**
	 * ## [data-pressable]
	 *
	 * Consistent press-state feedback across interactive elements. Dims and scales slightly while active so press feedback matches across controls and custom targets.
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
	 * ## [data-row]
	 *
	 * Flex row primitive: alignment, gap, and wrap on `[data-row]`, `[data-badge]`, and `<summary>`. Child `data-row-item` tokens are documented on the nested row-item rule below; badge size tokens stay on `[data-badge]`.
	 *
	 * ### Placement
	 * - On `[data-row]`, `[data-badge]`, or `<summary>` when it is the flex row container (not on `data-row-item` children).
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
	 * Flex row primitive: alignment, gap, and wrap on `[data-row]`, `[data-badge]`, and `<summary>`. Child `data-row-item` tokens are documented on the nested row-item rule below; badge size tokens stay on `[data-badge]`.
	 *
	 * ### Placement
	 * - On `[data-row]`, `[data-badge]`, or `<summary>` when it is the flex row container (not on `data-row-item` children).
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
	 *
	 * ---
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
	 * ## [data-scroll-container]
	 *
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers. `[data-scroll-container]` sets scroll axes and scroll-state container queries. Nest `[data-sticky-container]` / `[data-sticky]` for sticky insets; use `data-scroll-item` on children for snap and padding tricks.
	 *
	 * ### Placement
	 * - On scroll viewport roots and nested scroll regions that participate in the sticky inset chain (`[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
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
	 *
	 * ---
	 *
	 * Sticky inset scope inside `[data-scroll-container]`: `isolation: isolate`, margin/padding inputs for the sticky math chain, and defaults for scroll-item “inline detached” clamp variables. Nest to deepen `--sticky-level` (`--sticky1-*` … `--sticky4-*`); descendants `[data-sticky]` and `[data-scroll-item]` consume the resolved insets and sizes.
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
	 *
	 * ---
	 *
	 * Sticky panel: `position: sticky` with scroll-state container queries for optional frosted backdrop (`::before` or nested `[data-scroll-container]`). Space-separated `~=` tokens pick block vs inline axis, which edges stick, and backdrop visibility; max sizes use `--scrollContainer-size*` minus resolved sticky insets from ancestor containers.
	 *
	 * ### Placement
	 * - On the element that should stick, inside a subtree bounded by `[data-sticky-container]` (and under `[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - axis: `block`, `inline`
	 * - block edges: `block-start`, `block-end`
	 * - inline edges: `inline-start`, `inline-end`
	 * - backdrop: `backdrop-none`, `backdrop-always`
	 *
	 * ### CSS Variables
	 * - `--sticky-backgroundColor`, `--sticky-backdropFilter`, `--sticky-backdropMaskImage`
	 *
	 * ### Examples
	 * - Default block-axis sticky (omit edge tokens when both block edges are fine):
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
	'data-scroll-container'?: string | boolean

	/**
	 * ## [data-scroll-item]
	 *
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers. `[data-scroll-container]` sets scroll axes and scroll-state container queries. Nest `[data-sticky-container]` / `[data-sticky]` for sticky insets; use `data-scroll-item` on children for snap and padding tricks.
	 *
	 * ### Placement
	 * - On scroll viewport roots and nested scroll regions that participate in the sticky inset chain (`[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
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
	 *
	 * ---
	 *
	 * Sticky inset scope inside `[data-scroll-container]`: `isolation: isolate`, margin/padding inputs for the sticky math chain, and defaults for scroll-item “inline detached” clamp variables. Nest to deepen `--sticky-level` (`--sticky1-*` … `--sticky4-*`); descendants `[data-sticky]` and `[data-scroll-item]` consume the resolved insets and sizes.
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
	 *
	 * ---
	 *
	 * Scroll/sticky subtree helpers on children of `[data-sticky-container]`: wide figures (`inline-detached` + padding match), attached rows, scroll snap, max intrinsic sizes, and overflow alignment. Tokens are space-separated for `~=`; many rules read `--sticky-sizeInline` / padding variables from enclosing sticky layout.
	 *
	 * ### Placement
	 * - On descendants inside `[data-sticky-container]` that need snap, bleed, or overflow alignment (not on the scroll root itself).
	 *
	 * ### Tokens
	 * - width / bleed: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`
	 * - attached alignment: `underflow-start`, `underflow-center`, `underflow-end`, `overflow-start`, `overflow-center`, `overflow-end`
	 * - snap / size: `snap-block-start`, `snap-block-end`, `block-size-max`, `inline-size-max`
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
	 * ## [data-stack]
	 *
	 * Overlay direct children in one shared grid cell (`grid-area: stack`). Presence only; no `~=` tokens.
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
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers. `[data-scroll-container]` sets scroll axes and scroll-state container queries. Nest `[data-sticky-container]` / `[data-sticky]` for sticky insets; use `data-scroll-item` on children for snap and padding tricks.
	 *
	 * ### Placement
	 * - On scroll viewport roots and nested scroll regions that participate in the sticky inset chain (`[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
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
	 *
	 * ---
	 *
	 * Sticky inset scope inside `[data-scroll-container]`: `isolation: isolate`, margin/padding inputs for the sticky math chain, and defaults for scroll-item “inline detached” clamp variables. Nest to deepen `--sticky-level` (`--sticky1-*` … `--sticky4-*`); descendants `[data-sticky]` and `[data-scroll-item]` consume the resolved insets and sizes.
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
	 *
	 * ---
	 *
	 * Sticky panel: `position: sticky` with scroll-state container queries for optional frosted backdrop (`::before` or nested `[data-scroll-container]`). Space-separated `~=` tokens pick block vs inline axis, which edges stick, and backdrop visibility; max sizes use `--scrollContainer-size*` minus resolved sticky insets from ancestor containers.
	 *
	 * ### Placement
	 * - On the element that should stick, inside a subtree bounded by `[data-sticky-container]` (and under `[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - axis: `block`, `inline`
	 * - block edges: `block-start`, `block-end`
	 * - inline edges: `inline-start`, `inline-end`
	 * - backdrop: `backdrop-none`, `backdrop-always`
	 *
	 * ### CSS Variables
	 * - `--sticky-backgroundColor`, `--sticky-backdropFilter`, `--sticky-backdropMaskImage`
	 *
	 * ### Examples
	 * - Default block-axis sticky (omit edge tokens when both block edges are fine):
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
	 * ## [data-sticky-container]
	 *
	 * Scroll / sticky coordination: scroll container axis, nested sticky scopes, sticky items, and scroll
	 * item attachment, overflow, and snap helpers. `[data-scroll-container]` sets scroll axes and scroll-state container queries. Nest `[data-sticky-container]` / `[data-sticky]` for sticky insets; use `data-scroll-item` on children for snap and padding tricks.
	 *
	 * ### Placement
	 * - On scroll viewport roots and nested scroll regions that participate in the sticky inset chain (`[data-scroll-container]`).
	 *
	 * ### Tokens
	 * - scroll container: `block`, `inline`
	 * - sticky: `block`, `block-start`, `block-end`, `inline`, `inline-start`, `inline-end`, `backdrop-none`, `backdrop-always`
	 * - scroll item: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`, `underflow-start|center|end`, `overflow-start|center|end`, `snap-block-start|end`, `block-size-max`, `inline-size-max`
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
	 *
	 * ---
	 *
	 * Sticky inset scope inside `[data-scroll-container]`: `isolation: isolate`, margin/padding inputs for the sticky math chain, and defaults for scroll-item “inline detached” clamp variables. Nest to deepen `--sticky-level` (`--sticky1-*` … `--sticky4-*`); descendants `[data-sticky]` and `[data-scroll-item]` consume the resolved insets and sizes.
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
	 *
	 * ---
	 *
	 * Scroll/sticky subtree helpers on children of `[data-sticky-container]`: wide figures (`inline-detached` + padding match), attached rows, scroll snap, max intrinsic sizes, and overflow alignment. Tokens are space-separated for `~=`; many rules read `--sticky-sizeInline` / padding variables from enclosing sticky layout.
	 *
	 * ### Placement
	 * - On descendants inside `[data-sticky-container]` that need snap, bleed, or overflow alignment (not on the scroll root itself).
	 *
	 * ### Tokens
	 * - width / bleed: `inline-detached`, `inline-attached`, `padding-match-start`, `padding-match-end`
	 * - attached alignment: `underflow-start`, `underflow-center`, `underflow-end`, `overflow-start`, `overflow-center`, `overflow-end`
	 * - snap / size: `snap-block-start`, `snap-block-end`, `block-size-max`, `inline-size-max`
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
	'data-sticky-container'?: string | boolean

	/**
	 * ## [data-tag]
	 *
	 * Semantic tag / chip with category-based color families (`~=` tokens map to theme variables). Omit a category token for the neutral palette; add one for a themed family (`~=` in CSS).
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
}

declare namespace astroHTML.JSX {
	interface HTMLAttributes extends CssAttributes {}
}

declare module 'svelte/elements' {
	export interface HTMLAttributes<_T extends EventTarget> extends CssAttributes {}
}
