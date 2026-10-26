# `WalletPage` structural, visual and interaction requirements

Scope: the `WalletPage` frame, heading/row/icon composition, pie, TOC, breadcrumbs, sticky geometry, page chrome and their interactions. Section text, explanations, reference wording, rating methodology, code-authoring rules, experiments, and delivery/testing instructions are excluded. Sources cover the August 14–October 14, 2026 chats and the antecedents explicitly adopted or linked in those chats.

Items are ordered by prerequisites. A rule with multiple cases describes one relationship across its stated modes; separate items constrain different observable relationships. “Approximately”, “prefer” and “where feasible” retain their original strength. This document specifies required behavior, not current implementation acceptance.

**Geometry terms:** “natural” means ordinary document flow before enhancement; a “row” is one visual breadcrumb row; a “scope” is its heading’s real content container; “stack bottom” is the bottom of the currently preceding visible sticky rows.

## 1. Semantic page structure and destinations

Prerequisites: None.

- **🏗️ `Singleton`** The page contains exactly one real `H1`.

- **🏗️ `HeaderAncestry`** That `H1` remains inside the real wallet header, in its original logical source order.

- **🏗️ `Outline`** Heading depth follows the actual outline: Stage Progress and attribute groups are `H2`; stages and individual attributes are `H3`; nested detail headings are `H4`. Security News is `H2` with `H3` item titles. Sources headings derive their level from their actual parent rather than a universal fixed level.

- **🏗️ `RealHeadings`** Sticky breadcrumbs present the real heading/link; they do not add duplicate semantic or visual headings.

- **🏗️ `Destinations`** Each navigable section has one unique stable ID shared by its in-page links. TOC entries and pie slices represent attribute groups and attributes only, using those same stable IDs.

- **🏗️ `SourceOrder`** One logical TOC/aside precedes Stage Progress in source order at every breakpoint; responsive layout does not duplicate the page/navigation trees.

- **🏗️ `LadderPresence`** Omit the Stage Progress section only when the wallet has no applicable stage-ladder evaluation; unknown criteria in a present ladder do not make the section absent.

- **🏗️ `Landmarks`** The TOC navigation landmark is named “Table of contents”.

- **🏗️ `RegionNames`** Group regions have contextual accessible names, such as “Security attributes”, that distinguish them from individual attributes.

## 2. Root frame, scroll ownership and responsive columns

Prerequisites: §1.

- **🖼️ `Frame`** The root frame retains distinct site-navigation and main-content areas.

- **🖼️ `Skiplink`** The real #content skip target is reachable; its focused skip link appears at viewport top-center with the intended icon and gap.

- **🖼️ `ScrollRoot`** Main content and footer participate in the root page scroll area; main does not introduce a competing root scroller.

- **🖼️ `NestedStacks`** Nested scroll areas start their own internal sticky stack while their outer boxes still participate in the parent layout.

- **🖼️ `RailBreakpoint`** At widths ≤`1024px`, content reserves no desktop TOC rail; at widths ≥`1025px`, the right-hand desktop rail reservation returns.

- **🖼️ `RailIsolation`** Desktop rail/pie width does not overlap or widen main content; navigation and local overflow do not widen the sticky rail.

- **🖼️ `HorizontalOverflow`** The document has no unintended horizontal overflow. Intentionally wide local content retains horizontal scrolling inside its own scroll area.

- **🖼️ `Footer`** The footer remains nonsticky in the content column.

- **🖼️ `MainHeight`** When intrinsic content leaves room, main fills the remaining root height after accounting for the footer.

- **🖼️ `FooterStability`** Opening mobile navigation does not displace the footer.

- **🖼️ `Scrollbars`** Scrollable regions retain stable occupied width with the established hidden-scrollbar presentation; hiding a scrollbar does not disable scrolling.

- **🖼️ `HeaderScrolling`** Wheel/trackpad scrolling still works while the pointer is over the primary page header; the header does not create a dead scrolling region.

## 3. Typography and natural row composition

Prerequisites: Available content width from §2.

