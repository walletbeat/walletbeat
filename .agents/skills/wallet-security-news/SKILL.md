---
name: wallet-security-news
description: >
  Use when a contributor wants to add a Wallet Security News entry to the
  walletbeat site. Guides through reading the incident source, extracting the
  required data, classifying the incident (type, severity, impact, status),
  structuring the news file, registering it in the index, and verifying with
  the project checks. Works for hacks, data breaches, vulnerabilities, and
  general incidents, whether they affect a tracked wallet or not.
argument-hint: '[incident-url-or-description]'
---

You are helping a contributor add a Wallet Security News entry to the Walletbeat project.
The incident they want to record is: **$ARGUMENTS** (if blank, ask them for the incident URL or a description of the incident before proceeding).

You have explicit permission to create and edit files inside `data/news/` and to edit `data/news/index.ts` and `.cspell.json`.

## Your first actions

1. If `$ARGUMENTS` is blank, ask: "Which incident would you like to add a security news entry for? Please share the announcement URL or a description."
2. Read the source material. If a URL was provided, fetch the page (use the browser or `curl`). Extract the facts below from the article itself — do not guess.
3. Read the schema and an example file so your entry matches the project conventions:
   - `src/types/content/news.ts` — the `WalletSecurityNews` type and all enums
   - `data/news/index.ts` — how entries are registered and sorted
   - One or two existing entries in `data/news/` as style references (e.g. `data/news/2026-01-06-global-e-breach.ts` for a service-provider data breach, or `data/news/2026-07-17-consensys-metamask-north-korean-hacker.ts` for a wallet-company incident)

After reading these, summarize the facts you extracted and confirm the classification with the contributor before creating the file.

---

## What data to look for

From the source, extract as many of these as the article supports:

- **Date of the incident / disclosure** → `publishedAt`
- **Date of the last update** (e.g. the publication date of the incident report, or today) → `updatedAt`
- **Affected wallet(s)** → `wallets`. Map to the exact wallet ID (the filename of the wallet in `data/software-wallets/`, `data/hardware-wallets/`, or `data/embedded-wallets/`, e.g. `metamask`, `ledger`).
  - If the wallet is **not tracked** in the project (no wallet file exists), use `wallets: []` — the entry is then a general incident. Do not invent an ID.
- **What happened** → `summary` (2–3 sentences, objective, and factual)
- **A short headline** → `title`

### Classifying the incident

Use the enums in `src/types/content/news.ts`. When unsure, pick the most conservative matching value and confirm with the contributor.

- **`type` (`NewsType`)** — how the event is categorized:
  - `HACK` — exploit/attack that stole crypto or wallet funds
  - `DATA_BREACH` — unauthorized exposure of personal information (not funds)
  - `VULNERABILITY` — discovered flaw, exploited or not
  - `INCIDENT` — general security event not covered above
- **`severity` (`Severity`)** — `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`, based on impact (funds at risk is high; a non-fund privacy exposure of emails is typically `MEDIUM`).
- **`impact.category` (`ImpactCategory`)** — what kind of damage:
  - `SEED_PHRASE_LEAK`, `PRIVATE_KEY_LEAK`, `SIGNING_BUG`, `SUPPLY_CHAIN`, `PRIVACY_LEAK`, `PHISHING_RELATED`, `HARDWARE_VULNERABILITY`, `VENDOR_INFILTRATION`, `OTHER`
- **`impact.fundsImpacted`** — `true` if user funds were affected or at risk, else `false`.
- **`status` (`IncidentStatus`)** — `RESOLVED` / `MITIGATED` / `ONGOING` / `DISPUTED`. Use the value matching how much the article indicates the incident is addressed.

---

## References

Every entry needs a `ref` (`WithRef<WalletSecurityNews>`) pointing at the primary source(s):

