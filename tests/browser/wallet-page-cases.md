# `WalletPage` acceptance procedures

## Fast three-engine feedback

With the source-matched candidate already running on port 4558:

```sh
WALLET_PAGE_URL=http://127.0.0.1:4558 pnpm test:browser:collect feedback.spec.ts
```

This reuses the server and runs Chromium, Firefox, and WebKit sequentially. Each
test has a 120-second timeout; browser startup and worker source verification are
separate setup work. It compares `H1` paint with a geometry-preserving hidden-paint control, then checks native wheel travel,
keyboard disclosure and TOC opening/closing, preserving screenshots, browser
capabilities and source identity in the existing report. Failures do not prevent
the other engines from running. This is a feedback smoke test, not full contract,
compositor, timing, or Safari Technology Preview acceptance. For one engine, use
`WALLET_PAGE_URL=http://127.0.0.1:4558 pnpm exec playwright test feedback.spec.ts --project=webkit`.
Application/fixture changes require rebuilding the candidate through the existing
fixture configuration; source mismatch is an error, not permission to use stale
assets. No dependency reinstall or additional server is part of this command.

Use the supplied requirements contract for expected behavior. These procedures describe observations, not substitute requirements or passing results. Execute them against the same source revision and record evidence per requirement in the generated report. A procedure that has not run remains unverified.

Sample widths of 390, 864, 1024, 1025, and 1440 pixels and each observed wrapping threshold; use software, hardware, embedded, multi-type, long-name and non-square-asset examples where relevant. Exercise `LTR`/`RTL`, light/dark, native keyboard/pointer/touch, details open/closed and supported engine/preferences as specified by each procedure. Record actual fixture URLs and settings; absent fixtures are explicit coverage gaps.

For motion, capture natural source and scope boxes before enhancement, actual scroll position and real-node boxes at dense contact/entry/rest/exit samples in both directions. Derive expected boundaries from the contract and measured owners, never from the animation formula being tested. Visual checks require inspecting the produced frames, not merely collecting screenshots. Performance procedures stay deferred until the first-pass gate is verified.

## 1. Semantic page structure and destinations

| Requirement         | Procedure                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏗️ `Singleton`      | Count native `H1` elements in the DOM and accessibility heading tree at each width.                                                                                                                                                               |
| 🏗️ `HeaderAncestry` | Inspect the `H1` ancestor chain and compare its preceding/following wallet-header siblings before and after scroll and resize.                                                                                                                    |
| 🏗️ `Outline`        | Walk the semantic heading tree for wallets representing software, hardware, embedded, and news-bearing cases; compare levels with actual parent sections, including nested Sources.                                                               |
| 🏗️ `RealHeadings`   | Record heading node identity and accessible heading counts at flow, entry, compact, and exit; inspect for visual clones or duplicate text.                                                                                                        |
| 🏗️ `Destinations`   | Verify unique stable targets for all local in-page links. Compare pie/TOC membership only with real attribute groups and attributes; Stage and news anchors remain valid without pie/TOC entries. Reload the same wallet/variant and compare IDs. |
| 🏗️ `SourceOrder`    | Inspect document order of the single aside and Stage Progress, then cross 1024/1025 without remounting or duplicating either tree.                                                                                                                |
| 🏗️ `LadderPresence` | Open wallets with an applicable ladder, unknown criteria and no applicable ladder; compare section presence with the ladder data after resolution.                                                                                                |
| 🏗️ `Landmarks`      | Query the accessibility tree for navigation named Table of contents, at closed/open mobile and desktop states.                                                                                                                                    |
| 🏗️ `RegionNames`    | Inspect accessible region names and heading relationships for every attribute group; compare with individual attribute names.                                                                                                                     |

## 2. Root frame, scroll ownership and responsive columns