- **📐 `Typography`** Use the established typography by role: Space Grotesk for headings, badges, and navigation; inherited Avenir for ordinary page text, with the existing monospace exception.

- **📐 `TextColumn`** `H2`/`H3` title and leading paragraph form one aligned text column with a visible gap beside the icon.

- **📐 `ProseBreakout`** When extreme container proportions require it, supporting prose breaks onto its own row while icon, title, and end content retain the first row where they fit.

- **📐 `TitleWrapping`** `H3` row items wrap before avoidable wrapping of the heading text itself.

- **📐 `AvailableWidth`** Header and summary items share the actual available content width; no item lays itself out against a fictitious viewport-wide area.

- **📐 `RowPadding`** Rows retain real, visible padding in natural, entry, compact, and exit states. Compact padding decreases proportionally by hierarchy rather than disappearing or retaining oversized source padding.

- **📐 `ParagraphGap`** The natural `H2`/`H3` heading-to-paragraph gap is reduced from the reference baseline.

- **📐 `ContentMeasure`** Every row and its wrapping remain within the real content padding and maximum width.

- **📐 `LongLabels`** Long labels and wallet names remain usable without clipping interactive targets.

## 4. Static pie shape, rating geometry and hit regions

Prerequisites: Navigation destinations in §1.

- **🥧 `Annulus`** Navigation slices use the canonical annular Pie construction: matching radii, inset gaps/offsets, corner geometry and arc side/sweep for both parent and child layers.

- **🥧 `CornerRadii`** Inner and outer corner radii are independently configurable, each bounded by its own available arc length; rounding leaves the main inner/outer arcs on their respective circles.

- **🥧 `SliceCounts`** Slice geometry remains correct across slice counts and responsive sizes.

- **🥧 `SliceHitArea`** A slice’s pointer-hit region follows its visible clipped shape, not its surrounding rectangular box.

- **🥧 `HoverStroke`** The established hover stroke remains visible instead of being clipped at the outer edge.

- **🥧 `FilterOrder`** Filtering and clipping retain the intended hover-effect ordering.

- **🥧 `WeightedArea`** Group petals show radial rating gradients whose visible color areas approximate the established scoring weights.

- **🥧 `RatingStops`** Rating stops retain their established order, with each represented rating contributing at most one stop; EXEMPT does not contribute to that distribution.

- **🥧 `Interpolation`** Gradient interpolation uses OKLCH and the established rating colors.

- **🥧 `UnratedFill`** UNRATED is a transparent gradient-overlay portion over the established gray base, with the intended subtle backdrop appearance.

## 5. Icon identity, scale and alignment

Prerequisites: Typography in §3 and slice geometry in §4.

- **🎨 `SemanticIcons`** The established semantic icon mapping is preserved, including multi-codepoint emoji identities.

- **🎨 `RenderingModes`** Detailed/simple mode does not unexpectedly substitute emoji; explicitly chosen emoji variants remain supported.

- **🎨 `GlyphTreatment`** Heading/TOC glyphs use the section’s accent treatment, with the intended unfiltered interaction treatment in emoji mode; pie emoji glyphs retain their translucent-white rest/unfiltered interaction treatment.

- **🎨 `PlainGlyphs`** Plain in-page heading glyphs have no surrounding petal, pie-slice, disk, or decorative shape.

- **🎨 `DetailSwitch`** Detailed versus simple rendering switches promptly according to actual rendered/available size and scale, independently of semantic animation state.

- **🎨 `NaturalGlyphs`** The natural `H2`/`H3` icon baseline follows the title/support layout: one title line plus one paragraph line and their gap in the two-line mode; `1.5lh` in the single-line mode. Apply the later approximately 10% natural-size increase; extra wrapped prose or badges do not inflate it.

- **🎨 `WalletAspect`** The wallet `H1` asset retains its natural aspect ratio and intrinsic width at the chosen height, including compact states; non-square assets are not stretched or cropped square.

- **🎨 `GlyphAlignment`** Glyphs are vertically aligned with their intended heading/row throughout flow, entry, rest, and exit.

