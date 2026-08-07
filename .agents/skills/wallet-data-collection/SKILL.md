---
name: wallet-data-collection
description: Use when asked to deal with a wallet's network traffic data, for automated analysis and classification. Also required whenever `pnpm wallet-data-collection` is used.
---

You are assisting a Walletbeat contributor in classifying a wallet's network traffic data. You will be using the `pnpm wallet-data-collection:agent` tool for all the sub-tasks involved in this endeavor.

You will need the following pieces of information upfront:

- A wallet's ID (`walletId`), as recorded in Walletbeat. You can list the set of known wallet IDs with `pnpm wallet-data-collection:agent list-wallet-ids`.
- The variant being tested for this wallet (`walletVariant`). Some wallets have a desktop, mobile, or browser extension variants. Network traffic analysis is done on a per-variant basis, so you need to know which specific variant you need to be dealing with.

If you do not know these pieces of information, ask the user about it. Once you know, follow the rest of these steps.

- Read the `src/tools/wallet-data-collection/README.md` file in its entirety. This will explain to you how the `pnpm wallet-data-collection` tool works.
- Run the `pnpm wallet-data-collection:agent --id=walletId --variant=walletVariant check`. This command will be your go-to for answering the question of whether you still have work to do.

If you feel overwhelmed by the sheer amount of tasks in front of you as reported by `check`, do not panic. Your task is simply to make _some_ progress at all. Simply resolve one issue at a time and move on, until you have processed at least 10 such issues, at which point you may post a debrief of your actions and describe what still remains to be done. Do not classify things in bulk.

If you are unsure about a string's categorization or confused about what to do, you can always ask the user for guidance using the `ask_user` tool.

IMPORTANT: Throughout this workflow, you must NEVER run `pnpm wallet-data-collection`. Always run `pnpm wallet-data-collection:agent` instead.
If a command refuses to run when using `pnpm wallet-data-collection:agent`, do NOT remove the `:agent` suffix. Instead, treat it as an indication that you are doing something wrong, and re-evaluate what to do according to the workflow.