| Requirement             | Procedure                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🖼️ `Frame`              | Inspect element boxes and landmarks at narrow/wide widths; identify distinct site-navigation and content areas.                                          |
| 🖼️ `Skiplink`           | Reload, press Tab, capture the focused skip link box/icon/gap, activate Enter and inspect `activeElement` and #content visibility.                       |
| 🖼️ `ScrollRoot`         | Wheel over main and footer; record all ancestor `scrollTop` values and overflow styles to identify the actual shared scroll owner.                       |
| 🖼️ `NestedStacks`       | Scroll an actual nested scroll region with sticky children while holding outer scroll fixed, then scroll the parent; compare both sticky origins.        |
| 🖼️ `RailBreakpoint`     | Measure content/aside allocation at 1024 and 1025 pixels and after crossing both directions; compare reserved inline width rather than visibility alone. |
| 🖼️ `RailIsolation`      | Measure main/rail boxes with the longest TOC labels and wide local content; detect overlaps or rail expansion.                                           |
| 🖼️ `HorizontalOverflow` | Compare `scrollWidth`/`clientWidth` at document and every scroll owner; wheel horizontally over genuinely wide local content.                            |
| 🖼️ `Footer`             | Scroll through footer arrival and end; inspect footer position and inline bounds relative to the content column.                                         |
| 🖼️ `MainHeight`         | On a short wallet and tall viewport, measure main against available root height through footer arrival.                                                  |
| 🖼️ `FooterStability`    | At a fixed mobile scroll position record footer document coordinates, open/close site navigation, and compare coordinates.                               |
| 🖼️ `Scrollbars`         | Measure occupied region width before/after overflow and pointer scrolling; verify hidden scrollbars do not disable movement.                             |
| 🖼️ `HeaderScrolling`    | Place the pointer on the wallet header and wheel in both directions; record root scroll deltas.                                                          |

## 3. Typography and natural row composition

| Requirement         | Procedure                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 📐 `Typography`     | Inspect computed font family and actual loaded fonts on headings, navigation, badges, body prose and monospace exceptions.      |
| 📐 `TextColumn`     | Measure title and first paragraph inline starts and their glyph boxes in natural `H2`/`H3` rows, including wrapped prose.       |
| 📐 `ProseBreakout`  | Resize through each row's first overflow threshold; capture first-row title/icon/end boxes and supporting prose line placement. |
| 📐 `TitleWrapping`  | Reduce available width continuously with a long `H3`; record first text-line wrap against the preceding whole-item wrap.        |
| 📐 `AvailableWidth` | Compare every natural source/item box with its actual content container, at narrow and wide widths and with long end content.   |
| 📐 `RowPadding`     | Capture source and compact content boxes at flow/entry/rest/exit; calculate visible block/inline padding by hierarchy.          |
| 📐 `ParagraphGap`   | Measure title-to-support baseline/box gap and compare the cited reference at identical font size and width.                     |
| 📐 `ContentMeasure` | Compare each row and all wrapped lines against content padding and maximum-width boundaries through all transition phases.      |
| 📐 `LongLabels`     | Use long wallet and attribute labels at narrow width and enlarged text; tab/click every partially wrapped interactive target.   |

## 4. Static pie shape, rating geometry and hit regions

| Requirement        | Procedure                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 🥧 `Annulus`       | Overlay parent/child slice paths against the canonical Pie geometry with the same radii, gaps, spans, and offsets.               |
| 🥧 `CornerRadii`   | Vary inner and outer corner radii independently in a test fixture; inspect arc-circle contact and clamp behavior at short spans. |
| 🥧 `SliceCounts`   | Render the existing Pie with small, ordinary, and dense slice counts at several sizes; compare path continuity and gaps.         |
| 🥧 `SliceHitArea`  | Sample pointer hits on visible slice interiors, gaps, and bounding-box corners; record actual event targets.                     |
| 🥧 `HoverStroke`   | Hover/focus each outer-edge slice; capture stroke bounds and inspect clip intersections at narrow and wide sizes.                |
| 🥧 `FilterOrder`   | Compare hover filter/stroke and clip output at slice gaps and outer edges against the canonical Pie ordering.                    |
| 🥧 `WeightedArea`  | For known mixed rating weights, measure rendered colored pixel/sector areas against established normalized score weights.        |
| 🥧 `RatingStops`   | Inspect the actual gradient stop list for repeated ratings, EXEMPT and all-unrated cases; compare represented ratings and order. |
| 🥧 `Interpolation` | Inspect emitted gradient interpolation mode and computed rating color inputs; compare intermediate rendered colors.              |
| 🥧 `UnratedFill`   | Use mixed and all-unrated groups over contrasting underlying content; inspect gradient alpha, gray base and backdrop output.     |

## 5. Icon identity, scale and alignment