- **🎨 `LabelCenters`** Each pie glyph is centered on its slice’s canonical label point, from that slice’s angle/span and radii; no independent pixel correction conceals wrong slice geometry.

- **🎨 `UprightGlyphs`** Pie glyphs stay upright while slices rotate.

- **🎨 `GlyphDirection`** In `RTL`, logical slice direction reverses without changing correct glyph centering.

- **🎨 `GlyphCounts`** Pie icon placement remains correct for every slice count.

- **🎨 `AnchorScope`** A heading glyph never resolves against another section’s repeated placement slot.

- **🎨 `IconInteraction`** The containing heading link owns glyph hover/focus, so icon and text respond to the same target.

- **🎨 `IconGaps`** Perceived icon-to-text gaps are consistent and slightly larger than the earlier reference gap, including natural `H2`/`H3` and compact breadcrumbs.

- **🎨 `HoverStability`** TOC/navigation glyphs remain stationary under rapid hover.

## 6. Header identity, variants, description and end clusters

Prerequisites: Natural rows in §3 and icons in §5.

- **🧩 `FlowOrigins`** At page top, `H1`, its glyph, variant picker and real summary/end content occupy their original in-flow positions.

- **🧩 `HeaderWrapping`** `H1`, variant picker, stage badge and conditional end content share a line when they fit; otherwise whole items wrap predictably.

- **🧩 `PickerGrouping`** The variant picker groups with `H1` on the left in natural flow.

- **🧩 `PickerMorph`** Before compaction, the variant picker is a normal icon-bearing native select; its compact circular control matches the shared 2rem control design.

- **🧩 `PickerBorder`** The variant control keeps its complete, unmasked border of consistent apparent width in sticky presentation.

- **🧩 `Platforms`** The `H1` area has no separate Platforms card.

- **🧩 `Description`** Wallet description occupies its designated prose position.

- **🧩 `DescriptionLinks`** Description links sit to its right when room permits and wrap below it when constrained.

- **🧩 `EndAlignment`** Summary metadata/badges form one end-aligned cluster; every wrapped cluster row remains end-aligned.

- **🧩 `TokenWrapping`** That cluster wraps only between intact tokens/pills, stays on one line when it fits, and does not force premature title wrapping.

- **🧩 `EndClearance`** The heading and end cluster retain a reasonable minimum gap.

- **🧩 `FlowReservation`** End metadata preserves its real flow reservation during sticky motion, without a duplicate visual cluster or discrete position-mode jump.

- **🧩 `BadgePacking`** Compact rows containing multiple badges do not reserve unnecessary empty vertical space.

- **🧩 `StageTags`** Stage-number badges sit on the left of stage rows.

- **🧩 `AttributeTags`** An attribute’s applicable stage tag stays beside its title rather than in the end cluster.

- **🧩 `TypeBadges`** A multi-type wallet exposes the applicable stage ranking/badge for every assigned `WalletType`, using each type’s appropriate ladder rather than a single-type assumption.

## 7. Disclosure participation and initial structural state

Prerequisites: Section hierarchy in §1 and summary rows in §6.

- **🔽 `AttributeDefaults`** Attribute-content details are initially open; the specifically adopted stage-accordion rule below governs stage disclosures instead.

- **🔽 `StageAccordion`** Stage disclosure uses the established linked native accordion pattern while retaining the stage → criteria-group → criterion relationships.

- **🔽 `StageDefault`** The next uncleared stage is initially open in the linked stage accordion.

- **🔽 `DisclosureTarget`** A deep link reveals its actual destination inside closed details.

- **🔽 `Chevron`** The summary retains native disclosure semantics and ownership of its visible, end-aligned, clickable chevron.

- **🔽 `ClosedDescendants`** Hidden descendants of closed details contribute no sticky heading/glyph/badge, layout, or collision reservation, animation/timeline, or current-item state.

- **🔽 `HeadingParticipation`** A disclosed `H3` participates only while its section reaches the usable sticky viewport; offscreen or fully covered sections leave no stranded `H3`.

