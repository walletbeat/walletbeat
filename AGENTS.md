## 1. Semantic heading hierarchy

1. The page has exactly one real `<h1>`.
2. Stage Progress and every attribute-group heading are real `<h2>` elements.
3. Attribute headings are real `<h3>` elements.
4. Details headings are real `<h4>` elements.
5. Source order remains logical: H1 → H2 → H3 → H4.
6. Sticky breadcrumbs transform the real headings/links; they are not duplicate visual headings.
7. IDs are unique, stable, and usable as hash targets.
8. Every heading remains readable and reachable without JavaScript.

## 2. Stage Progress must be an ordinary H2

1. Stage Progress must use the same heading component and `BreadcrumbHeadingAnimation` mechanism as every other H2.
2. It must use the same sticky lane, scale, transition, marker, animation timeline, activation range, and exit behavior.
3. It must receive the same backdrop as every other H2.
4. It must be replaced by the following H2 exactly as one group H2 replaces another.
5. It must not linger underneath or overlap the next H2.
6. It must follow the same reduced-motion and browser-fallback behavior.
7. There must be no Stage-specific exception unless an independently measurable semantic difference requires one.

## 3. Uniform H2 backdrop

Every H2—Stage Progress included—must receive the same backdrop:

1. Same surface color.
2. Same opacity.
3. Same blur treatment.
4. Same geometry and coverage.
5. Same activation threshold.
6. Same animation range.
7. Same stacking behavior.
8. Same reduced-transparency fallback.
9. No gap, seam, flash, or change in surface when one H2 replaces another.
10. The backdrop’s timeline must be owned by a non-sticky source capable of progressing; a sticky consumer must not attempt to drive its own stalled view timeline.

## 4. Breadcrumb stack

1. H1, H2, H3, and H4 occupy deterministic lanes.
2. Adjacent levels never collide, overlap, or exchange vertical order.
3. Forced wrapping at narrow widths must preserve the hierarchy.
4. Group and attribute transitions must remain continuous in both scroll directions.
5. Rapid reversal must not leave stale headings or icons behind.
6. Outgoing breadcrumb content must leave before the incoming scope becomes visually authoritative.
7. Direct navigation from one group to another must not retain the previous group’s heading, icon, marker, or companions.
8. Breadcrumb elements must not jump more than an ordinary frame-to-frame movement while visible.
9. Fixed-position handoffs must preserve the original flow reservation so surrounding content does not collapse.

## 5. Heading markers and separators

1. A `›` appears only where two actual breadcrumb levels are adjacent.
2. There are no missing, duplicated, or orphaned separators.
3. Group headings use their permalink `#` only on hover or keyboard focus when they are not acting as breadcrumb ancestors.
4. Attribute breadcrumb relationships retain the appropriate `›`.
5. H4 permalink `#` appears only on hover/focus and causes zero text shift.
6. Permalink markers yield to breadcrumb separators when that heading becomes part of the active breadcrumb trail.
7. Marker changes do not alter heading alignment.

## 6. Icon alignment—both icon systems

### Pie-navigation icons

1. Each navigation icon is centered on the canonical label point of its corresponding pie slice.
2. The icon’s center is derived from the same start angle, angular span, inner radius, outer radius, and label radius as the slice.
3. Icons remain upright while the pie rotates.
4. Group and child slice icons use the same angular coordinate system.
5. Icon placement is correct for every slice count, not only the currently visible wallet.
6. RTL reverses direction logically without breaking centering.
7. There are no per-icon pixel nudges masking incorrect geometry.

### Content-slice glyphs

1. Every `.attribute-group-icon` and `.attribute-icon` glyph aligns with its slice’s computed label point.
2. Alignment must hold in normal flow, during sticky entry, while stuck, and during exit.
3. The glyph, slice, and heading must share one geometry source.
4. Repeated anchors must be scoped to the relevant summary/header owner.
5. An icon must never resolve against a later or earlier section’s identically named anchor.
6. Closed details must not expose a ghost icon or sticky anchor.
7. Icon alignment must be measured by center-point error, not judged only by screenshots.

## 7. Slice geometry

1. Content slices and navigation slices use the same mathematical construction.
2. Group and child slices share exact start-angle derivations.
3. Gaps, inner and outer radii, corner radii, offsets, and large/small arc selection must match.
4. Slice paths must remain correct across item counts and responsive sizes.
5. No hand-authored approximation may diverge from the canonical Pie geometry.
6. The current slice must resolve correctly after hash navigation, popover interaction, resize, and reverse scrolling.