| Requirement          | Procedure                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🎨 `SemanticIcons`   | Compare rendered glyph identities with the established semantic mapping, including multi-code point emoji examples.                     |
| 🎨 `RenderingModes`  | Toggle detailed/simple and explicit emoji settings; compare semantic glyph identity before/after, including initial paint.              |
| 🎨 `GlyphTreatment`  | Hover/focus corresponding page, TOC, and pie glyphs in font/emoji modes; inspect computed accent/filter and rendered output.            |
| 🎨 `PlainGlyphs`     | Inspect natural and compact heading glyph surfaces/pseudo-elements for unintended surrounding geometry.                                 |
| 🎨 `DetailSwitch`    | Resize or scale glyphs across their actual detail threshold while holding semantic state fixed, then change state at fixed size.        |
| 🎨 `NaturalGlyphs`   | Measure `H2`/`H3` glyph size against title/support line heights and gap; add wrapped prose/badges and compare with cited size baseline. |
| 🎨 `WalletAspect`    | Use a non-square wallet asset; compare rendered width/height with intrinsic ratio at flow, entry, compact, and exit.                    |
| 🎨 `GlyphAlignment`  | Track glyph/title boxes and baselines through dense forward/reverse transition samples at all heading depths.                           |
| 🎨 `LabelCenters`    | Compute canonical label points from each slice's actual span/angle/radii and compare glyph centers without corrective offsets.          |
| 🎨 `UprightGlyphs`   | Rotate the pie through all selected destinations and inspect glyph world-space orientation at intermediate and settled angles.          |
| 🎨 `GlyphDirection`  | Repeat label-center checks under `RTL` and compare mirrored logical direction and upright glyph orientation.                            |
| 🎨 `GlyphCounts`     | Repeat glyph-center/orientation measurements for every supported slice count, including sparse and dense examples.                      |
| 🎨 `AnchorScope`     | Place repeated heading/glyph anchor slots in neighboring and nested scopes; scroll one at a time and record resolved placement.         |
| 🎨 `IconInteraction` | Hover/focus title and glyph separately within the same link; compare icon/text feedback and click destination.                          |
| 🎨 `IconGaps`        | Measure perceived glyph-to-text spacing in `H1`/`H2`/`H3`, TOC and compact rows against the cited gap reference.                        |
| 🎨 `HoverStability`  | Sweep the pointer rapidly among neighboring TOC items while recording glyph-center coordinates.                                         |

## 6. Header identity, variants, description and end clusters

| Requirement           | Procedure                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🧩 `FlowOrigins`      | At scroll zero compare `H1`, asset, picker, and end-content boxes with ordinary flow and their actual DOM owners.                       |
| 🧩 `HeaderWrapping`   | Resize across fit thresholds with picker and badges present; record complete item wraps and line membership.                            |
| 🧩 `PickerGrouping`   | At flow and first wrap, compare picker/`H1` order and inline grouping with the header's left/start side.                                |
| 🧩 `PickerMorph`      | Inspect native select semantics and icon in flow; measure final compact control dimensions and shared control styling.                  |
| 🧩 `PickerBorder`     | Capture the picker border throughout compaction and inspect every edge for masking, clipping and apparent thickness changes.            |
| 🧩 `Platforms`        | Inspect the entire `H1`/header area visually and semantically for a separate platform presentation card, regardless of caption wording. |
| 🧩 `Description`      | Locate the wallet description in the real header prose flow and compare its box/order with the designated reference position.           |
| 🧩 `DescriptionLinks` | Resize through fit and wrap thresholds; measure description and link cluster row/inline positions.                                      |
| 🧩 `EndAlignment`     | Use multiline summary metadata; measure the inline-end of each wrapped end-cluster row against the summary content edge.                |
| 🧩 `TokenWrapping`    | Resize a badge-rich summary continuously; inspect token integrity and whether title wraps before the end cluster must.                  |
| 🧩 `EndClearance`     | Measure minimum title/end-cluster gap at every wrap threshold and compact phase.                                                        |
| 🧩 `FlowReservation`  | Track end-cluster natural layout reservation, DOM identity and visible position through entry/rest/exit.                                |
| 🧩 `BadgePacking`     | Measure compact rows containing one and several badges, checking unused block space against actual badge boxes/padding.                 |
| 🧩 `StageTags`        | Inspect stage-row badge order and inline position at natural and compact states.                                                        |
| 🧩 `AttributeTags`    | Inspect each applicable attribute stage tag's DOM/visual adjacency to title versus end metadata at wrap thresholds.                     |
| 🧩 `TypeBadges`       | Choose a wallet assigned multiple `WalletTypes` and compare each rendered badge with its own ladder evaluation after resolution.        |

