---
title: CSS attribute authoring
---

# CSS attribute authoring

Read this methodology together with `src/styles/css-attributes.css`, the relevant
markup and component styles, and `src/styles/global.css` before changing styles.
The CSS annotations own each attribute's API; this document owns the authoring
method. Generated declarations and editor data are derived outputs.

## Establish ownership before editing

Irreducibility means the smallest sufficient system: each independent fact has one
owner, dependent values are derived, and required behavior survives reduction.
Apply this throughout the change, not only during final cleanup.

1. Identify the existing owners of layout, spacing, state, surface, and motion across
   the local and global cascade. Check inherited values and native defaults before
   adding declarations.
2. Use existing attribute tokens and public parameters first. Place component
   overrides under that component's nested `&[data-name]` selector. Configure the
   primitive rather than reimplementing its properties locally.
3. Keep instance-specific inputs at the usage boundary and reusable behavior in
   its primitive. Add an attribute or variant only for a distinct reusable behavior.
   Keep independent axes composable; avoid section-specific tokens and combinations
   that merely rename existing state.
4. Diagnose usage before repairing a shared primitive. Trace the real parent/child
   structure, scroll owners, padding, margins, inheritance, and resets. Temporarily
   disabling and reapplying attributes can isolate the incorrect owner.
5. A nested container both participates in its parent and establishes its own
   internal scope. Preserve both responsibilities. Rejection of a particular
   `:scope` rewrite does not prohibit the existing `@scope` reset mechanism.

## Author selectors and values consistently

- Nest states, pseudo-elements and attribute overrides under their actual owner.
  The interactive link or summary owns hover/focus, not its decorative glyph.
- Use `[data-name~="token"]` for independently composable whitespace tokens, with
  double-quoted selector values. Retain equality for genuinely exact-value APIs.
- Factor repeated selectors with `:is()` or `:where()` only while preserving the
  selected element set, specificity, and state behavior. Share declarations across
  states and queries when their scope allows it.
- Preserve semantic markup. Do not introduce wrappers, classes, or attributes just
  to make a selector convenient. A necessary semantic class remains legitimate;
  there is no blanket ban on classes or prescribed nesting depth.
- Public configurable properties retain `--`; internal calculated properties use
  `---` at the closest shared ancestor of their consumers. Follow the existing
  primitive's names. Do not broaden ownership to the root for convenience.
- Inline single-use intermediates and redundant `calc()` layers when that improves
  the actual derivation. Keep names for shared facts or necessary boundaries.
  Preserve logical layout directions and distinguish inner/outer geometry.
- Reuse global size, spacing, color, duration, and easing inputs. Inherit transition
  defaults and declare only the necessary transition properties.
- Keep CSS-expressible geometry and visual state in CSS. Pass only necessary
  semantic inputs across component boundaries. Scroll motion remains CSS-only in
  production; do not add observers, per-frame values or duplicate measuring content.

## Document at the CSS definition

Annotations, including those on nested definitions, feed the same generation
pipeline. Do not maintain a second token or documentation schema.

Use this order, omitting inapplicable sections:

1. Attribute heading `## [data-name]` in the rendered documentation. The generator
   can supply it from the source selector. Introductory prose explains purpose and
   defaults; do not add separate `Purpose` or `Default` headings.
2. `Applied to`: native elements or primitives receiving this behavior implicitly.
3. `Placement`: the required parent/child relationship for child attributes, before
   `Tokens`.
4. `Tokens`: only supported tokens; omit the section if there are none.
5. `CSS Variables`: configurable inputs, before examples.
6. `Examples`: a list of brief explanations and indented, fenced `html` snippets.
   First show genuine defaults, including omission of the attribute when a native
   element already has the behavior. Later examples demonstrate this attribute's
   own variants. Use generic usable markup, double quotes and readable literal
   characters rather than unnecessary HTML escapes.
7. `Source`: a valid `@see` link to the CSS definition in the workspace.

Keep comments concise and on topic; preserve meaningful explanations during
reduction. Avoid descriptions such as “Token for” and commentary about mechanical
selector edits. The adopted name is `css-attributes`, and `Applied to` supersedes
`Used by`. Do not revive the earlier separate purpose/default/usage sections.

Regenerate with `pnpm run generate:css-attributes` and format the outputs whenever
annotations or tokens change. Include tracked generated outputs in the same atomic
commit as their source change, and verify regeneration is stable. The earlier
proposal to ignore generated files was superseded.

Preserve native Svelte element attributes when augmenting their types. HTML, Astro
and Svelte should retain formatted hover documentation, examples, completions and
working source links, without duplicate raw Markdown. Type-checking alone does not
prove the editor experience; report any editor verification limitation explicitly.

## Verify and reduce the whole change

Review all consumers when changing a shared variable or selector, including layout
files and breakpoint overrides. Remove displaced declarations, unused identifiers,
registrations, wrappers and abandoned experiments. Preserve native controls,
semantics, fallback behavior and reduced-motion requirements. Do not infer a new
universal property order or a fixed number of audits from historical staging tasks.

Check source, generation and emitted browser behavior at their respective owners.
A parser failure calls for a tooling fix, not a rewrite of valid CSS or runtime JS.
Do not add manual vendor prefixes already supplied by the build.

For behavioral changes, verify the required geometry, interaction and supported
states across consumers. For motion, inspect actual compositor eligibility and
trace native input separately from screenshot collection; property names and sparse
screenshots are insufficient performance evidence. Preserve established boundaries
when changing easing. Tests must protect requirements, not merely repeat the current
implementation. Run the repository's required checks for code changes.

The working loop is: read owners → reuse tokens and minimal inputs → change the
correct owner → remove superseded code → verify consumers and emitted behavior →
regenerate affected metadata → review the complete diff and commit coherently.
