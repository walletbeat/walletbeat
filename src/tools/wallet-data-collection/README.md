# Wallet data collection CLI utility

This command-line tool is meant to assist in capturing and analyzing network traffic from wallets.

This is necessary to populate Walletbeat's `privacy.dataCollection` feature field, which is an otherwise tedious, manual, and error-prone process. This tool automates the capture/analysis part, but you still need to manually interact with the wallet and go through its UX flows. The command-line acts as a companion along this process.

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
$ pnpm wallet-data-collection --wallet_id='<wallet_id>' capture --flow='<flow>' [--wallet_address='<0xaddr1,0xaddr2,...>'] [--port='<mitmproxy port>']
```

Start `mitmproxy` listening on `--port` (default `8080`), capturing all network traffic received from this session as belonging to the given `--flow`.

For most flows, you must also specify the wallet address(es) you are using (or will be using) with the `--wallet_address` flag. If you have multiple addresses, separate them using commas.

##### Flows

The following flows are defined:

- `IDLE_PRE_INSTALL`: Recorded using an idle device before installing the wallet. Any request from this flow will be ignored, since it is not attributable to the wallet. Does not require `--wallet_address`.
- `INSTALL`: Recorded during the download of the wallet software. Does not require `--wallet_address`.
- `ONBOARDING_NEW`: Recorded after wallet installation, when creating a new account. Does not require `--wallet_address`.
- `ONBOARDING_IMPORT`: Recorded after wallet installation, while importing an existing account. Requires `--wallet_address` to be set to the account address(es) that will be imported. You should import accounts that already have Ether and USDC.
- `SEND_ETHER`: Recorded when sending Ether to another wallet. Requires `--wallet_address` to be set to the account address(es) that you will send **from** and send **to**.
- `SEND_USDC`: Same as `SEND_ETHER`, but send USDC instead of Ether.
- `NATIVE_SWAP`: Perform a swap using the wallet's built-in swap feature. Requires `--wallet_address` to be set to the account address doing the swapping.
- `APP_CONNECTION`: Connect and sign in to Walletbeat's wallet test app. Requires `--wallet_address` to be set to the account address doing the connection.
- `MAKE_TRANSACTION`: Make transactions using Walletbeat's wallet test app. Requires `--wallet_address` to be set to the account address doing the transactions.

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

#### `mark-string` subcommand

```
$ pnpm wallet-data-collection <global flags> mark-string '<some-string>' '<data-type|benign>'
```

Mark a string as conveying the given data type. All instances of the string will be redacted from the capture file.
If a string should be explicitly marked as not carrying any user-identifying information, use `benign`.

##### Examples

```
# Mark a cookie as a tracking identifier:
$ pnpm wallet-data-collection <global flags> mark-string 'GA1.1.1294582759.1067224611' 'tracking-identifier'

# Mark a wallet address as such:
$ pnpm wallet-data-collection <global flags> mark-string '0x1234678...' 'wallet-address'

# Mark a specific string as benign (instances of it will be ignored when looking for suspicious data-identifier strings):
$ pnpm wallet-data-collection <global flags> mark-string 'Chromium' 'benign'
```

#### `mark-domain` subcommand

```
$ pnpm wallet-data-collection <global flags> mark-domain '<domain pattern>' '<entity ID>'
```

Mark a domain name and all its subdomains as belonging to the given entity ID.

#### `explain-request` subcommand

```
$ pnpm wallet-data-collection <global flags> explain-request --domain=... [--other-selectors...] '<purpose1,purpose2,...>'
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

Purposes are case-insensitive on the command line.

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
- Create a new browser profile, install the wallet again (do not go through user onboarding). Stop the browser.
- Record a network capture with `--flow=ONBOARDING_IMPORT` and set the `--wallet_address` to the two addresses you had created.
- Start the browser and import the two wallet addresses you had created (e.g. by using the same seed phrase).
- Stop the browser, end the capture.
- For each remaining flow (`SEND_ETHER`, `SEND_USDC`, `NATIVE_SWAP`, `APP_CONNECTION`, `MAKE_TRANSACTION`):
  - Record a network capture with `--flow=<flow>`, with `--wallet_address` set to the two addresses you have set up in the wallet already.
  - Start the browser and perform the UX flow.
  - Stop the browser, end the capture.
- Run the `check` subcommand. It will give you a list of things that need attention, and describe the next steps you need to take.
- Once the `check` subcommand is successful, you are done!