## 7. Disclosure participation and initial structural state

| Requirement               | Procedure                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔽 `AttributeDefaults`    | Reload without stored transient page state and inspect open on every attribute-content details.                                                        |
| 🔽 `StageAccordion`       | Keyboard-open each stage successively; inspect shared native name, mutual exclusion and stage/group/criterion ancestry.                                |
| 🔽 `StageDefault`         | Compare initially open stage with the resolved next uncleared stage on partial ladders; leave unsettled all-cleared/unknown cases explicit.            |
| 🔽 `DisclosureTarget`     | Close all destination ancestors, activate an actual deep link and reload that hash; inspect destination visibility and open ancestors.                 |
| 🔽 `Chevron`              | Keyboard and pointer-toggle the real summary, including its chevron; inspect native role and end alignment.                                            |
| 🔽 `ClosedDescendants`    | Close an active ancestor; inspect descendant boxes, clocks, anchors/collision clearance and current representations while its summary remains visible. |
| 🔽 `HeadingParticipation` | Move a disclosed `H3` from below viewport through usable sticky space and fully under prior rows; record its visible lifetime.                         |
| 🔽 `DisclosureMotion`     | Record supported native details open/close transitions with pointer and keyboard and inspect continuity/close-scroll behavior.                         |

## 8. Sticky row composition and hierarchy

| Requirement            | Procedure                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📚 `StickyOrder`       | Scroll nested `H1`–`H4` through contact and rest at fitting/wrapping widths; compare visible row order with semantic ancestry.                                                                                                                                                  |
| 📚 `DetailLane`        | At `H4` rest measure its top against the sum of currently preceding sticky row heights, including wrapped rows.                                                                                                                                                                 |
| 📚 `StageParity`       | Compare Stage Progress `H2` and an attribute-group `H2` through equivalent contact/replacement/exit states; isolate only the absent icon slot.                                                                                                                                  |
| 📚 `MobileRows`        | At mobile widths resize through `H2`/`H3` shared-row fit; inspect `H2` second-row origin and `H3` wrap ordering.                                                                                                                                                                |
| 📚 `GroupStart`        | Force `H2` onto its own row and measure its inline start against ordinary content start.                                                                                                                                                                                        |
| 📚 `AdjacentBaseline`  | At shared-row rest compare text baselines of adjacent levels, including long labels and badges.                                                                                                                                                                                 |
| ↪ `AdjacentDodgeCurve` | `breadcrumb-arrival.spec.ts` measures actual curved arrival, direction, reversal and reduced endpoints. Also verify every participating heading level, scale/press composition and native compositor execution; bounded path samples alone do not certify the full requirement. |
| 📚 `Hierarchy`         | At compact rest measure font size/glyph size for each eligible heading depth and compare ratios.                                                                                                                                                                                |
| 📚 `HeadingRatios`     | Measure compact `H1`/`H2`/`H3` text and icon sizes; compare `H2` with the arithmetic midpoint of `H1`/`H3`.                                                                                                                                                                     |
| 📚 `RowHeights`        | Measure compact row box heights by hierarchy with matching content/wrap conditions.                                                                                                                                                                                             |
| 📚 `DesktopHeight`     | Compare the first desktop compact-row height directly with the actual main-navigation header height.                                                                                                                                                                            |
| 📚 `FallbackPadding`   | Disable unsupported enhancements or use fallback engine; compare `H1` inline padding with ordinary content padding.                                                                                                                                                             |

## 9. Permalink/separator geometry and mobile identity

| Requirement          | Procedure                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🔗 `Separators`      | At each shared-row/row-first configuration count and locate visible separators between actual adjacent levels, including site identity. |
| 🔗 `Permalinks`      | Hover/focus row-first and adjacent headings; measure marker boxes and title position while # and separator replace each other.          |
| 🔗 `MarkerSpacing`   | Inspect computed marker font and measured/perceived gaps to neighboring glyph/text at each heading depth.                               |
| 🔗 `MarkerStability` | Record neighboring heading coordinates while switching row-first/adjacent and hover/focus marker states.                                |
| 🔗 `LinkedIdentity`  | Inspect link ownership/hit targets for title and glyph and leading marker alignment at flow and compact states.                         |
| 🔗 `SiteLogo`        | Measure desktop logo inline start and mobile logo center before scrolling.                                                              |
| 🔗 `CompactIdentity` | Use short and long wallet names; cross fit thresholds and inspect logo/title centers, vertical exit and separator visibility.           |
| 🔗 `NameReservation` | Resize and slowly reverse-scroll near the long-name fit threshold; record reserved widths and detect oscillating layout mode.           |
| 🔗 `WordmarkGap`     | Compare logo-to-word mark perceived spacing with the page's actual glyph-to-text spacing system.                                        |

