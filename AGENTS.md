# General Walletbeat knowledge base

This file provides guidance to coding agents when working with code in this repository.

## Overview

Walletbeat is a comprehensive rating platform for Ethereum wallets. It's built as a static site using Astro, TypeScript, and React, featuring a data-driven architecture that objectively evaluates wallet features across multiple categories (security, privacy, self-sovereignty, transparency).

## Development commands

```bash
# Development
pnpm install         # Install dependencies
pnpm dev             # Start development server (http://localhost:4321 by default)
pnpm dev:background  # Start development server, daemonize it, and print its URL; useful for keeping server running past single-turn execution.

# Quality checks (run before committing, not after every edit)
pnpm check:quick  # Fast checks (lint, syntax, spelling, misc)
pnpm check:all    # Comprehensive checks (includes Astro check)

# Building
pnpm build        # Build for production
pnpm preview      # Preview production build

# Fixing issues
pnpm lint         # Auto-fix syntax and lint issues
```

## Core architecture

### Data processing pipeline

1. **Wallet Data** (`/data/[wallet-type]/`): Raw wallet metadata and feature data
2. **Features** (`src/schema/features/`): Objective, factual data about wallet capabilities. Read `resources/docs/features/features.md` if you need to understand wallet feature types.
3. **Attributes** (`src/schema/attributes/`): Evaluation logic that transforms features into ratings
4. **Attribute Groups** (`src/schema/attribute-groups.ts`): Logical groupings of related attributes

### Rating system

Each attribute evaluates wallet features and returns one of 5 ratings:

- `PASS`: Meets criteria completely
- `FAIL`: Does not meet criteria
- `PARTIAL`: Partially meets criteria
- `UNRATED`: Insufficient data for evaluation
- `EXEMPT`: Not applicable to this wallet type

### Wallet types

- **Hardware wallets**: Physical devices for key storage
- **Software wallets**: Browser extensions, mobile/desktop apps
- **Embedded wallets**: SDKs integrated into other applications

## Key constraints

### Schema rules

- `/data` fields must be explicit: never `undefined` / `?` for new properties. Use `null` for unknown, and a named sentinel (`NO_*`) or empty array for "none / does not apply". This applies to features, entities, contributors, and new wallet metadata — not only `WalletFeatures`. See `resources/docs/contribute/wallet-data/wallet-data.md`.
- Wallet feature data must be objective and unopinionated.
- Attributes evaluate only feature data, no other inputs.
- Some feature blobs allow per-field unknowns while `/data` is incomplete. For those, keep the exported feature type as the complete shape `F`, put `Nullable<F>` only on the `WalletBaseFeatures` field, and let `ResolvedFeatures` expose either a full `F` or `null`. In `resolveFeatures`, wrap these entries with `nullable()` so any remaining `null` property makes the whole resolved feature `null`; for `Support`-wrapped blobs, put `Nullable` inside the supported payload and resolve with `nullable<Support<ResolvedShape>>(...)`. See `.cursor/rules/50-wallet-schema.mdc` for the full pattern.
- Read `resources/docs/features/features.md` if you need to understand wallet feature types.
- Bare `YYYY-MM-DD` dates are UTC, matching the treasury and wallet-data-collection tooling.

### Code quality

- Don't run checks after every edit; they are slow. Run `pnpm fix` then `pnpm check:quick` once before each commit. Fix prettier issues with `pnpm fix` rather than formatting by hand.
- Never use `eslint-disable` or `as any` workarounds. Use the typesystem to your advantage, not as your enemy. Where unavoidable, express type narrowings as type-assertion or type-checking functions (i.e. return signatures of `func isSomeType(x: ...): x is SomeType` or `func assertSomeType(x: ...): asserts x is SomeType`) that do runtime type-checking, and no other work. Look for helpers that may already exist for existing types, e.g. string prefix/suffix narrowing functions, `NonEmptyArray`/`NonEmptyRecord` assertions, and `Enum` helper classes with assertion functions all already exist.
- Add spelling exceptions to `.cspell.json` only for valid terms. You may also update grammar rules at `tests/utils/grammar.ts` as necessary. If doing so breaks other content on the site as a result of your update, fix it in the same pass rather than adding exclusions.
- Reuse helpers and common libraries. Chances are the problem you are trying to solve (argument parsing, codebase traversal, or grammar checking) was already faced by some other part of the codebase. Do not reinvent the wheel.
- Legacy is debt. Do not write code that assumes fallbacks to previous behavior is needed; doing so incurs debt accumulation, with interest. Fixing it all in the moment is cheaper.