- **🔽 `DisclosureMotion`** Native opening/closing animates where supported; close-scroll correction may remain browser-controlled.

## 8. Sticky row composition and hierarchy

Prerequisites: Flow composition in §§3, 6–7.

- **📚 `StickyOrder`** `H1`–`H4` maintain deterministic ordered sticky rows. Width-driven wrapping preserves their semantic hierarchy.

- **📚 `DetailLane`** An eligible `H4` occupies the next row immediately below the sum of the preceding visible sticky-row heights.

- **📚 `StageParity`** Stage Progress uses ordinary `H2` stacking, compaction, marker, replacement, and exit rules; lacking an icon removes only its icon slot/offset.

- **📚 `MobileRows`** On mobile, `H2` begins the second sticky row; `H3` joins `H2` there when they fit and otherwise wraps under the same width-driven rule.

- **📚 `GroupStart`** An `H2` not sharing `H1`’s row aligns to the normal content start.

- **📚 `AdjacentBaseline`** Adjacent breadcrumb items share a vertical baseline.

- **↪ `AdjacentDodgeCurve`** All adjacent breadcrumb arrivals follow a smooth rounded-corner path, generally the bottom-right corner of a rounded rectangle, analogous to pie dodging; easing a straight diagonal does not fulfill this. Preserve native endpoints, mirrored `RTL`, scale ownership, reverse-scroll determinism and compositor-only scroll motion.

- **📚 `Hierarchy`** At compact rest, the text-to-icon ratio is constant across heading levels.

- **📚 `HeadingRatios`** Compact `H2` text/icon sizes lie halfway between the corresponding `H1` and `H3` sizes.

- **📚 `RowHeights`** Compact row heights decrease proportionally by hierarchy.

- **📚 `DesktopHeight`** The first desktop sticky row equals the main navigation header height.

- **📚 `FallbackPadding`** Fallback `H1` retains ordinary horizontal content padding.

## 9. Permalink/separator geometry and mobile identity

Prerequisites: Sticky-row adjacency in §8.

- **🔗 `Separators`** Exactly one › appears between actual adjacent breadcrumb levels, including Walletbeat/`H1`; no separator is missing, duplicated or orphaned.

- **🔗 `Permalinks`** A row-first permanent link # appears only on hover/focus, retains its floating position and reserves no inline space; its adjacent › replaces it rather than appearing beside it.

- **🔗 `MarkerSpacing`** The real marker uses the base font and has balanced perceived gaps.

- **🔗 `MarkerStability`** Changing a marker does not shift unrelated heading content.

- **🔗 `LinkedIdentity`** The glyph and title ideally share one real link, with its leading marker before and aligned to the glyph.

- **🔗 `SiteLogo`** On desktop the site logo is static and left-aligned; on mobile it begins centered.

- **🔗 `CompactIdentity`** When mobile identity fits, logo, ›, wallet glyph and `H1` form one centered compact row. When it does not, the logo exits upward while remaining horizontally centered and wallet glyph/title center without an orphan separator.

- **🔗 `NameReservation`** Room reserved for long-name/logo separation remains stable during motion, without oscillating between layout modes.

- **🔗 `WordmarkGap`** Perceived spacing between the logo and its text matches the icon/text spacing system.

## 10. Breadcrumb contact geometry and life cycle

Prerequisites: Actual sticky-stack geometry in §8 and adjacency in §9.

- **🧭 `EntryContact`** Entry begins when the closest natural sticky-container top touches the bottom of the bottom-most already-stuck row.

- **🧭 `ArrivalContact`** Adjacent arrival ends naturally when its container bottom meets the existing row bottom; a new-row arrival ends after scale/translation cover the natural-to-compact vertical scroll-distance difference.

- **🧭 `ExitContact`** Departure finishes when the actual outgoing scope-container bottom crosses the active sticky-stack bottom.

- **🧭 `ScopeExtent`** Departure follows the scope’s current extent after disclosures open/close; collapsing its last detail does not make the heading depart prematurely.