## 10. Breadcrumb contact geometry and life cycle

| Requirement           | Procedure                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧭 `EntryContact`     | Record natural scope top and prior stack bottom before enhancement; sample first visible motion around their contact.                                           |
| 🧭 `ArrivalContact`   | Measure adjacent scope bottom/row bottom contact; for new rows compare actual arrival scroll distance with natural-to-compact translation/scale.                |
| 🧭 `ExitContact`      | Track outgoing scope bottom and active stack bottom with dense scroll samples until departure finishes.                                                         |
| 🧭 `ScopeExtent`      | Open/close the last nested detail during an active scope and remeasure the actual exit boundary and heading lifetime.                                           |
| 🧭 `FooterException`  | At mobile scroll through footer arrival to document end and inspect `H1` continuity.                                                                            |
| 🧭 `MotionPath`       | Track the same real heading node's boxes densely from flow through rest and exit, looking for stationary fade/reappearance.                                     |
| 🧭 `CompanionTiming`  | Record title, glyph, picker and related companion progress against the same scroll positions; compare onset/completion.                                         |
| 🧭 `ScopeReplacement` | Cross neighboring groups in both directions and jumps; inspect authority/current feedback and outgoing heading/glyph/marker/companions.                         |
| 🧭 `TransformEasing`  | Plot measured transform progress against scroll fraction at entry/exit; inspect exponential-family curve and derivative/reversal near rest.                     |
| 🧭 `CollisionFree`    | At dense entry/replacement/exit samples, intersect visible heading/glyph/end-content boxes and inspect actual non-rectangular overlap.                          |
| 🧭 `ScrollCoupling`   | Compare slow and rapid input at identical scroll positions; record vertical geometry without waiting for time-based catch-up.                                   |
| 🧭 `SupportFlow`      | Compare support-prose/sibling document movement with scroll delta while its source heading sticks; use a temporary test-only enhancement disable for reference. |
| 🧭 `ParagraphOutro`   | Record supporting paragraph opacity through departure separately from backdrop and unrelated support items.                                                     |

## 11. Sticky surfaces, coverage and layer order

| Requirement            | Procedure                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 🪟 `SurfaceOwner`      | Inspect rendered sticky surfaces/pseudo-elements for each actual visual row at shared-level and wrapped configurations.   |
| 🪟 `SurfaceBounds`     | Measure backdrop bounds against compact row/padding while a tall source paragraph or badge cluster remains in flow.       |
| 🪟 `HeaderPadding`     | At compact `H1` rest measure visible top/bottom padding against actual content bounds.                                    |
| 🪟 `SurfaceAppearance` | Compare computed/rendered color, opacity, and blur of equivalent `H1`–`H4` and Stage Progress row surfaces.               |
| 🪟 `SurfaceLifetime`   | Capture before contact, entry, rest, exit and after exit; inspect for premature/stale/phantom painted rectangles.         |
| 🪟 `DetailSurfaces`    | Force `H3`/`H4` onto their own sticky rows and inspect their visible backdrops.                                           |
| 🪟 `PaintOrder`        | Inspect hit/paint order at overlapping transitions before/during summary press, for adjacent and independent rows.        |
| 🪟 `ProsePaint`        | Scroll strongly contrasting ordinary prose behind the active row and inspect occlusion/order.                             |
| 🪟 `UnmaskedSurfaces`  | Inspect computed masks on each actual backdrop and its painting ancestors through all states.                             |
| 🪟 `AccentBorders`     | Scroll accent section edges beneath active surfaces and inspect continuous visible without clipping outline/border paint. |

## 12. Pie placement, mobile compaction and backdrop

