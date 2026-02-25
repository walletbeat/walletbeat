---
name: wallet-data-contributor
description: >
  Use when a contributor wants to add or update wallet data in the walletbeat
  project (data/software-wallets/, data/hardware-wallets/, or
  data/embedded-wallets/). Guides through entity setup, contributor file,
  wallet skeleton, and populating every feature field.
argument-hint: "[wallet-name]"
---

You are helping a contributor add or update wallet data in the Walletbeat project.
The wallet they want to contribute is: **$ARGUMENTS** (if blank, ask them which wallet before proceeding).

You have explicit permission to create and edit files inside `data/contributors/` and `data/` (including all subdirectories).

## Your first actions

Before doing anything else:

1. If `$ARGUMENTS` is blank, ask: "Which wallet would you like to add or update?"
2. Ask the wallet type if it is not obvious from the name:
   - **Software wallet** — browser extension, mobile app, or desktop app
   - **Hardware wallet** — physical signing device (Ledger, Trezor, etc.)
   - **Embedded wallet** — SDK integrated into another application (Privy, Dynamic, etc.)
3. Ask explicitly: "What wallet data would you like to add or update?" (e.g., a specific feature, all null fields, the entity info, etc.)
4. Check immediately whether the wallet file already exists:
   - Software: `data/software-wallets/[wallet-name].ts`
   - Hardware: `data/hardware-wallets/[wallet-name].ts`
   - Embedded: `data/embedded-wallets/[wallet-name].ts`
5. Ask: "What is your preferred display name or nickname?" and "Do you already have a contributor file in `data/contributors/`?"
   - If **yes** — locate `data/contributors/[their-nickname].ts` and confirm it exists. You only need to ensure they appear in the `contributors: []` array of the wallet file.
   - If **no** — also ask for their affiliation (company / role, if any) and a URL to their profile (GitHub, Twitter, etc.). You will create the contributor file for them in Step C below.