## 8. Summary-side badges and metadata

The final requirement supersedes the earlier “never wrap” interpretation:

1. The right-side badges and metadata form one end-aligned cluster.
2. The cluster’s right edge aligns with the content edge.
3. Individual badges/tokens do not wrap internally.
4. The cluster may wrap between whole badges when necessary.
5. Every resulting row remains end-aligned.
6. Badges stay on one row when sufficient space exists; wrapping must not be forced arbitrarily.
7. Wrapped badges must form clean rows, not hang between heading lines.
8. The cluster must not overlap the heading.
9. It must not overflow the card or viewport.
10. It must not produce broken text, clipped pills, or isolated fragments.
11. Fixed/sticky handoff must preserve the cluster’s flow reservation.
12. Heading, icon, badges, and summary content must remain aligned at every tested width.
13. Narrow mobile layouts may intentionally stack, but the stack must be deterministic and visually aligned.

## 9. H4/details behavior

1. The native details chevron remains visible, aligned at the far edge, and clickable.
2. Clicking the summary continues to toggle the native `<details>`.
3. Closed details contribute no sticky heading, icon, badge, or invisible collision box.
4. H4 becomes sticky only when its open content legitimately participates.
5. Its sticky inset meets the preceding breadcrumb lane exactly.
6. Its background appears only when stuck.
7. Native keyboard and focus behavior must remain intact.

## 10. Wallet header and root transition

1. The wallet title and wallet icon begin at their exact in-flow positions.
2. They settle continuously into the sticky header.
3. Title movement uses translation where endpoints are derivable.
4. Heading scaling uses transforms rather than animated font size.
5. The wallet icon reaches a physical final size of 32×32.
6. Icon resizing uses scale rather than per-frame width/height changes.
7. Short and long wallet names both work.
8. Long-name handling must not collide with the site logo.
9. Collision reservation must remain stable and must not cause a container-query state to flip during animation.
10. The site logo remains centered unless the defined long-name fallback moves it vertically.
11. No element reverses direction on either axis during a monotonic scroll.
12. Variant-picker positioning and morphing remain aligned with the header.
13. The circular variant control matches the canonical 2rem circle-control size.
14. Header, title, icon, badges, and Overview align on mobile.
15. The header surface activates at the correct height and moment.

## 11. Navigation and TOC architecture

1. Remove the old attribute-group-level pie and TOC sections and their obsolete animation machinery.
2. Render one `NavigationItems` dataset for both pie navigation and TOC behavior.
3. Do not modify `NavigationItems` markup merely to accommodate animation.
4. The same aside/TOC DOM exists before Stage Progress in source order at every breakpoint.
5. There is one responsive layout owner, not separate desktop and mobile page structures.
6. Only the TOC panel is a native popover.
7. The inline pie is not semantically coupled to the popover’s closed state.
8. The TOC has no redundant “Table of Contents” title.
9. It has no redundant “Platforms” heading.
10. TOC links and pie slices target the same unique IDs.
11. The TOC grid accommodates the longest depth-two labels without track overflow.
12. Popover open/close, keyboard focus, Escape, and click behavior work in Chromium, WebKit, and Firefox.
13. Native no-JS operation remains available; controls requiring JavaScript are hidden without JavaScript.

## 12. Responsive navigation placement

1. At desktop widths, the navigation pie occupies the right-side rail.
2. The rail is sticky and does not overlap page content.
3. The current group/attribute points toward the opposite content-side viewport corner using logical directions.
4. At widths of 1024px and below, content uses the full available width and reserves no desktop TOC rail.
5. At 1025px, desktop reservation returns without an intermediate broken state.
6. In the compact layout, the pie appears at the inline end of the active sticky heading.
7. Its active slice points straight down.
8. The compact pie transitions continuously toward approximately 100×100 rather than snapping.
9. The desktop pie remains approximately 320px in its rail.
10. Nested scrolling ancestors must not establish perspective or containing blocks that prevent the fixed pie from remaining viewport-fixed.
11. Strict containment may apply only to static geometry wrappers, not to the animated/fixed handoff wrapper.
12. Geometry wrappers must remain contained inside their visual bounds.
13. RTL must mirror placement and pointing direction logically.