| Requirement        | Procedure                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 📍 `DesktopPie`    | At wide widths measure pie against its actual rail, scroll to both rail endpoints and compare the established `320px` presentation. |
| 📍 `TOCOverlap`    | Scroll the TOC independently behind its sticky pie; inspect content visible below/behind it and initial flow origin.                |
| 📍 `InlinePie`     | At mobile top measure the visible pie's normal-flow reservation before and after compaction.                                        |
| 📍 `PieTangent`    | At mobile compact rest compare pie-container top with first-row-container bottom through nested stage changes.                      |
| 📍 `PieCompaction` | Record pie bounds at dense approach samples; compare late onset, continuous squeeze and settled approximately `100px` size.         |
| 📍 `PieReversal`   | Reverse slow/fast input around compaction boundaries and compare pie boxes at equal scroll positions.                               |
| 📍 `PieMirroring`  | Repeat desktop/mobile placement under `RTL` and compare logically mirrored inline bounds.                                           |
| 📍 `PieLayer`      | At overlapping sticky states inspect pie paint order and pointer targets on nearby unrelated controls/content.                      |
| 📍 `PieBackground` | Hover/focus/select each slice while measuring whole-pie background styles and appearance.                                           |
| 📍 `PieBackdrop`   | Inspect actual normal-transparency pie backdrop shape/filter and solid-color paint at desktop/mobile sizes.                         |

## 13. Current destination and synchronized representations

| Requirement              | Procedure                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🎯 `SharedStates`        | Hover/focus/current-select each absolute destination through page, pie, and TOC representations, including two navigation instances.                                                                                                                                                                                                                                                                                    |
| 🎯 `PetalHighlightScope` | `pie-input.spec.ts`, `stage-current.spec.ts` and pie paint/state checks cover parts of the real navigation. Verify independent relevance/opacity versus exact-level highlight at cumulative-stack contact, hover/focus/press, individual Stage criteria versus overall Stage Progress, coordinated rotation and reversible transitions. Parent current membership must not be used as evidence for exact pie highlight. |
| 🎯 `GroupCurrent`        | Scroll/deep-link through child attributes and parent groups; compare shared destination membership and relevance separately from exact-level pie highlight. Ancestor current membership must not light an unrelated slice.                                                                                                                                                                                              |
| 🎯 `StateLegibility`     | Keep one destination current while hovering/focusing another; inspect simultaneous distinct readable feedback.                                                                                                                                                                                                                                                                                                          |
| 🎯 `CurrentConvergence`  | Exercise slow scroll, direct hash, reload, history, resize, and TOC open/close; compare all selected representations after settling.                                                                                                                                                                                                                                                                                    |
| 🎯 `CurrentInteraction`  | Activate a currently selected page/TOC/pie link with pointer and Enter and inspect native navigation behavior.                                                                                                                                                                                                                                                                                                          |

## 14. Pie orientation and rotation

| Requirement     | Procedure                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 🔄 `Westward`   | For every selected group/child destination measure slice center angle at settled rest, narrow/wide and `LTR`/`RTL`.             |
| 🔄 `CoRotation` | Record both layer angles on one timeline through every turn and compare onset, progress, and completion.                        |
| 🔄 `TurnRange`  | Sample rotation before/near/after actual heading contact and across a long section and stage.                                   |
| 🔄 `TurnEasing` | Unwrap measured layer angles through dense transition/reversal/breakpoint samples; inspect curve and discontinuities/overshoot. |

## 15. Flower visibility and first-paint state

| Requirement          | Procedure                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 🌸 `PetalVisibility` | Inspect child petals initially, at sticky current state, and with independent hover/focus on a different group.                  |
| 🌸 `PetalFirstPaint` | Capture before hydration and the earliest rendered frames on cold load and direct hash, inspecting slice visibility/layer order. |
| 🌸 `PetalLabels`     | Inspect actual native title/tooltip/accessibility labels for mapped semantic emoji, including multi-code point mappings.         |

## 16. Pie clearance for summary end content

| Requirement          | Procedure                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ⭕ `CirclePath`      | Track end-content/chevron boxes throughout pie encounter; compare combined motion with the measured circular exclusion silhouette. |
| ⭕ `EncounterRange`  | Measure end-content inline displacement well before, during and after actual physical pie encounter within a long scope.           |
| ⭕ `ClearanceEasing` | Record outbound/return path versus contact progress and inspect smooth exponential-family easing and collisions.                   |
| ⭕ `ClosedClearance` | Close the details before/during encounter and track its still-visible summary end content/chevron around the pie.                  |

## 17. TOC placement, popover structure and page chrome

