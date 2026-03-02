---
name: wallet-update
description: >
  Use when a contributor wants to populate or update feature data for a wallet
  that already exists in the walletbeat project. Guides through filling in null
  feature fields with proper values, types, and refs. To add a brand-new wallet
  first, use /wallet-create instead.
argument-hint: '[wallet-name]'
---

You are helping a contributor populate or update feature data for a wallet in the Walletbeat project.
The wallet they want to work on is: **$ARGUMENTS** (if blank, ask them which wallet before proceeding).

You have explicit permission to create and edit files inside `data/contributors/` and `data/` (including all subdirectories).

## Your first actions

Before doing anything else:

1. If `$ARGUMENTS` is blank, ask: "Which wallet would you like to add feature data for?"
2. Identify the wallet type (software / hardware / embedded) if not obvious from the name.
3. Check that the wallet file already exists:
   - Software: `data/software-wallets/[wallet-name].ts`
   - Hardware: `data/hardware-wallets/[wallet-name].ts`
   - Embedded: `data/embedded-wallets/[wallet-name].ts`
   - If it does **not** exist, let the contributor know and suggest using `/wallet-create` first to register the wallet.
4. Ask: "What wallet data would you like to add or update?" (e.g., a specific feature, all null fields, a particular group of fields)
5. Ask: "What is your preferred display name or nickname?" and "Do you already have a contributor file in `data/contributors/`?"
   - If **yes** — confirm it exists. You only need to ensure they appear in the `contributors: []` array of the wallet file.
   - If **no** — also ask for their affiliation (company / role, if any) and a URL to their profile. You will create the contributor file in Step A below.
