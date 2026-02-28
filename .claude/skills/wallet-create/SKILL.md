---
name: wallet-create
description: >
  Use when a contributor wants to add a brand-new wallet to the walletbeat
  project. Guides through entity setup, contributor file creation, wallet
  skeleton, and site registration. For populating feature data on an existing
  wallet, use /wallet-update instead.
argument-hint: '[wallet-name]'
---

You are helping a contributor register a new wallet in the Walletbeat project.
The wallet they want to add is: **$ARGUMENTS** (if blank, ask them which wallet before proceeding).

You have explicit permission to create and edit files inside `data/contributors/` and `data/` (including all subdirectories).

## Your first actions

Before doing anything else:

1. If `$ARGUMENTS` is blank, ask: "Which wallet would you like to add?"
2. Ask the wallet type if it is not obvious from the name:
   - **Software wallet** — browser extension, mobile app, or desktop app
   - **Hardware wallet** — physical signing device (Ledger, Trezor, etc.)
   - **Embedded wallet** — SDK integrated into another application (Privy, Dynamic, etc.)
3. Check immediately whether the wallet file already exists:
   - Software: `data/software-wallets/[wallet-name].ts`
   - Hardware: `data/hardware-wallets/[wallet-name].ts`
   - Embedded: `data/embedded-wallets/[wallet-name].ts`
   - If the file **already exists**, let the contributor know and suggest using `/wallet-update` instead to populate feature data.
4. Ask: "What is your preferred display name or nickname?" and "Do you already have a contributor file in `data/contributors/`?"
   - If **yes** — locate `data/contributors/[their-nickname].ts` and confirm it exists.
   - If **no** — also ask for their affiliation (company / role, if any) and a URL to their profile (GitHub, Twitter, etc.). You will create the contributor file for them in Step A below.
5. Read the following files in parallel:
   - The matching template for the wallet type:
     - Software: `data/software-wallets/unrated.tmpl.ts`
     - Hardware: `data/hardware-wallets/unrated.tmpl.ts`
     - Embedded: `data/embedded-wallets/unrated.tmpl.ts`
   - The contributor guide: `resources/docs/contribute/wallet-data.md`
   - The example entity file: `data/entities/example.ts`
   - The example contributor file: `data/contributors/example.ts`

After reading these files, greet the contributor warmly, summarize what wallet and type you will be working on, and begin walking through the steps below.

---

## Step A — Contributor file

Handle the contributor file before touching any wallet data.

### If the contributor already has a file

Confirm it exists and note the exported constant name. No further action needed here — just remember to add them to `contributors: []` in the wallet file later.

### If the contributor does not have a file yet

Using the information collected above (name, affiliation, profile URL), create `data/contributors/[their-nickname].ts` for them. Use `data/contributors/example.ts` as the template.

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

---

## Step B — Orient the contributor

Briefly explain the layout of `/data/`:

```
/data
├── contributors/          ← Add yourself here (first time only)
├── entities/              ← Add the wallet's development company here
├── software-wallets/      ← Wallet data files (or hardware-wallets/, embedded-wallets/)
│   ├── completed.tmpl.ts  ← Gold-standard reference example
│   ├── unrated.tmpl.ts    ← Template to copy when adding a new wallet
│   └── [wallet-name].ts   ← The file you will create
├── software-wallets.ts    ← Index — register the new wallet here
└── wallet-contracts/      ← Smart contract data (only for smart account wallets)
```

Also mention: `/public/images/wallets/` for wallet icons, `/public/images/entities/` for entity icons.

---

## Step C — Add basic wallet information

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

All `features` fields should remain `null` for now — those are populated separately using `/wallet-update`.

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

Once `pnpm check:all` passes and the wallet shows in the table (all gray/unrated), the wallet is registered.

---

## Next step — Populate feature data

The wallet is now visible on the site with all fields unrated. To fill in the actual feature data, use:

```
/wallet-update [wallet-name]
```

This separate skill guides through each `null` field — what it measures, how to test it, and how to fill in the value with a proper `ref`.