| Requirement           | Procedure                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🗂️ `TOCLayout`        | Use long depth-two labels; compare indentation/wrapping and actual sticky-container inline inset at desktop/mobile open.                |
| 🗂️ `NavigationDepth`  | Measure connector-line center lines against each glyph center for all depths and wrapped labels.                                        |
| 🗂️ `ChildIndent`      | Compare child glyph inline starts with their own parent label inline starts across depths and `RTL`.                                    |
| 🗂️ `GlyphTiers`       | Measure navigation glyph boxes in em by depth, including inherited font-size variation.                                                 |
| 🗂️ `CircleRatio`      | Measure glyph box and surrounding circle at each circled depth/size and calculate their ratio.                                          |
| 🗂️ `NavigationShape`  | Inspect leading/trailing corner geometry on circled and without a circle navigation items across states.                                |
| 🗂️ `TOCBadges`        | Toggle scores/stages/variants; compare page item and matching TOC end-content visibility for each destination.                          |
| 🗂️ `TOCTags`          | Inspect every rendered TOC stage-related item for repeated stage tags while page tags remain present.                                   |
| 🗂️ `TOCTitle`         | Inspect closed/open mobile and desktop TOC for redundant visible title separately from its accessible landmark name.                    |
| 🗂️ `TOCTrigger`       | Keyboard/pointer-activate the separate native TOC control; independently activate several compact flower petal links.                   |
| 🗂️ `IndependentPie`   | Open then close the TOC by control/Escape/outside click and inspect pie visibility, hit targets and unchanged ownership.                |
| 🗂️ `MobileChrome`     | At mobile top measure logo center, left control order and right TOC-control placement.                                                  |
| 🗂️ `OpenIdentity`     | Open TOC for short and long names; repeat compact identity fit measurements and resize while open.                                      |
| 🗂️ `OpenPie`          | Open TOC at mobile compact rest; measure pie top before/during/after panel transition.                                                  |
| 🗂️ `HiddenNavigation` | Tab/Shift+Tab and inspect accessibility tree with TOC closed, open and closing; record focus targets inside panel.                      |
| 🗂️ `PopoverControl`   | In Chromium, Firefox, and WebKit exercise native trigger, focus, Escape, outside click and pointer links through repeated opens/closes. |
| 🗂️ `OverlayCoverage`  | Capture dense TOC entry/exit frames over contrasting underlying content; inspect unintended exposed or masked regions.                  |
| 🗂️ `MarkerVisibility` | Move current target outside TOC viewport; inspect own-scroll area reveal, then hover and leave to test suspension and delayed resume.   |

## 18. Site-navigation overlay geometry visible on `WalletPage`

| Requirement        | Procedure                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| ☰ `MenuDepth`     | Record mobile menu/content transforms and transform origins through entry/exit at nonzero root scroll.             |
| ☰ `MenuSearch`    | Open mobile menu on short viewport; scroll it to both ends and keyboard-reach bottom search.                       |
| ☰ `SearchEntry`   | Capture menu/search entry frames and compare search translation/delay with established reference.                  |
| ☰ `ClosedMenu`    | Close menu then click/tab/scroll underlying content across the former overlay area.                                |
| ☰ `HeaderSurface` | Inspect mobile site-header backdrop/border/shadow with menu closed at top and scrolled states.                     |
| ☰ `MenuResize`    | Open mobile menu, resize above 1024 pixels, operate the retained control and verify a usable closed wide state.    |
| ☰ `MenuBlur`      | Record computed/rendered blur from entry zero through rest and closing, including reduced-transparency preference. |
| ☰ `MenuSurfaces`  | Scroll navigation items into current/stuck/idle states and compare surfaces without permanent idle paint.          |

## 19. Anchor landing and root proximity snap geometry

| Requirement           | Procedure                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚓ `Proximity`        | Inspect computed root scroll-snap-type; accept block or y with optional proximity, reject mandatory or none.                                                  |
| ⚓ `SnapBoundaries`   | Enumerate actual snap areas and compare document positions with measured breadcrumb/container start/end contact boundaries; deduplicate coincident positions. |
| ⚓ `ContactExclusion` | Inspect snap-area ownership/positions around pie encounter and compare against independent heading/container boundaries.                                      |
| ⚓ `FragmentStart`    | Activate every pie/TOC/page destination and compare settled target top with measured animation-start/stack boundary.                                          |
| ⚓ `HistoryLanding`   | For nested/parent hashes compare initial URL, reload, hydrated click and browser back/forward settled geometry/current state.                                 |
| ⚓ `ScrollAgreement`  | Record `scrollTop` per frame during native smooth links near snap boundaries and inspect extra reversals/corrective movements.                                |
| ⚓ `LateLayout`       | Delay fonts/images, navigate before hydration, then release loads and resize; remeasure settled target/stack alignment.                                       |
| ⚓ `ImageReservation` | Delay reference-image responses; compare reserved box/aspect ratio and downstream document coordinates before/after load.                                     |
| ⚓ `ExactBoundaries`  | Compare measured start/end, hash landing and snap coordinates independently of any approximate visual row or exclusion-area size.                             |
| ⚓ `TopTarget`        | Enumerate actual page-top controls and activate them; inspect literal fragment and final top landing.                                                         |