6. Read the following files in parallel (skip files that don't exist):
   - The existing wallet file
   - The completed reference example: `data/software-wallets/completed.tmpl.ts`
   - The contributor guide: `resources/docs/contribute/wallet-data.md`
   - The example contributor file: `data/contributors/example.ts` (only if they need a new contributor file)

After reading these files, greet the contributor, summarize which wallet and fields you'll be working on, and begin.

---

## Step A — Contributor file

Handle this before touching any feature data.

### If the contributor already has a file

Confirm it exists and note the exported constant name. Make sure they appear in the wallet file's `contributors: []` array. If not, add them.

### If the contributor does not have a file yet

Create `data/contributors/[their-nickname].ts` using `data/contributors/example.ts` as the template.

Key rules:

- **Affiliation must always be disclosed.** If they work for or have equity in the wallet's company, set `affiliation` accordingly. If they have no affiliation, set `affiliation: []`.
- Import the entity constant if they have an affiliation (it must already exist in `data/entities/`).

Example for an affiliated contributor:

```typescript
import type { Contributor } from '@/schema/wallet'
import { myWalletCorp } from '@/data/entities/my-wallet-corp'

export const chainMonkey: Contributor = {
	name: 'Chain Monkey',
	affiliation: [
		{
			developer: myWalletCorp,
			hasEquity: true,
			role: 'EMPLOYEE', // or 'FOUNDER', 'ADVISOR', 'CONTRACTOR'
		},
	],
}
```

Example for an unaffiliated contributor:

```typescript
import type { Contributor } from '@/schema/wallet'

export const chainMonkey: Contributor = {
	name: 'Chain Monkey',
	affiliation: [],
}
```

Once the contributor file exists (confirmed or newly created), make sure they appear in the wallet file's `contributors: []` array. Also update `lastUpdated` to today's date.

---

## Step B — Populate feature fields

The goal is to replace every `null` field (or the specific fields the contributor identified) with real data gathered by testing the wallet and/or inspecting its source code.

### General workflow for each field

For every `null` field:

1. Explain what the field measures (use TSDoc from the type definition — Ctrl+Click on the field name in the editor to navigate to the type)
2. Describe how to test or verify it
3. Show the completed example value from `data/software-wallets/completed.tmpl.ts` if applicable
4. Let the contributor fill it in with a `ref`

### The type system — read this section carefully

**`null` = unknown.** Never use `undefined`. A `null` field means "we don't know yet." Leave fields as `null` rather than guessing.

**`VariantFeature<T>`** — Nearly every field is wrapped in this. It means you can either:

- Use a single value for all variants: `multiAddress: featureSupported`
- Use a per-variant object if the behavior differs: `multiAddress: { [Variant.BROWSER]: featureSupported, [Variant.MOBILE]: notSupported }`

**`Support` / `featureSupported` / `notSupported` / `supported({...})`**:

```typescript
import { featureSupported, notSupported, supported } from '@/schema/features/support'

// Feature is supported, no extra data needed:
multiAddress: featureSupported

// Feature is not supported:
multiAddress: notSupported

// Feature is supported AND you need to provide additional structured data:
chainConfigurability: supported({
	ref: refTodo,
	l1: notSupported,
	nonL1: supported({ rpcEndpointConfiguration: RpcEndpointConfiguration.YES_BEFORE_ANY_REQUEST }),
	customChainRpcEndpoint: featureSupported,
})
```

**`WithRef<T>`** — Adds a `ref` field for sourcing. Always fill `ref` with evidence:

```typescript
// Single URL (shorthand):
ref: 'https://github.com/example/wallet/blob/main/src/config.ts'

// Single reference object with label and explanation:
ref: {
  url: 'https://example.com/docs/chain-config',
  label: 'Chain configuration docs',
  explanation: 'This page documents how to configure RPC endpoints.',
}

// Multiple references (array):
ref: [
  { url: 'https://...', label: '...', explanation: '...' },
  { url: 'https://...', label: '...' },
]

// Placeholder — acceptable for initial PRs:
ref: refTodo

// Not necessary — use when the fact is self-evident:
ref: refNotNecessary
```

**`MustRef<T>`** — Like `WithRef` but you **must** provide a real `ref`. `refTodo` and `refNotNecessary` will not compile. Used for fields like `publicSecurityAudits` where the URL to the audit report is the primary piece of evidence.

**`Nullable<T>`** — Any subfield can be `null` if unknown. If any subfield is `null`, Walletbeat treats the entire field as unrated.

**Type inference tip**: If TypeScript complains about the `supported({...})` call, explicitly annotate the type parameter:

```typescript
supported<WithRef<ChainConfigurability>>({ ... })
```

### Field-by-field guidance

Walk through each `null` field in the wallet file (or only the fields the contributor asked about). For each one, provide:

- **What it measures** (from the TSDoc comment at the type definition)
- **How to test it** (describe the testing method: try the wallet UI, inspect network traffic, read source code)
- **Completed Passing wallet example** (show the corresponding value from `data/software-wallets/completed.tmpl.ts` if applicable)
- **Ref expectations** (does it need `WithRef`? Is `refTodo` okay? Does it need `MustRef`?)

---

## Final step — Verify everything

Once all desired fields are filled in, run:

```bash
pnpm fix          # Auto-fix formatting
pnpm check:all    # Must pass before opening a PR
```

Help the contributor fix any remaining TypeScript or lint errors before they open their pull request.

---

## Key rules to remind the contributor throughout

- **`null` = unknown** — never use `undefined`; always prefer `null` over guessing.
- **Every non-obvious value needs a `ref`** — a URL pointing to source code, docs, or a public statement.
- **`refTodo` is a valid placeholder** for initial PRs; improve refs before the PR is merged if possible.
- **`refNotNecessary`** is only for self-evident facts (e.g., Safe Wallet supports Safe multisigs).
- **`MustRef` fields require a real URL** — `refTodo` won't compile there.
- **Run `pnpm fix` before every commit** to auto-fix formatting.
- **Run `pnpm check:all` before opening the PR** — it must pass.
- **Affiliation must be disclosed** — if the contributor is affiliated with the wallet's company, they must set the `affiliation` field in their contributor file.
- **Ctrl+Click on any field** in your editor to jump to its type definition — this is the fastest way to understand what a field expects.
- **Look at `completed.tmpl.ts`** for any field you're confused about — it's the most completely filled-in wallet example.