## 13. Pie rotation and current state

1. Rotation is synchronized with breadcrumb arrival.
2. There is no visible lag or overshoot.
3. Group and attribute rotation ranges derive from the same shared transition boundaries as their headings.
4. The current slice updates correctly during scrolling.
5. `:target-current` and related target state must invalidate correctly.
6. Direct hash navigation must immediately converge on the correct current slice.
7. Opening or closing the TOC must not corrupt the active slice.
8. Current items remain interactive where interaction is intended.
9. Pointer-event handling must not block unrelated controls or content.

## 14. Hash navigation and scroll ownership

1. Every group, attribute, and H4 hash target lands unobscured below the active header and breadcrumb stack.
2. This holds for direct navigation, initial page load with a hash, post-hydration navigation, and browser back/forward.
3. Arrival must be determined from settled geometry, not a fixed timeout.
4. Smooth scrolling and proximity snapping must not compete.
5. Exactly one mechanism owns each navigation movement.
6. Scroll padding and target margins must be correct for both enhanced and fallback modes.
7. Firefox may use a different numeric inset if the target is nevertheless fully unobscured; the invariant is the visible result.
8. Small wheel deltas, large jumps, touch-like trajectories, and rapid direction reversal must all converge correctly.
9. Lazy content, font loading, hydration, and resize must not invalidate the final target position.
10. Bottom-of-page and footer transitions must complete without stranded sticky content.

## 15. Motion and rendering performance

1. Visible motion uses `translate`, `scale`, and `opacity` whenever endpoints are derivable.
2. Wallet-title movement uses translation.
3. Heading compression uses scale.
4. Wallet-icon resizing uses inverse scale.
5. Compact-pie horizontal movement uses translation.
6. Pie resizing uses scale.
7. Long-name logo exit uses translation.
8. Animated inset properties remain only where anchor-derived coordinates cannot be expressed as transforms.
9. No JavaScript scroll listeners.
10. No per-scroll-frame runtime style construction.
11. No animation dependency or scroll-timeline polyfill.
12. No animated font size, width, height, or ordinary inset where a compositor transform can express the same result.
13. No layout-feedback loops or cyclic size/anchor queries.
14. No unjustified `will-change`.
15. Motion must be monotonic during monotonic scrolling.
16. There must be no jumps, reversals, or layout shifts at transition boundaries.
17. Performance must be compared with the same machine, browser, viewport, and scroll trace.
18. The target is approximately one-frame p95 delivery, with zero or near-zero frames beyond 33ms after startup noise is excluded.
19. The change must produce no meaningful regression in p50, p95, p99, maximum frame delay, long tasks, or frame-over-budget ratios.
20. Visual smoothness must be verified with real scrolling, not inferred from property names.

## 16. Progressive enhancement and browser behavior

1. Scroll animation enhancement is gated by both:
   - `animation-timeline: scroll()`
   - `animation-range: 0% 100%`
2. Advanced nested pie rotation additionally requires the relevant anchor, scroll-state, and animation-composition support.
3. Unsupported browsers receive a simpler native sticky layout.
4. Firefox, WebKit, and Chromium must all remain usable and geometrically correct.
5. Reduced motion disables decorative interpolation while retaining correct final layout and hierarchy.
6. Reduced transparency removes blur while retaining an opaque, readable backdrop.
7. Production minification must preserve valid `animation-timeline` longhand properties.
8. Production-preview behavior must match development behavior.

## 17. Layout and visual robustness

Test at minimum:

- 390×568
- 390×844
- 480×844
- 768×900
- 864×568
- 864×900
- 1024×900
- 1025×900
- 1280×900
- 1281×900
- 1440×1200

At every relevant size:

1. No document-level horizontal overflow.
2. No component-level unintended overflow.
3. No clipped or occluded interactive element.
4. No heading/badge/icon overlap.
5. No unexplained typography change or text reflow.
6. Long labels and long wallet names remain usable.
7. Breakpoint transitions do not leave stale fixed elements.
8. Resizing preserves current navigation and sticky state.
9. Hit targets retain their intended physical size.
10. All H2 backdrops remain identical.
11. All slice icons remain centered.
12. Screenshots show no discontinuity missed by geometric assertions.

## 18. Wallet and content coverage