### Testing

Run `pnpm check:all` before considering tasks complete or opening a PR. PR checks will fail unless `pnpm check:all` passes.

Note that `pnpm check:all` has side-effects in some cases, such as updating the image cache, which is necessary to pass when running in CI. As such, relying on CI to tell you if tests pass is insufficient; you _MUST_ run it locally prior to sending a PR. If it fails due to reasons your changes introduce, fix them. If it fails due to unrelated reasons, you should investigate and either file an issue, or send another PR to fix this first.

Some changes require certain command-line tools to be installed. Example includes `inkscape` in the case of SVGs, or `bwrap` on Linux for testing build reproducibility. If these are not installed, ask your operator what to do as appropriate.

### Comments

Code comments must not be temporal. This means they must stand the test of time. They must assist any and all _future_ readers of the codebase, not a reviewer of the change being done in the present. Comments describing why something works a certain way are good when that would otherwise be non-obvious, but comments describing the specific problem that some particular line was added fix are completely irrelevant. If a problem is likely to reoccur in the future, the correct fix is not a comment describing the problem, but a test verifying that the problem never happens again.

- Bad comment: "Check for URLs with line numbers first, because the deep search below used to take minutes without it.": Who cares how long it used to take? What does "URLs with line numbers" even mean?
- Good comment: "Cheap pre-filter to remove most entries prior to the more expensive deep search later.": Good, explains the structure of the code and why a pre-filter pass exists.

Comments in wallet `/data` files are almost never appropriate. Use the `wallet-update` skill when updating wallet data files.

### Test scope

Like comments, tests must stand the test of time. Tests that exercise a very narrow bug that is never likely to reoccur are useless and consume CI time for every future PR for no reason. They are at best a fix development aid while implementing a fix, but do not belong in the fix PR itself.
Tests that are worthwhile are tests that assert _classes of problems_ as a whole.

Bad test: A test that verifies that a Markdown string generation function ends with a period (because it used not to, by accident). This is never going to resurface as a bug. The test is overfitting.
Good test: Run the output of this Markdown string generation function through the grammar checker pipeline. This will catch this and similar errors in this function (or any of the ones it may call), now and in the future.
Better test: Verify that all generated Markdown on the site uses correct punctuation and grammar. This will catch such errors across the entire codebase, now, and in the future, and avoids having to develop individual Markdown-generator-function-specific tests.

### Commit signing

CI requires every commit to be GPG/SSH-signed. The `check:signed-commit` check verifies the HEAD commit has a `gpgsig` field. Ensure your git configuration includes `commit.gpgsign true` with a valid signing key before pushing.

### CSS rules and system

Read `src/styles/css-attributes.css` to understand how to work with the site's CSS rule system.

## Adding New Wallets

When a wallet is being added to the site, load the `wallet-create` skill.

## Updating wallet data

When wallet data under `/data` is updated, load the `wallet-update` skill.

## Repository layout

- `data/`: Wallet data organized by type (hardware, software, embedded).
- `src/`: Main website and rating pipeline source code.
- `src/schema/`: Type definitions and evaluation logic.
- `src/components/`: React components for UI.
- `src/pages/`: Astro pages and routing.
- `deploy/`: Build and deployment scripts.
- `dist/`: Build outputs as generated by `pnpm build`.
- `public/`: Static files. `public/foo/bar.png` is served by the web server at `/foo/bar.png`.
- `tests/`: Unit tests with Vitest. Already runs as part of `pnpm check:all`, but can be run explicitly with `pnpm check:vitest`.
- `resources/`: Miscellaneous files.
- `governance/`: Project governance history. You generally do not need to touch this directory unless told otherwise.

## Commit and PR hygiene

Commit descriptions should have a topline under 72 characters describing the change. If this isn't sufficient to fully understand the change, it should be followed by two newline characters, and a longer description. Write for humans, using ASD-STE100 language (or 80% of the way there).

PR descriptions should follow similar constraints. The PR title is usually the topline of the commit, or a similar aggregate summary when sending multiple commits. When part of a stack, only the top-level commit is relevant to the PR's part in the stack. PR description can be similar ASD-STE100 language (or 80% of the way there), but PR descriptions also enable richer content such as images or videos. When sending PRs that update the site, screenshots, and videos speak more than prose, so prefer that.
For architectural changes or rating pipeline changes, describe the change via prose or a Mermaid diagram, whichever is clearer to humans.