- **Prefer the official announcement / incident report** from the wallet developer or the affected party (e.g. a `blog` post, a security advisory).
- The `ref.label` should be a human-readable description of the link (e.g. the article's title), and `ref.url` the direct URL.
- Add secondary refs (news coverage, affected-company advisories) only if they add meaningful detail.
- To cite **more than one** source, make `ref` an array of labeled ref objects (each with `label` + `url`). E.g. a blog post plus the vendor's announcement on X:

  ```ts
  ref: [
    { label: 'Trezor blog: Recent customer data exposed in shipping provider incident', url: 'https://trezor.io/blog/news/...' },
    { label: 'Trezor on X: Customer data exposure incident', url: 'https://x.com/Trezor/status/...' },
  ],
  ```

- `refTodo` / `refNotNecessary` are **not** appropriate here — the news entry should always cite the incident source.

---

## File structure

### 1. Create the news file

Create a single file in `data/news/`:

```
data/news/YYYY-MM-DD-<slug>.ts
```

- `YYYY-MM-DD` = the incident's `publishedAt` (when the incident occurred or was first disclosed).
- `<slug>` = a short, kebab-case slug of the incident, matching the entry's `slug` field.

Example: `data/news/2026-08-06-privy-metabase-security-incident.ts`

The file exports a single default object `as const satisfies WalletSecurityNews`. Match the exact structure of existing entries — the object must include every `WalletSecurityNews` field (`slug`, `type`, `ref`, `impact`, `publishedAt`, `severity`, `status`, `summary`, `title`, `updatedAt`, `wallets`). Dates use `YYYY-MM-DD` strings.

### 2. Register it in the index

In `data/news/index.ts`, add a dynamic import for the new file inside the `allWalletSecurityNews` array. Order in the array does not matter — the list is sorted by `publishedAt` at the end of the module.

### 3. Add spelling exceptions (only if needed)

If the source introduces proper nouns the project dictionary does not know (e.g. a vendor or tool name such as `Metabase`), add the word to the `words` array in `.cspell.json`, keeping it alphabetically sorted. Only add valid proper nouns — never add typos or arbitrary words.

Two gotchas when adding a word:

- **Add it in its canonical capitalization.** Because `cSpell` matches `words` case-insensitively, one entry (`ShipMonk`) also covers the lowercased slug in the filename / index import (`shipmonk`) — don't add both spellings. Enter the word in its **correct capitalization** (the proper-noun form), not lowercase. Harper (the grammar linter, see `tests/utils/grammar.ts`) builds its vocabulary from the `words` list in `.cspell.json`. A capitalized entry is recognized as a proper noun, and Harper automatically adds its possessive `'s` form — so you don't need to add `ShipMonk's`. A lowercase entry would not be recognized as a proper noun.
  - Edge case: a brand spelled with a leading lowercase letter (e.g. `imToken`) trips Harper's Capitalization lint (it would force `ImToken`). Such words must also be added to `PROPER_NOUNS_LOWERCASE_FIRST` in `tests/utils/grammar.ts` — a code edit outside this skill's file permissions.
- **Exact sort order.** The `cSpell` test sorts by `toLowerCase()` (`tests/cspell.test.ts`), so ordering can differ from a naive case-sensitive sort — e.g. `ShipMonk` (`ship...`) sorts _after_ `shefi` and _before_ `sidepanel`, not right after `Shamir`. If the order is wrong, `pnpm check:vitest` fails with a message naming the two words that are out of order; move it accordingly.

---

## Testing and verification

Run the project checks after creating the entry:

```bash
pnpm check:all
```

This **must pass** before the change is considered complete. Common failures specific to news entries:

- **Spelling** — the `check:spelling` step flags unknown proper nouns. Fix by adding the term to `.cspell.json`.
- **Type errors** — the default export must satisfy `WalletSecurityNews`. Missing fields, wrong enum values, or a `slug` mismatch between the filename and the `slug` field will fail to compile.

---

## Key rules to remind the contributor throughout

- **Source the facts.** The summary, dates, and classification must come from the article, not from assumptions.
- **`wallets: []` is valid.** An incident is still worth recording when it does not map to a tracked wallet — use an empty `wallets` array rather than an invented ID.
- **Dates are `YYYY-MM-DD` strings.** `publishedAt` is the incident/disclosure date; `updatedAt` is the last-known-update date.
- **Always provide a `ref`.** The news entry must cite the incident source — no `refTodo`.
- **Run `pnpm check:all`** before opening a PR — it must pass.