1. Exercise at least Ambire for long names and variants.
2. Exercise Rabby.
3. Exercise MetaMask or another short-name wallet.
4. Exercise structurally different wallets and content depths.
5. Automated structural assertions should cover all generated wallet pages where feasible.
6. Every eligible heading and transition must be measured—not only one representative Security section.

## 19. Accessibility and native behavior

1. Correct semantic heading hierarchy.
2. Unique navigable targets.
3. Keyboard-operable TOC, popover, links, and details.
4. Visible focus states.
5. Correct Escape behavior for the popover.
6. Correct accessible labels.
7. Decorative icons are hidden from assistive technology.
8. Native controls retain native semantics.
9. Reduced-motion and reduced-transparency preferences are honored.
10. No-JS content remains navigable.
11. Pointer-event optimization must not remove keyboard or touch access.

## 20. CSS and implementation conventions

1. Use logical properties and logical directions.
2. Internal calculated variables use the `---` naming convention.
3. Existing externally consumed variables retain `--`.
4. Variables are scoped at the closest shared ancestor of their consumers.
5. Calculated state must not leak globally.
6. Use modern CSS sibling-count/index and target/scroll features where supported and appropriate.
7. Dynamic positioning may use anchor positioning.
8. Legacy scroll-animation positioning is acceptable only where required by layering or sticky/fixed behavior.
9. Do not change navigation markup merely to make selectors convenient.
10. Preserve unrelated user changes and unrelated page behavior.

## 21. Irreducibility methodology

The final code is irreducible only if all of these hold:

1. One semantic role has one implementation mechanism.
2. Stage Progress does not have a parallel H2 implementation.
3. One owner defines each state, timeline, geometric value, and animation range.
4. Sticky consumers do not duplicate timeline ownership.
5. Slice geometry has one canonical derivation.
6. Sizes, offsets, and transition boundaries derive from existing primitives or actual geometry.
7. No magic breakpoint patch exists unless it expresses a genuine breakpoint invariant.
8. Repeated anchor names are narrowly scoped.
9. There are no cyclic anchor or size dependencies.
10. Superseded selectors, variables, keyframes, wrappers, and comments are deleted.
11. New overrides are not layered indefinitely over obsolete rules.
12. JavaScript is absent where CSS or native HTML supplies the required behavior.
13. Fallbacks are simpler native layouts, not duplicated enhanced implementations.
14. Every remaining rule maps to a named requirement.
15. Deleting any remaining non-foundational rule should break a named invariant; otherwise that rule is redundant.
16. Every derived value has a single authority and identifiable consumers.
17. Aliases exist only at legitimate compatibility boundaries.
18. Changed-file and selector surface is kept as small as correctness permits.
19. Production output—not merely source elegance—is included in the irreducibility assessment.

## 22. Required verification

Before calling the result acceptable:

1. Run formatting, lint, spelling, syntax, TypeScript/Astro, and full project checks.
2. Build the production site.
3. Test the production preview, particularly animation-timeline output.
4. Run the browser matrix in Chromium, WebKit, and Firefox.
5. Test top, root-header transition, Stage H2, group H2, attribute H3, open H4, closed H4, scope exit, and page bottom.
6. Test direct hashes, initial hashes, reverse scrolling, rapid reversal, resize, and breakpoint crossing.
7. Test TOC closed/open, keyboard focus, Escape, pointer use, and native no-JS behavior.
8. Test reduced motion and reduced transparency.
9. Numerically measure heading lanes, slice/icon centers, badge edges, target clearance, overflow, control sizes, and transition continuity.
10. Record performance samples and compare them to baseline.
11. Inspect screenshots after the numeric and semantic checks.
12. Distinguish harness failures from product failures.
13. Report every known failure honestly.
14. Do not call the implementation acceptable until the matrix has zero known product failures.

## 23. Superseding breadcrumb, icon, and navigation rules

The requirements in this section record the latest thread corrections. They supersede any conflicting earlier wording in this file; non-conflicting requirements above remain mandatory.

### Breadcrumb row ownership and backdrops

