# Wallet data collection CLI utility

This command-line tool is meant to assist in capturing and analyzing network traffic from wallets.

This is necessary to populate Walletbeat's `privacy.dataCollection` feature field, which is an otherwise tedious, manual, and error-prone process. This tool automates the capture/analysis part, but you still need to manually interact with the wallet and go through its UX flows. The command-line acts as a companion along this process.

## Goal

The goal of using this tool is to record the network every supported UX flow of a wallet, and analyze/categorize all of its network traffic. To that end, the high-level workflow looks like this:

- Record network traffic as you perform each UX flow the wallet supports
- Categorize every _domain_ that the wallet sent requests to: Which **entity** does it belong to?
- Categorize every _request_ the wallet sent: What is their **purpose**?
- Categorize every _piece of information_ sent in these requests: What **data** did the wallet send?

The tool helps you walk through these steps.

## Usage

At a high level, all commands look like this:

```
$ pnpm wallet-data-collection --id='<wallet_id>' --variant='<wallet_variant>' <subcommand> [subcommand-specific flags...]
```

### Global flags:

- `--id`: ID of the wallet. This must already exist.
- `--variant`: Variant of the wallet you are testing (`BROWSER`, `MOBILE`, `DESKTOP`).
- `--type`: Type of the wallet (`software`, `hardware`, or `embedded`. Default: `software`).

The wallet network data capture file will be recorded at `data/{type}-wallets/collection/{id}/{id}.{variant}.capture.json`.

### Subcommands

#### `capture` subcommand

```
$ pnpm wallet-data-collection <global flags> capture --flow='<flow>' [--wallet-addresses='<0xaddr1,0xaddr2,...>'] [--port='<mitmproxy port>']
```

Start `mitmproxy` listening on `--port` (default `8080`), capturing all network traffic received from this session as belonging to the given `--flow`.

For most flows, you must also specify the wallet address(es) you are using (or will be using) with the `--wallet-addresses` flag. If you have multiple addresses, separate them using commas.

##### Flows

The following flows are defined:

- `IDLE_PRE_INSTALL`: Recorded using an idle device before installing the wallet. Any request from this flow will be ignored, since it is not attributable to the wallet. Does not require `--wallet-addresses`.
- `INSTALL`: Recorded during the download of the wallet software. Does not require `--wallet-addresses`.
- `ONBOARDING_NEW`: Recorded after wallet installation, when creating a new account. Does not require `--wallet-addresses`.
- `ONBOARDING_IMPORT`: Recorded after wallet installation, while importing an existing account. Requires `--wallet-addresses` to be set to the account address(es) that will be imported. You should import accounts that already have Ether and USDC.
- `SEND_ETHER`: Recorded when sending Ether to another wallet. Requires `--wallet-addresses` to be set to the account address(es) that you will send **from** and send **to**.
- `SEND_USDC`: Same as `SEND_ETHER`, but send USDC instead of Ether.
- `NATIVE_SWAP`: Perform a swap using the wallet's built-in swap feature. Requires `--wallet-addresses` to be set to the account address doing the swapping.
- `APP_CONNECTION`: Connect and sign in to Walletbeat's wallet test app. Requires `--wallet-addresses` to be set to the account address doing the connection.
- `MAKE_TRANSACTION`: Make transactions using Walletbeat's wallet test app. Requires `--wallet-addresses` to be set to the account address doing the transactions.

#### `delete-capture` subcommand

```
$ pnpm wallet-data-collection <global flags> delete-capture --session=num
```

Delete all data from a single capture session.
Use this if you made a mistake during a network capture.
Session numbers are printed in the output of the `capture` subcommand.

#### `check` subcommand

```
$ pnpm wallet-data-collection <global flags> check
```

Examine the capture file and flag any missing information that needs further triaging, including directions on how to address them.
No further flags required.

#### `mark-flow-unsupported` subcommand

```
$ pnpm wallet-data-collection <global flags> mark-flow-unsupported --flow='<flow>'
```

Mark a flow as not being supported by the wallet, which means capturing its network traffic is impossible.

#### `mark-domain` subcommand

```
$ pnpm wallet-data-collection <global flags> mark-domain --domain='<domain>' --entity='<entity ID>'
```

Mark a domain name and all its subdomains as belonging to the given entity ID.
Note that domain assignments are **not** wallet-specific, and will not need to be redone in future network captures.
Domains for requests that were not actually initiated by the wallet (e.g. browser/OS built-in analytics) should **still** be marked,
as this will help mark them appropriately for other wallets' captures. Such requests can be marked as not-wallet-initiated
using request matchers (see `explain-request` below).

#### `explain-request` subcommand

```
$ pnpm wallet-data-collection <global flags> explain-request --domain=... [--other-selectors...] --purposes='<purpose1,purpose2,...>'
```

Mark requests matching the given `selectors` as being done for purposes `purpose1`, `purpose2`, ...

##### Selectors

- `--domain='foo.com'`: Matches requests to `foo.com` and any subdomains of it. **The `--domain` selector must always be provided.**
- `--path=/api`: Matches requests with path `/api`. Globs (`*`) are allowed, e.g. `--path=/path/*`. If `--path` is not provided, any path matches.
- `--method=eth_getBalance`: Matches JSON-RPC requests with method `eth_getBalance`. Globs (`*`) are allowed as well. If `--method` is not provided, any request matches, including non-JSON-RPC requests.

##### Purposes

Requests can be assigned to the following purposes:

