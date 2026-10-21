# Test: fully rated wallets should remain fully rated

Wallets that are now fully rated should stay fully rated, even when we change attributes or features. Once a wallet is fully rated, it should never become unrated again.

## Changes
- Added `tests/fully-rated-wallets.test.ts`
  - `expectedFullyRatedWallets` lists the wallets that are fully rated now: `ambire`, `metamask`, `rabby`, `rainbow`, `uniswapWallet`
  - One test per wallet checks that its `overall` evaluation has no `UNRATED` attributes. If it fails, the message names the wallet and its unrated attribute IDs:
    ```
    AssertionError: zerion is expected to be fully rated, but these attributes are unrated:
    + [
    +   "addressCorrelation",
    +   "multiAddressCorrelation",
    +   "privacyHygiene",
    +   "orderflowTransparency",
    + ]
    ```
  - Another test fails if a wallet not on the list is fully rated, so the list grows each time we fully rate a wallet
- Reuses `evaluatedAttributes`, `allRatedWallets`, and `isValidWalletName` instead of new helpers