1. A sticky-top backdrop is provided by the first visible breadcrumb level in each wrapped row, not independently by every level occupying that row.
2. At non-mobile widths, the H1 level always provides the primary visible sticky-header backdrop for the H1 row and shares the H1 scroll-transition lifetime. An adjacent H2 is not a backdrop provider because it is not first on that row.
3. H2 or H3 provides an additional backdrop only when it is the first breadcrumb level in a subsequent wrapped row, and that backdrop lasts for the level's actual sticky lifetime. An H3 adjacent to H2 does not provide a second backdrop for that row.
4. At mobile widths, the logo or H1 level—whichever is the first item on the row that remains sticky-visible rather than having transitioned above the viewport—provides the primary sticky backdrop through the same scroll transition as that item.
5. H4 provides its row's backdrop while it is legitimately sticky and its block-start position is exactly the sum of all preceding currently visible sticky-row heights.
6. Backdrop geometry follows the breadcrumb row it covers. Its height may not exceed the row merely because a descendant's source box is taller, and the visible block padding above and below the sticky H1 must be equal.
7. All H2s still receive identical backdrop treatment. Row ownership means that an H2 adjacent to H1 is covered by the H1 row surface; when H2 begins a wrapped row it provides that same surface for its row. Stage Progress follows exactly the same rule.
8. Backdrop ownership and animation state must be expressed by the smallest recurring CSS/HTML primitive that represents row-first ownership; do not create heading-name or section-specific backdrop exceptions.

### Honest flow, sticky behavior, and transition continuity

1. Every real heading, its icon slot, and its summary-side content appears at its original in-flow position before enhancement or sticky entry.
2. H2s and H3s must scroll as genuine participants in their scroll container before becoming sticky. Do not make them continuously absolute or fixed, synthesize a source-position-plus-scroll-offset copy, block scrolling or hit testing, or give them a viewport width unrelated to their content area.
3. Sticky and fixed visual handoffs retain an exact in-flow reservation. The reservation is owned by the same layout primitive as the visual element; compensating padding, absolute positioning, and a second translation may not triple-count one slot.
4. Breadcrumb behavior includes horizontal adjacency, wrapping, separator substitution, compression, replacement by the next scope, and synchronized exit. Converting an element to native sticky is not sufficient if those behaviors disappear.
5. Every breadcrumb part, including heading, icon, marker, badges, and navigation companion, uses a fly-up translate/opacity outro that completes no later than the moment its owning container's block-end crosses the block-end of the primary top sticky backdrop.
6. Related animations use the same named transition boundaries and start and stop together. There may be no discrete position-mode swap, one-frame jump, delayed companion, stale state on reversal, or stranded breadcrumb at page bottom.
7. Monotonic scrolling produces monotonic motion. Direct hashes, large jumps, small wheel deltas, touch-like movement, rapid reversal, and breakpoint crossing must converge to the same state without intermediate overlap.

### Markers and adjacency

1. Walletbeat and H1 use the same adjacency rule as every other breadcrumb pair: when they are on the same active row, the actual next heading/link `::before` content is `›`.
2. In enhanced mode, H2 `::before` is `›` while H2 is adjacent to H1; if H2 is first on a wrapped row, it is the original floating permalink `#`, visible only on hover or keyboard focus.
3. H3 `::before` is `›` while H3 is adjacent to H2; if H3 is first on a wrapped row, it is the original floating permalink `#`, visible only on hover or keyboard focus.
4. Separator behavior is implemented by overriding the real heading/link pseudo-element's content. Do not add a separate separator element or pseudo-element beside the permalink marker.
5. The floating `#` retains its original out-of-flow visual position and never shifts heading text. `›` occupies the same marker mechanism when adjacency requires it.

### Icon identity, color, geometry, and reservations

1. Inline content icons and pie icons use the emoji glyph variants supplied by the existing icon mapping, not alternate WBIcon pictograms. The semantic icon class may remain where it supplies the mapped glyph, but the rendered face must be the emoji variant.
2. Wallet-page content icons are plain monochrome glyphs. Do not place them inside flower, petal, pie-slice, disk, or other decorative shapes.
3. Heading and TOC icons use the owning section's `--accent` color in the resting state and reveal the original unfiltered emoji on hover, focus, or shared current state.
4. Pie icons use translucent white in the resting state and reveal the original unfiltered emoji on hover, focus, or shared current state.
5. A group H2's normal-flow icon is sized to the combined block size of its H2 title and accompanying paragraph. Its sticky endpoint uses the canonical breadcrumb icon size through a compositor scale.
6. Icon reservations are in flow, equal the visual sticky glyph slot at the sticky state, and share a single geometry authority with the heading and slice. Larger source states use transforms without changing the reserved sticky slot.
7. Stage Progress has no icon and therefore has no icon reservation or icon-derived offset. This does not exempt it from any ordinary H2 sticky, backdrop, marker, replacement, or transition rule.
8. Icon center alignment is measured throughout normal flow, entry, stuck state, and exit. Passing at one sampled scroll position is insufficient.