- **🧭 `FooterException`** Mobile `H1` has no footer-triggered outro.

- **🧭 `MotionPath`** Headings move continuously between flow and sticky positions, rather than fading out at one stationary position and reappearing elsewhere.

- **🧭 `CompanionTiming`** Companions in one transition share its start/end, including wallet title and variant picker.

- **🧭 `ScopeReplacement`** Outgoing content leaves before the incoming scope is authoritative; group changes leave no stale heading, glyph, marker, or companion.

- **🧭 `TransformEasing`** Transforms use exponential-family entry/exit easing without overcompensating or reversing near rest.

- **🧭 `CollisionFree`** Incoming and outgoing headings, icons, and end content remain collision-free throughout their paths, not merely at endpoints.

- **🧭 `ScrollCoupling`** Vertical movement follows source scroll position throughout its eased path instead of trailing fast scrolls or reversals.

- **🧭 `SupportFlow`** Prose and siblings outside sticky participation inside a sticking container continue moving as ordinary document content would if that parent had never stuck.

- **🧭 `ParagraphOutro`** Preserve the requested paragraph outro fade; unrelated support items do not automatically inherit the backdrop’s exit fade.

## 11. Sticky surfaces, coverage and layer order

Prerequisites: Rows in §8 and their lifetimes in §10.

- **🪟 `SurfaceOwner`** Each visual sticky row has one backdrop, provided by its first visible breadcrumb; adjacent levels on that row do not add redundant surfaces.

- **🪟 `SurfaceBounds`** A row backdrop covers exactly that compact row’s bounds and actual padding/wrapping; a taller source descendant does not enlarge it.

- **🪟 `HeaderPadding`** Visible block padding above and below compact `H1` is balanced.

- **🪟 `SurfaceAppearance`** Equivalent row backdrops use the same shared translucent surface color, opacity, and blur, including Stage Progress.

- **🪟 `SurfaceLifetime`** A backdrop is visible only during its row’s actual entry/sticky/exit lifetime and fades with that entry/exit; no premature, stale or phantom rectangle covers content.

- **🪟 `DetailSurfaces`** `H3`/`H4` backdrops appear whenever those levels own a sticky row.

- **🪟 `PaintOrder`** An inner level paints ahead of an outer one only when adjacent-breadcrumb participation requires it; pressed summary state does not change that order.

- **🪟 `ProsePaint`** Ordinary prose passes behind an active sticky surface instead of painting over it.

- **🪟 `UnmaskedSurfaces`** Sticky backdrop surfaces have no mask effect.

- **🪟 `AccentBorders`** Accent section borders/outlines remain visible and unclipped beneath sticky surfaces.

## 12. Pie placement, mobile compaction and backdrop

Prerequisites: Pie shape in §4 and sticky rows/surfaces in §§8–11.

- **📍 `DesktopPie`** The desktop pie fits/sticks within its TOC rail at the established approximately `320px` presentation.

- **📍 `TOCOverlap`** TOC content can scroll behind the sticky pie area; it does not begin permanently below it.

- **📍 `InlinePie`** The mobile pie begins visibly inline in normal flow; compaction preserves that flow reservation.

- **📍 `PieTangent`** The compact pie sits at the inline end, with its container top tangent to the bottom of the first sticky-row container; it does not follow each nested stage vertically or become an unrelated viewport-fixed overlay.

- **📍 `PieCompaction`** Mobile compaction begins late near the approaching section, continuously approaching approximately 100×100 and looking squeezed between the upper sticky items and section top.

- **📍 `PieReversal`** Reverse scrolling produces no pie bounce or lag.

- **📍 `PieMirroring`** `RTL` mirrors rail/compact placement logically.

- **📍 `PieLayer`** The pie paints above relevant sticky surfaces without intercepting unrelated controls/content.

- **📍 `PieBackground`** The whole-pie background does not inherit an individual slice’s hover/current treatment.

- **📍 `PieBackdrop`** Normal-transparency pie backdrops use the shared blur/filter without solid background color: a desktop box backdrop and mobile circular backdrop.