- `UPDATE_CHECKING`: Checking for updates to the wallet.
- `CHAIN_DATA_LOOKUP`: Looking up chain data (read only).
- `TRANSACTION_BROADCAST`: Broadcasting transactions for inclusion.
- `TRANSACTION_SIMULATION`: Simulating transaction outcome.
- `SWAP_QUOTE`: Getting a quote for a swap operation.
- `SCAM_DETECTION`: Checking for scams.
- `ACCOUNT_SIGNUP`: Signing up for a wallet-related account.
- `EXTERNAL_ACCOUNT_LINKING`: Linking to an external (non-wallet-related) account, e.g. CEX account.
- `ASSET_METADATA`: Looking up asset metadata (price, icon, ticker, NFT data).
- `IDENTITY_VERIFICATION`: Verifying the wallet user's identity.
- `STATIC_ASSETS`: Downloading static assets (images, CSS).
- `ANALYTICS`: Wallet user analytics.
- `NOT_WALLET_INITIATED`: Requests not actually initiated by the wallet (e.g. browser/OS built-in analytics).

Purposes are case-insensitive on the command line.

#### `review-strings` subcommand

```
$ pnpm wallet-data-collection <global flags> review-strings
```

Review high-entropy strings from network capture to flag the user data they are carrying.

This is useful to avoid repetitive flagging of user data during the `review-requests` phase.
By going through these strings contained in network requests, things like tracking cookies, EOA addresses, wallet-connect domains, etc. can be tagged as corresponding to one or more pieces of user-identifying information (or simply as `TRACKING_IDENTIFIER` when repeated across requests).
The benefit of doing so is that requests containing these strings will be automatically identified as carrying this user information without having to repeat yourself.

Alternatively, you can use the `mark-string` subcommand to mark a given string as carrying a given piece of user information. `review-strings` is just a pretty UI over it.

#### `mark-string` subcommand

```
$ pnpm wallet-data-collection <global flags> mark-string --string='<some-string>' --data='<USER_INFO_TYPE_1,USER_INFO_TYPE_2,...>'
```

Mark a string as conveying the given data type. This is the same operation as the one `review-strings` does, but with a more machine-friendly interface. The string will be classified and stored in the capture file's user data store.

Marking a string as carrying user data has the following effect:

- All requests carrying this string will automatically be considered as having sent this user data.

##### Examples

```
# Mark a cookie as a tracking identifier:
$ pnpm wallet-data-collection <global flags> mark-string --string='GA1.1.1294582759.1067224611' --data='TRACKING_IDENTIFIER'

# Mark a wallet address as such:
$ pnpm wallet-data-collection <global flags> mark-string --string='0x1234678...' --data='ACCOUNT_ADDRESS'

# Mark your X.com and Farcaster account name as such:
$ pnpm wallet-data-collection <global flags> mark-string --string='CodeMonkey1234' --data='X_DOT_COM_ACCOUNT,FARCASTER_ACCOUNT'
```

#### `review-requests` subcommand

```
$ pnpm wallet-data-collection <global flags> review-requests
```

Interactively go through requests to manually define their purpose and/or carried data.

All requests must be reviewed manually at least once. This is your chance to:

- Make sure the domain matches to the correct entity
- Make sure the request's purposes matched correctly
- Verify or expand the set of user data sent in the request when not automatically detectable (e.g. list of assets, balances).

After a request is manually reviewed, it will never be prompted for in future executions of the `review-requests` subcommand.

## Workflow

- Start by creating a browser profile and setting up `mitmproxy`.
- Record a network capture with `--flow=IDLE_PRE_INSTALL`.
- Start the browser and simply leave it open for a few minutes.
- Stop the browser, end the capture.
- Record a network capture with `--flow=INSTALL`.
- Start the browser, install the wallet. Do not go through onboarding.
- Stop the browser, and the capture.
- Record a network capture with `--flow=ONBOARDING_NEW`.
- Start the browser with `mitmproxy` and create two new wallet addresses.
- Stop the browser, end the capture.
- Record a network capture with `--flow=ONBOARDING_IMPORT` and set the `--wallet-addresses` to two addresses you have pre-seeded with Ether and USDC.
- Start the browser and import the two wallet addresses you had created (e.g. by using the same seed phrase).
  - If you cannot import these two addresses in the wallet after a user account was already created in `ONBOARDING_NEW`:
    - Stop there, reinstall the wallet from scratch.
    - Record a capture with `--flow=ONBOARDING_IMPORT` and set the `--wallet-addresses` to the two addresses are about to import (pre-seeded with Ether and USDC) and the two you had created during `ONBOARDING_NEW`.
    - Go through the wallet's account import or account recovery flow, and import the two addresses you have pre-seeded with Ether and USDC. Do _not_ import the two addresses from the `ONBOARDING_NEW` float.
- Stop the browser, end the capture.
- For each remaining flow (`SEND_ETHER`, `SEND_USDC`, `NATIVE_SWAP`, `APP_CONNECTION`, `MAKE_TRANSACTION`):
  - If the wallet does not support this flow, run the `mark-flow-unsupported` subcommand to tag it as such. Otherwise:
  - Record a network capture with `--flow=<flow>`, with `--wallet-addresses` set to the two addresses you have set up in the wallet already.
  - Start the browser and perform the UX flow.
  - Stop the browser, end the capture.
- Run the `check` subcommand. It will give you a list of things that need attention, and describe the next steps you need to take. This will roughly look like this:
  - Run the `mark-domain` subcommand to ensure all domains involved in the network capture have associated entities.
  - Run the `explain-request` subcommand to set up programmatic rules to automatically associate requests to specific purposes.
  - Run the `review-strings` and/or `mark-string` subcommands to classify personal data strings and automatically associate requests to the data they send.
  - Run the `review-requests` subcommand to do a manual review of the requests and check over your associations.
  - Run the `check` subcommand at any time during this process to get a list of issues that still need to be addressed.
- Once the `check` subcommand is successful, you are done!
