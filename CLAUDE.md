# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Walletbeat is a comprehensive rating platform for Ethereum wallets. It's built as a static site using Astro, TypeScript, and React, featuring a data-driven architecture that objectively evaluates wallet features across multiple categories (security, privacy, self-sovereignty, transparency).

## Development Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm run dev          # Start development server (http://localhost:4321)

# Quality checks (run after code changes)
pnpm run check:quick  # Fast checks (lint, syntax, spelling, misc)
pnpm run check:all    # Complete checks (includes Astro check)

# Building
pnpm run build        # Build for production
pnpm run preview      # Preview production build

# Fixing issues
pnpm run lint         # Auto-fix syntax and lint issues
```

## Core Architecture

### Data Processing Pipeline

1. **Wallet Data** (`/data/[wallet-type]/`): Raw wallet metadata and feature data
2. **Features** (`src/schema/features/`): Objective, factual data about wallet capabilities
3. **Attributes** (`src/schema/attributes/`): Evaluation logic that transforms features into ratings
4. **Attribute Groups** (`src/schema/attribute-groups.ts`): Logical groupings of related attributes

### Rating System

Each attribute evaluates wallet features and returns one of 5 ratings:

- `PASS`: Meets criteria completely
- `FAIL`: Does not meet criteria
- `PARTIAL`: Partially meets criteria
- `UNRATED`: Insufficient data for evaluation
- `EXEMPT`: Not applicable to this wallet type

### Wallet Types

- **Hardware wallets**: Physical devices for key storage
- **Software wallets**: Browser extensions, mobile/desktop apps
- **Embedded wallets**: SDKs integrated into other applications

## Key Constraints

### Schema Rules

- No `WalletFeatures` fields should be `undefined` (use `null` for unknown data)
- Wallet feature data must be objective and unopinionated
- Attributes evaluate only feature data, no other inputs

### Code Quality

- Always run `pnpm run check:quick` after changes
- Run `pnpm run check:all` before considering tasks complete
- Fix prettier issues with `pnpm lint`
- Never use `eslint-disable` or `as any` workarounds
- Add spelling exceptions to `.cspell.json` only for valid terms

### UI Migration

- Avoid MUI component modifications (project is migrating away from MUI)
- Prefer Tailwind classes over MUI components
- Use CSS variables from `global.css` for theming

## Adding New Wallets

1. Copy appropriate `unrated.tmpl.ts` from `data/[wallet-type]/`
2. Rename to `[wallet-name].ts` and populate with wallet data
3. Import in corresponding `data/[wallet-type].ts` file
4. Submit pull request

## File Structure Patterns

- `/data/`: Wallet data organized by type (hardware, software, embedded)
- `/src/schema/`: Type definitions and evaluation logic
- `/src/components/`: React components for UI
- `/src/pages/`: Astro pages and routing
- `/deploy/`: Build and deployment scripts