## 13. Current destination and synchronized representations

Prerequisites: Destinations in §1, glyph treatment in §5 and pie placement in §12.

- **🎯 `SharedStates`** Pie, TOC, and corresponding in-page links share hover, focus, and current feedback for the same resolved absolute destination, including across navigation instances.

- **🎯 `PetalHighlightScope`** Relevance and highlight are independent. Relevance alone controls petal opacity: when a relevant set exists and the flower is not hovered, irrelevant petals fade; flower hover restores full petal opacity. Current attribute context and individual Stage criteria determine relevance. Overall Stage Progress supplies no related set. Highlight belongs only to the exact slice and heading level whose associated source touches the bottom of the cumulative sticky stack, or to its exact hover/focus/active interaction. Ancestor membership does not propagate highlight. Scale and stroke feedback transition on arrival, departure, and reversal; the stroke paint stays static while its layer transitions opacity.

- **🎯 `GroupCurrent`** Parent-group current highlighting follows active child destinations, as well as highlighting individual items. Group destination membership and relevance remain shared with children; exact pie highlight follows `PetalHighlightScope`, not ancestor membership.

- **🎯 `StateLegibility`** Current and separately hovered/focused items remain simultaneously legible and visually distinct.

- **🎯 `CurrentConvergence`** Current selection converges correctly under scroll, direct/initial hashes, history, resize, and TOC open/close; no stale selected slice/group survives.

- **🎯 `CurrentInteraction`** Current items retain the intended interaction behavior for links.

## 14. Pie orientation and rotation

Prerequisites: Heading-start geometry in §10 and current destination in §13.

- **🔄 `Westward`** The selected slice faces west in `LTR`—logical inline-start—at every breakpoint, depth, and destination.

- **🔄 `CoRotation`** Both layers use one current-angle state and begin/finish each turn coherently.

- **🔄 `TurnRange`** Rotation is localized near actual heading transitions and reaches the selected orientation at its heading’s sticky start; it does not drift throughout a long section or entire stage.

- **🔄 `TurnEasing`** Turns use exponential-family easing without diagonal artifacts, overshoot, discrete angle jumps or breakpoint-angle handoffs.

## 15. Flower visibility and first-paint state

Prerequisites: Current/interaction state in §13.

- **🌸 `PetalVisibility`** Second-layer visibility is state-driven: all attribute petals initially; in sticky/current-bound presentation, the current group and independently hovered/focused groups retain their intended visible petals.

- **🌸 `PetalFirstPaint`** First paint has the correct default slice visibility/layering with no flash of hover-only petals.

- **🌸 `PetalLabels`** Tooltip/title labels show the semantic mapped emoji rather than an internal icon name.

## 16. Pie clearance for summary end content

Prerequisites: Natural end clusters in §6, heading life cycle in §10 and pie position in §12.

- **⭕ `CirclePath`** Visible end content and chevrons follow one combined curve around the pie’s circular silhouette, with modest extra gap; two wrongly phased independent axis moves are insufficient.

- **⭕ `EncounterRange`** Clearance is active only around the actual physical encounter; a summary does not reserve pie room throughout its section.

- **⭕ `ClearanceEasing`** Dodge departure/return uses exponential-family easing and remains collision-free. A visually matched smooth path/contact approximation is allowed.

- **⭕ `ClosedClearance`** Closing a details does not exempt its still-visible summary end content or chevron from pie clearance.

## 17. TOC placement, popover structure and page chrome

Prerequisites: Navigation identity in §13 and pie visibility/clearance in §§12, 15–16.

- **🗂️ `TOCLayout`** TOC retains the standard navigation indentation/wrapping, accommodates long depth-two labels and sits in its actual sticky container without a rail-width inset.

- **🗂️ `NavigationDepth`** Navigation connector lines pass through glyph centers.

- **🗂️ `ChildIndent`** Child glyph boxes start at their parent label’s inline edge.

- **🗂️ `GlyphTiers`** Navigation depth sizes retain the shared 2em/1.5em/1.25em tiers.

