---
name: treasury-update
description: >
  Use when the user gives one or more Ethereum transaction hashes to record in
  the Walletbeat treasury ledger (`governance/treasury/treasury-operations.tsv`),
  or asks to update treasury operations or the treasury transparency report.
  Fetches each transaction, checks that every address is registered, finds
  related treasury transactions that are missing, writes the ledger rows,
  regenerates the Markdown report, and runs `pnpm check:all`.
argument-hint: '[tx-hash ...]'
---

You are recording treasury transactions for Walletbeat.
The hashes to record are: **$ARGUMENTS**. If this is blank, look for bare hashes at the end of `governance/treasury/treasury-operations.tsv`. If there are none, ask the user for the hashes.

## Edit scope

You may edit only these files:

- `governance/treasury/treasury-operations.tsv` (append only)
- `governance/treasury/addresses.tsv` (append only)
- Files that the tools generate: `governance/treasury/price-data.tsv`, `governance/treasury/treasury-transparency.md`, `governance/treasury/*.svg` and `tests/image-integrity/verified-clean-images.json`.

Do not edit source code, tests, or configuration files, even if a tool fails. If a step fails, show the error to the user and stop.

## Files

- `governance/treasury/addresses.tsv`: columns `Address	Name	Control	Description`. `Address` has a chain prefix (`eth:0x…`). `Name` is the label that the ledger uses.
- `governance/treasury/treasury-operations.tsv`: columns `Date	From	To	Amount	Purpose	ID`. The values in `From` and `To` must be `Name` labels from `addresses.tsv`. The generator fails if a label is not there.
- The `TreasuryCategory` enum in `src/tools/treasury-markdown-updater/treasury-markdown-updater-lib.ts` lists the valid `[category]` tags. Read it. Do not invent a new category.

The treasury is `eth:0x52666AD68156B03EAce67678cDCF1d74bC56201D` (a Safe multisig, label `treasury`).

## Step 1: Fetch each transaction

For each hash, use the Blockscout API. Write the responses to the scratchpad, not to the repository:

```bash
curl -s "https://eth.blockscout.com/api/v2/transactions/$HASH"                  # timestamp, status, from, to, value, decoded_input
curl -s "https://eth.blockscout.com/api/v2/transactions/$HASH/token-transfers"  # ERC-20 movements
curl -s "https://eth.blockscout.com/api/v2/transactions/$HASH/logs"             # decoded events
```

Get these facts for each transaction:

- **Date**: the UTC `YYYY-MM-DD` of `timestamp`.
- **Status**: if it is not `ok`, record it as `[ignored:reverted]` (look at earlier "Failed transaction" rows).
- **Real sender and receiver**: for a Safe `execTransaction`, the account that sends the transaction is only the signer who executed it. The `from` value of the row is `treasury`. Get the counterparty from the token transfers, or from the `to` value of the decoded inner call.
- **Amount**: native ETH `value` (18 decimals) and each token transfer (`total.value` divided by 10^`total.decimals`).

Recognize these patterns:

| What you see                                                                                            | Row                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inner call to `GPv2Settlement` (`0x9008D19f58AAbD9eD0D60971565AA8510560ab41`) with a `PreSignature` log | `0` / `CoW Swap order creation`. Get the order from `https://api.cow.fi/mainnet/api/v1/orders/<orderUid>`. Get the fill transaction from `https://api.cow.fi/mainnet/api/v1/trades?orderUid=<orderUid>` (put the URL in quotes in zsh). |
| WETH minted from `0x0000…0000` to the treasury                                                          | `X ETH → X WETH` / `Wrapping ETH to WETH`                                                                                                                                                                                               |
| Settlement transaction: WETH out, USDC in                                                               | `A WETH → B USDC` / `CoW Swap from WETH to USDC`                                                                                                                                                                                        |
| A very small inbound amount from a new sender, followed later by a large one                            | A `[test]` row / `Test transaction`, then the real transfer                                                                                                                                                                             |
| Unsolicited token airdrops (unknown tokens with no price)                                               | Do not record. Tell the user that you skipped them.                                                                                                                                                                                     |

## Step 2: Find missing related transactions

Find the date of the last complete row in `treasury-operations.tsv`. Then list the treasury activity after that date:

```bash
T=0x52666AD68156B03EAce67678cDCF1d74bC56201D
curl -s --max-time 30 "https://eth.blockscout.com/api/v2/addresses/$T/transactions"
curl -s --max-time 30 "https://eth.blockscout.com/api/v2/addresses/$T/token-transfers"
```

`--max-time` is necessary because these endpoints can hang (`internal-transactions` often hangs). Find transactions after that date that the user did not give you and that are not in the ledger. Examples are the CoW fill for an order creation, the ETH-to-WETH wrap that comes before a swap, and the real transfer that comes after a test transfer. Show them to the user in a short list. Add them only if the user agrees.

## Step 3: Check that the addresses are registered

For each counterparty address, search `addresses.tsv` without case sensitivity. If an address is not there, ask the user who controls it. Include the address, the amounts, and the dates in the question. Give your best guesses as options. Use the address's history on Blockscout to make the guesses (for example, "sends test transfer then large ETH amount → grant funder"). Then add a row with a short snake_case `Name`, the `Control` and a one-line `Description`. Follow the style of the rows that are there. If the controller can have more than one address, put a number at the end of the `Name` (`ef_grants1`, `chainflip2`).

## Step 4: Get the category and the purpose

Copy the category and the purpose from earlier rows when the pattern is clear. For example: Sablier top-ups to `mattmatt_sablier` are `[labor:dev]` / `Top-up of Sablier stream`, and wraps, CoW swaps and test transfers have fixed text. For one-off payments, or if you are not sure, ask the user. Use your best guesses from earlier payments to the same recipient as options.

## Step 5: Write the rows

Replace the bare hashes (if there are any) with complete rows. Put the rows in date order and keep the order in which the transactions happened. Format the rows as follows:

- Separate the columns with tabs and end the file with a newline.
- Write amounts with full precision and no trailing zeros (`9.72762645914 ETH`). Never round an amount.
- Use `A [cat] + B [cat]` for a transaction that has more than one expense, and `X ASSET → Y ASSET` for a swap.

## Step 6: Generate

```bash
pnpm fix
```

This runs the treasury Markdown generator, which gets the missing prices from CoinGecko into `price-data.tsv` and regenerates `treasury-transparency.md` and the SVG charts. If it fails, show the error and stop (see Edit scope).

## Step 7: Verify

```bash
pnpm check:all
```

Run it once, after you write all the rows. Write the output to a file in the scratchpad and read the end of the file. It can update `tests/image-integrity/verified-clean-images.json` because the SVGs changed. This is expected, and CI needs this change. If it fails, show the error and stop.

## Report

Give the user:

- A table of the rows that you added. Mark the hashes that the user gave you, and show which hashes you found.
- New `addresses.tsv` labels.
- Items that you skipped (spam tokens).
- The result of `pnpm check:all` and the list of changed files (`git status --short`).

Do not commit unless the user tells you to.