### Summary-side cluster

1. Summary-right badges and metadata remain in normal flow at all times; they are never absolutely or fixed positioned and never use a discrete `position` swap.
2. The heading, icon, and summary-side cluster share one responsive layout owner and truthful available width.
3. The cluster wraps only between intact badges or metadata tokens, keeps every produced row aligned to the inline end, and stays on one row whenever space permits.
4. The cluster's sticky motion, when any is required, is compositor-only and synchronized to the owning heading's transition boundaries. Anchor positioning or anchor sizing may derive endpoints but may not remove the cluster from flow or create a cyclic dependency.

### Pie placement, rotation, layering, and shared state

1. The active pie item always faces west (logical inline-start in LTR) at every breakpoint. This universal orientation supersedes the earlier desktop “opposite viewport corner” and compact “straight down” target-angle requirements. There are no breakpoint-, depth-, or item-specific target angles.
2. JavaScript may expose only irreducible data that CSS cannot derive, such as canonical slice geometry or a selected index. CSS owns pie rotation, responsive placement, interpolation, and visual state. There are no JavaScript scroll/resize observers, per-frame style updates, or JavaScript-computed animation phases.
3. Pie rotation and breadcrumb motion use the same CSS transition boundaries so the selected slice arrives westward with no lag, overshoot, snap, or breakpoint angle handoff.
4. Hover, focus, and current state is shared across each pie slice, its in-page anchor/content representation, and its TOC item. Activating any representation gives all representations the same corresponding visual state without blocking unrelated interaction.
5. The pie is layered above sticky surfaces while remaining pointer-safe. At the mobile breakpoint it appears in normal inline flow at the top of the page before it participates at the inline end of the active sticky heading.
6. The pie's in-flow source position is visible before animation. Its compact handoff preserves that flow reservation and uses translate/scale/opacity rather than width, height, inset, or position swapping where endpoints are derivable.
7. The TOC uses the project's standard `NavigationItems` navigation layout, indentation, and wrapping behavior. Wallet-page rules may supply its icon/current-state treatment and responsive outer placement, but must not replace the component's internal navigation layout with a custom grid, forced tracks, or wallet-specific label columns.

## 24. CSS-first implementation and proof discipline

1. CSS and native HTML own layout, sticky behavior, responsive wrapping, hover/focus/current presentation, scroll timelines, and compositor motion whenever the platform can express them. Moving any of those responsibilities into JavaScript is a failure unless the limitation is documented and independently demonstrated.
2. `ResizeObserver`, JavaScript scroll listeners, and JavaScript pie-rotation animation are prohibited. The JS-to-CSS boundary must be the bare minimum static semantic or geometric data needed by CSS.
3. CSS is organized by shared owner and semantic role using nesting where it clarifies the component structure. Prefer durable recurring attributes and primitives comparable in breadth to `[data-scroll-*]` and `[data-sticky-*]` over one-off selectors.
4. Diagnose shared root causes before local symptoms. Delete redundant selectors, variables, keyframes, wrappers, compensations, and superseded branches rather than masking them with later overrides.
5. Use one development server. Reuse the existing process instead of starting additional servers for individual checks.
6. Automated scripts and sampled assertions are supporting evidence, not a substitute for reading the whole rendered page and exercising continuous real scrolling. Visual inspection must cover the complete transition paths, not only positions where a script already expects success.
7. Verification must prove the written invariants directly. Do not add tests that merely codify the current implementation, relax thresholds to hide a product failure, or call partial visibility at selected scroll positions sufficient.
8. Work is recorded in granular, signed, atomic commits or fixups as forward progress becomes real. Fold fixups into their owning commits when practical, keep each commit coherent, and exclude unrelated artifacts and user changes.
9. Preserve the repository's existing CSS conventions and unrelated behavior. The final patch must reduce code and indirection as far as the complete behavior permits, including emitted production CSS and JavaScript.