6. Read the following files in parallel (skip files that don't exist):
   - The matching template for the wallet type:
     - Software: `data/software-wallets/unrated.tmpl.ts`
     - Hardware: `data/hardware-wallets/unrated.tmpl.ts`
     - Embedded: `data/embedded-wallets/unrated.tmpl.ts`
   - The standard software wallet example: `data/software-wallets/ambire.ts`
   - The contributor guide: `resources/docs/contribute/wallet-data.md`
   - The existing wallet file if one already exists
   - The example entity file: `data/entities/example.ts`
   - The example contributor file: `data/contributors/example.ts`

After reading these files, greet the contributor warmly, summarize what wallet and type you will be working on, and begin walking through the steps below.

---

## Step A — Contributor file (always required)

Handle the contributor file before touching any wallet data.

### If the contributor already has a file

Confirm it exists and note the exported constant name. No further action needed here — just remember to add them to `contributors: []` in the wallet file later.

### If the contributor does not have a file yet

Using the information collected in step 5 above (name, affiliation, profile URL), create `data/contributors/[their-nickname].ts` for them. Use `data/contributors/example.ts` as the template.

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

Once the file exists (created now or pre-existing), make sure the contributor is listed in the `contributors: []` array inside the wallet file. If they are not there, add them.

---

## Step B — Orient the contributor (only if the wallet does not exist yet)

If the wallet file **already exists**, skip to Step C.

Briefly explain the layout of `/data/`:

```
/data
├── contributors/          ← Add yourself here (first time only)
├── entities/              ← Add the wallet's development company here
├── software-wallets/      ← Wallet data files (or hardware-wallets/, embedded-wallets/)
│   ├── ambire.ts          ← Gold-standard reference example
│   ├── unrated.tmpl.ts    ← Template to copy when adding a new wallet
│   └── [wallet-name].ts   ← The file you will create or edit
├── software-wallets.ts    ← Index — register the new wallet here
└── wallet-contracts/      ← Smart contract data (only for smart account wallets)
```

Also mention: `/public/images/wallets/` for wallet icons, `/public/images/entities/` for entity icons.

---

## Step C — Add basic wallet information (only if the wallet does not exist yet)

If the wallet file **already exists**, skip to Step D.

Walk through substeps C.1 through C.4 in order, one at a time, waiting for the contributor to confirm each before moving on.

### Step C.1 — Entity file

Ask the contributor for the wallet developer's company name and legal name.

Instruct them to:
- Check if the entity already exists in `data/entities/`. If so, skip to C.2.
- If not, copy `data/entities/example.ts` to `data/entities/[kebab-case-company-name].ts`.
- Remove all constants except the `WalletDeveloper` one; rename it to the camelCase company name.
- Fill in: `id`, `name`, `legalName`, `type`, `jurisdiction`, `url`, `repoUrl`, `privacyPolicy`, and social/profile URLs.
- Find an SVG icon, crop transparent edges, and save to `/public/images/entities/[entityId].svg`.
  - If only PNG is available: save as `.png` and set `icon: { extension: 'png', width: N, height: N }`.

Key type fields to explain:
- `type.walletDeveloper: true` — always true for the company behind a wallet
- `type.chainDataProvider: true` — only if the company also runs RPC infrastructure
- `type.transactionBroadcastProvider: true` — only if the company runs transaction relay infrastructure
- Add the corresponding interface (`& ChainDataProvider`, etc.) to the TypeScript type when setting these to `true`

### Step C.2 — Wallet skeleton file

Instruct the contributor to:
- Copy the template (`data/[type]-wallets/unrated.tmpl.ts`) to `data/[type]-wallets/[kebab-wallet-name].ts`.
- Rename the exported constant from `unratedTemplate` / `unratedHardwareTemplate` / `unratedEmbeddedTemplate` to the camelCase wallet name (e.g., `rainbow`, `ledgerNano`, `privySdk`).
- Update `metadata`:
  - `id`: camelCase wallet name (e.g., `'rainbow'`) — must match the icon filename
  - `displayName`: The wallet's official display name
  - `tableName`: Short name for table display (often same as displayName)
  - `blurb`: A one-sentence description wrapped in `paragraph(\`...\`)`
  - `contributors`: `[yourContributorConstant]`
  - `iconExtension`: `'svg'` (or `'png'` if no SVG available)
  - `lastUpdated`: Today's date as `'YYYY-MM-DD'`
  - `urls`: Fill in actual wallet URLs; remove social fields that don't apply
- Update `variants` to only include the variants the wallet actually has:
  - Software: `Variant.BROWSER`, `Variant.MOBILE`, `Variant.DESKTOP` (remove inapplicable ones)
  - Hardware: `Variant.HARDWARE` (already set in template)
  - Embedded: `Variant.EMBEDDED` (already set in template)
- Find an SVG icon, crop transparent edges, save to `/public/images/wallets/[id].svg`.
  - If only PNG: save as `.png` and set `iconExtension: 'png'` in metadata.

At this point, all `features` fields should remain `null` — that is populated in Step D.

### Step C.3 — Register in index

For the wallet to appear on the site, instruct the contributor to edit the index file:
- Software: `data/software-wallets.ts`
- Hardware: `data/hardware-wallets.ts`
- Embedded: `data/embedded-wallets.ts`

Add the import and add the wallet to the exported object:
```typescript
import { myWallet } from './software-wallets/my-wallet'
// ...
export const softwareWallets = {
  // ... existing wallets ...
  myWallet,
}
```

### Step C.4 — Verify the setup

Once Steps C.1–C.3 are complete, instruct the contributor to run:

```bash
pnpm lint         # Fix formatting
pnpm check:all    # Check for errors
pnpm dev          # Then browse to http://localhost:4321/ to see the wallet in the table
```

Help them interpret and fix any TypeScript or lint errors. Common issues:
- Missing import for `Variant` or other enums
- Incorrect object structure from the template
- The wallet icon file is missing (the build won't fail but the icon will be broken)

Once `pnpm check:all` passes and the wallet shows in the table (all gray/unrated), move to Step D.

---

## Step D — Populate feature fields

The goal is to replace every `null` field (or the specific fields the contributor identified in step 3) with real data gathered by testing the wallet and/or inspecting its source code.

### General workflow for each field

For every `null` field:
1. Explain what the field measures (use TSDoc from the type definition — Ctrl+Click on the field name in the editor to navigate to the type)
2. Describe how to test or verify it
3. Show the Ambire example value if applicable
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

Walk through each `null` field in the wallet file (or only the fields the contributor asked about in step 3). For each one, provide:
- **What it measures** (from the TSDoc comment at the type definition)
- **How to test it** (describe the testing method: try the wallet UI, inspect network traffic, read source code)
- **Ambire example** (show the corresponding value from `data/software-wallets/ambire.ts` if applicable)
- **Ref expectations** (does it need `WithRef`? Is `refTodo` okay? Does it need `MustRef`?)

---

## Final step — Verify everything

Once all desired fields are filled in, run:

```bash
pnpm lint         # Auto-fix formatting
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
- **Run `pnpm lint` before every commit** to auto-fix formatting.
- **Run `pnpm check:all` before opening the PR** — it must pass.
- **Affiliation must be disclosed** — if the contributor is affiliated with the wallet's company, they must set the `affiliation` field in their contributor file.
- **Ctrl+Click on any field** in your editor to jump to its type definition — this is the fastest way to understand what a field expects.
- **Look at `ambire.ts`** for any field you're confused about — it's the most completely filled-in wallet example.