- **🗂️ `CircleRatio`** A circled navigation glyph box is 0.55 of its outer circle.

- **🗂️ `NavigationShape`** Navigation item leading rounding is pill-like only where its icon is circled; the trailing side retains the intended rounding.

- **🗂️ `TOCBadges`** TOC end content, including Score badges, follows the corresponding page item’s visibility conditions.

- **🗂️ `TOCTags`** Stage tags are not repeated in the TOC.

- **🗂️ `TOCTitle`** There is no redundant visible TOC title; the named navigation landmark remains.

- **🗂️ `TOCTrigger`** A separate native TOC control opens the panel; the compact flower retains its individual petal links instead of becoming one replacement toggle.

- **🗂️ `IndependentPie`** Only the TOC panel is the popover. Closing it leaves the independent inline/compact pie visible and usable.

- **🗂️ `MobileChrome`** The mobile header begins with centered logo, hamburger then theme switcher at the left, and TOC control at the opposite/right end.

- **🗂️ `OpenIdentity`** Opening mobile TOC retains the same centered short-name/long-name identity rule as the page header.

- **🗂️ `OpenPie`** When mobile TOC opens, the pie remains at its sticky top.

- **🗂️ `HiddenNavigation`** A closed TOC contributes no hidden Tab/Shift+Tab targets or accessible-tree links; opening and closing update whether those targets and links can be reached.

- **🗂️ `PopoverControl`** Native TOC opening/closing, focus, Escape, and pointer behavior remain usable across the three browser engines.

- **🗂️ `OverlayCoverage`** The TOC overlay transitions correctly without exposing underlying content through unintended masked/covered regions.

- **🗂️ `MarkerVisibility`** If native current-marker scrolling is feasible, keep the target visible within its own navigation scroll area; suspend automatic movement while hovered and briefly afterward.

## 18. Site-navigation overlay geometry visible on `WalletPage`

Prerequisites: Root frame in §2 and page chrome in §17.

- **☰ `MenuDepth`** Opening mobile site navigation moves content backward about the scroll-viewport center while the menu moves forward, with its intended closing transition.

- **☰ `MenuSearch`** Mobile search occupies the bottom of menu flow and remains reachable during menu scrolling.

- **☰ `SearchEntry`** Mobile search enters from below with the established small delay.

- **☰ `ClosedMenu`** Closed site navigation leaves page content interactive.

- **☰ `HeaderSurface`** The visible site header retains its backdrop and border/shadow when site navigation is closed.

- **☰ `MenuResize`** If an open mobile menu crosses into a wide viewport, a usable menu control remains until it closes.

- **☰ `MenuBlur`** Menu blur transitions from zero on entry and retains the closing transition.

- **☰ `MenuSurfaces`** Navigation current/stuck surfaces appear in their applicable state rather than permanently painting idle items.

## 19. Anchor landing and root proximity snap geometry

Prerequisites: Actual container/stack boundaries in §10 and navigation in §17.

- **⚓ `Proximity`** The root uses block-axis proximity snapping, not mandatory snapping.

- **⚓ `SnapBoundaries`** The root’s snap positions are the relevant breadcrumb/container animation starts and ends, aligned with actual sticky offsets; coincident boundaries share one position and no unrelated intermediate position is added.

- **⚓ `ContactExclusion`** Pie encounter/contact points do not create root snap positions.

- **⚓ `FragmentStart`** Pie, TOC, and in-page links land at the linked container’s animation start, not obscured by the current sticky stack.

- **⚓ `HistoryLanding`** Direct/initial fragment loads, post-hydration navigation and back/forward produce that same settled landing/current state.

- **⚓ `ScrollAgreement`** Smooth navigation and proximity snapping produce one coherent movement without competing corrective scrolls.

- **⚓ `LateLayout`** Fonts, lazy images/content, hydration, and resize do not invalidate the final landing.

- **⚓ `ImageReservation`** Inline reference images reserve their display space before loading and retain their aspect ratio, so loading does not shift the page or its fragment landing.