## 20. Floating controls and footer containment

| Requirement             | Procedure                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 🎛️ `DetailsControl`     | Measure bulk-details control at mobile/desktop top and scrolled states against required owner corners.                                    |
| 🎛️ `SectionControls`    | Measure previous/next controls relative to mobile viewport and desktop TOC, including open/closed TOC.                                    |
| 🎛️ `ControlContainment` | Scroll all floating controls through footer arrival/end; compare movement, owner insets and footer overlap.                               |
| 🎛️ `AdjacentNavigation` | Activate previous/next from between headings and at boundaries; compare landing with adjacent semantic anchors instead of viewport steps. |
| 🎛️ `ControlTooltips`    | Inspect actual control semantics/actions and explanatory tooltip presentation with pointer/keyboard where supported.                      |

## 21. Native accessibility, preferences and fallback geometry

| Requirement              | Procedure                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ♿ `NoScript`            | Disable site JavaScript, reload, keyboard-open nested details and activate page/TOC/pie hashes; inspect readable headings and reachable targets.    |
| ♿ `Hydration`           | Compare disabled-JS, script-delayed and hydrated loads; inspect enabled control states and native functionality of each control.                    |
| ♿ `NativeInput`         | Keyboard/touch-operate links, select, nested details, TOC, and site menu; inspect native roles/focus/activation and dismiss behavior.               |
| ♿ `FocusNaming`         | Tab/Shift+Tab through controls on contrasting surfaces at flow/sticky/open states; capture visible focus indication.                                |
| ♿ `ControlNames`        | Inspect accessible names of every control, including icon-only controls, variants, and floating controls at each state.                             |
| ♿ `DecorativeNames`     | Compare accessible heading/link names with adjacent decorative glyph text in font/emoji modes; detect duplicated spoken identity.                   |
| ♿ `Capabilities`        | Run three engines and independently disable each enhancement in a test-only fixture; inspect retained supported effects and useful native fallback. |
| ♿ `Firefox`             | In Firefox measure proportional fallback row heights/overlaps and prose flow, then compare enhanced-engine sizing unchanged.                        |
| ♿ `ReducedMotion`       | Enable reduced motion before load and during scroll; inspect interpolation removal and final hierarchy/layout/navigation.                           |
| ♿ `ReducedTransparency` | Enable reduced transparency; inspect computed blur and rendered shared color fallback on all normally blur-only surfaces including pie.             |
| ♿ `ProductionParity`    | Run the same structural/interaction/geometry scenarios against production preview and compare with development at matching data/preferences.        |

## 22. Continuity and page-level motion quality

| Requirement        | Procedure                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚡ `VisibleBounds` | Intersect visible glyph/heading/badge/control bounds at dense transition samples, then visually inspect shape/clipping/occlusion counterexamples.                                                                                                                               |
| ⚡ `Monotonicity`  | Record scroll and item geometry under monotonic, jump, touch-like, reversal, and breakpoint inputs; inspect convergence and stranded content.                                                                                                                                   |
| ⚡ `FastScroll`    | Capture native high-delta wheel/reversal frames and compare glyph/marker/background/prose/clearance/companions at equal scroll positions.                                                                                                                                       |
| ⚡ `Smoothness`    | After complete first-pass coverage, profile actual scroll traces and inspect avoidable layout/paint stalls alongside visible output.                                                                                                                                            |
| ⚡ `FramePacing`   | After complete first-pass coverage and warm-up, record comparable native-scroll frame intervals/long tasks; calculate `p95` and counts over `33ms`.                                                                                                                             |
| ⚡ `Android`       | After structural acceptance, run heading, details, pie, TOC, menu, and footer journeys in a constrained Chromium mobile touch profile. Record CPU constraint, browser/GPU configuration, responsiveness, frame pacing and trace/visual evidence; identify emulation explicitly. |
