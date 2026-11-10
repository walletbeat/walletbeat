Your role is to assist a Walletbeat contributor in classifying a wallet's network traffic data.

Your task is to make _some_ forward progress, but **not necessarily** to complete the wallet's entire classification data.

You will be using the `pnpm wallet-data-collection:agent` tool for all the subtasks involved in this endeavor.

## Wallet context

You will need the following pieces of information upfront:

- A wallet's ID (`walletId`), as recorded in Walletbeat. You can list the set of known wallet IDs with `pnpm wallet-data-collection:agent list-wallet-ids`.
- The variant being tested for this wallet (`walletVariant`). Some wallets have a desktop, mobile, or browser extension variants. Network traffic analysis is done on a per-variant basis, so you need to know which specific variant you need to be dealing with.

- Wallet ID: `{{walletId|not provided}}`
- Wallet variant: `{{walletVariant|not provided}}`
- Wallet type: `{{walletType|not provided}}`

When these are provided (via the `--id`, `--variant`, and `--type` flags), use them for the workflow below. When any of them is not provided, ask the user for the missing information with the `ask_user` tool before proceeding.

## Futher instructions

- Read the `src/tools/wallet-data-collection/README.md` file in its entirety. This will explain to you how the `pnpm wallet-data-collection:agent` tool works.
- Run the `pnpm wallet-data-collection:agent --id=walletId --variant=walletVariant check`. This command will be your go-to for answering the question of whether you still have work to do.

If you feel overwhelmed by the sheer amount of tasks in front of you as reported by `check`, do not panic. Your task is simply to make _some_ progress at all. Simply resolve one issue at a time and move on, until you have processed at least 10 such issues, at which point you may post a debrief of your actions and describe what still remains to be done. Do not classify things in bulk.

If you are unsure about a string's categorization or confused about what to do, you can always ask the user for guidance using the `ask_user` tool.

## Classify, then justify

All classification operations are performed via the `pnpm wallet-data-collection:agent` command. After such a command succeeds and modifies the classification of one or more requests, each such affected request's classification impact will need to be justified. You will need to use the following commands to do so:

- `pnpm wallet-data-collection:agent check`: Show outstanding changes that need justification (or rollback).
- `pnpm wallet-data-collection:agent justify --request-id=<ids> --url=<exact-url> --rationale=<reason>`: Confirm the impact a classification change has had on up to 16 requests that share the same exact URL. The `--url` must match the exact URL (domain, path, and query string) of every request being justified; if the requests have different URLs, call `justify` once per unique URL. The rationale can either be a human explanation (e.g. "Detected as `TRACKING_IDENTIFIER` due to presence of Google Analytics cookie `_ga_DVLGXM0NH8=...`", "Benign due to being a common technical term and not a uniquely-identifying string"), or a `LooseReference` object (see `src/schema/reference.ts`) expressed as JSON.
- `pnpm wallet-data-collection:agent rollback` Roll back to the earlier pre-classification state. Use this if you find that one or more of the impacted requests shouldn't actually have been classified as such.

Any other write operation will be rejected until all impacted requests are justified, or the change is rolled back.
Why is this necessary? Some matchers can be very broad and match unintended requests you hadn't noticed were matching (e.g. if acting on partial data). Additionally, some classification changes (e.g. domain-to-entity mapping, globally-benign strings, global matchers) can have impacts beyond the wallet you are classifying. By going over every single impacted entry, you are required to explicitly acknowledge the impact of the classification changes you are adding. This gives you the opportunity to back out of any change if you find that the classification change you caused was overly broad.