- **⚓ `ExactBoundaries`** Approved approximations of row sizes and exclusion areas leave heading-start, fragment, and snap boundaries exact.

- **⚓ `TopTarget`** Page-top navigation uses #top.

## 20. Floating controls and footer containment

Prerequisites: Disclosures in §7, footer in §2 and anchor navigation in §19.

- **🎛️ `DetailsControl`** The details bulk-toggle sits bottom-left on mobile and bottom-right of main content on desktop.

- **🎛️ `SectionControls`** Previous/next controls sit bottom-right of the mobile viewport and bottom-right of desktop TOC.

- **🎛️ `ControlContainment`** Floating controls retain their owner’s horizontal/bottom insets, move together at footer arrival and finish in the correct content area without covering the footer.

- **🎛️ `AdjacentNavigation`** Previous/next controls prefer adjacent semantic anchors over viewport-height steps where native behavior supports it.

- **🎛️ `ControlTooltips`** The floating controls remain the bulk-details and previous/next controls, with their intended explanatory tooltips where feasible.

## 21. Native accessibility, preferences and fallback geometry

Prerequisites: All preceding structure and interactions.

- **♿ `NoScript`** Page headings and destinations remain readable and reachable without JavaScript.

- **♿ `Hydration`** Controls that genuinely require JavaScript do not appear functional when it is absent; hydration-pending is not automatically treated as no-JS.

- **♿ `NativeInput`** Interactive links, select, details, TOC, and menu retain native keyboard/touch semantics.

- **♿ `FocusNaming`** Keyboard focus indication is visible.

- **♿ `ControlNames`** Interactive controls have meaningful accessible names.

- **♿ `DecorativeNames`** Decorative glyphs do not duplicate adjacent accessible text.

- **♿ `Capabilities`** If an enhanced effect is unsupported, the useful ordinary sticky/native behavior remains intact; each engine keeps independently supported enhancements rather than losing them together.

- **♿ `Firefox`** Firefox fallback rows have explicit proportional heights without overlaps; descriptions remain in normal flow, and fallback sizing does not change enhanced engines.

- **♿ `ReducedMotion`** Reduced motion removes decorative interpolation while preserving correct final hierarchy and arrangement and usable navigation.

- **♿ `ReducedTransparency`** Reduced transparency removes blur and supplies the shared readable color fallback for normally blur-only surfaces, including the pie.

- **♿ `ProductionParity`** Production rendering preserves the same structural/sticky/shape behavior as development.

## 22. Continuity and page-level motion quality

Prerequisites: Applies to every preceding life cycle and interaction.

- **⚡ `VisibleBounds`** At every phase, no heading, glyph, badge, or control collides, clips or becomes unintentionally occluded.

- **⚡ `Monotonicity`** Monotonic scrolling produces monotonic motion; jumps, touch-like movement, rapid reversal and breakpoint crossing converge without stale headings or stranded footer content.

- **⚡ `FastScroll`** Fast scrolling does not leave glyph detail, marker content, backgrounds, support prose, pie clearance or companions lagging their corresponding scroll position.

- **⚡ `Smoothness`** No avoidable layout/paint bottleneck makes motion visibly choppy. Negligible discrete icon switching and visually matched compact-row sizing are allowed; exact navigation boundaries still apply.

- **⚡ `FramePacing`** After startup noise, target approximately one-frame `p95` delivery with zero or near-zero frames over `33ms`, and no meaningful comparable regression in frame delay or long tasks.

- **⚡ `Android`** The structural page remains practically usable on a representative low-end Android device. User clarification: “the android requirement just means it should run performantly on a low end android browser”. This is a performance target after structural acceptance, with no physical-device prerequisite; constrained Chromium mobile touch evidence must identify emulation explicitly.

## Structural choices not settled by the sources

- The next-uncleared-stage initial-open rule is settled. The separate default for a wholly cleared ladder, or a ladder whose next uncleared stage is unknown, is not settled.

- Paragraph outro fading is requested; no separate numeric fade range is established. The defined ordinary-flow motion and exact container/stack boundaries still govern.
