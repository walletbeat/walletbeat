Data: Uniswap Wallet feature data

## Uniswap data

- Filled in most of Uniswap's previously-null feature data:
  - `accountSupport`: EOA (BIP32/BIP44/BIP39, exportable seed) + EIP-7702 via the `uniswapCalibur` smart wallet contract
  - `addressResolution`: non-chain-specific ENS resolution via the Uniswap Unitags API (`OFFCHAIN`, `VERIFIABLE`)
  - `chainAbstraction`: built-in bridging with `AGGREGATED` fee display by default, `COMPREHENSIVE` after expanding, plus cross-chain balance views for ETH/USDC
  - `chainConfigurability`: no chain/RPC management in Settings, so `notSupported`
  - `ecosystem.delegation`: bundled EIP-7702 delegation on first operation
  - `integration.browser`: EIP-1193, EIP-2700, EIP-6963 all supported
  - `privacy.appIsolation`: `APP_SPECIFIC_ACCOUNT` behavior for `eth_accounts`
  - `privacy.transactionPrivacy`: no private transfer techniques supported, `defaultFungibleTokenTransferMode: 'PUBLIC'`
  - `security.accountRecovery`: no guardian recovery or drills
  - `security.duressResistance`: browser (password) and mobile (biometric) unlock mechanisms, no duress mode
  - `security.keysHandling`: `FULLY_ON_USER_DEVICE` key generation, `NON_MULTIPARTY`
  - `security.publicSecurityAudits`: two Trail of Bits audits (mobile and browser extension), each with their unpatched flaws
  - `security.securityBestPractices`: browser (PBKDF2 + AES-GCM encrypted mnemonic) and mobile (Android `EncryptedSharedPreferences`/Keystore, iOS Keychain/Secure Enclave), parsed from collected manifests
  - `selfSovereignty.permissionsManagement`: `notSupported`
  - `selfSovereignty.transactionSubmission.l2`: `SUPPORTED_BUT_NO_FORCE_INCLUSION` for both Arbitrum and OP Stack
  - `walletCall`: `wallet_sendCalls` supported, no atomicity guarantee
- Added `data/wallet-contracts/uniswap-calibur.ts` for the EIP-7702 delegate contract (`isValidSignature`, `validateUserOp`, ERC-7821 batching)
- Added `data/entities/trail-of-bits.ts` as a `SecurityAuditor` entity
- Collected Android/iOS mobile manifests and the browser extension manifest under `data/software-wallets/manifests/uniswapWallet/`, parsed via `parseMobileManifestJson`/`parseBrowserExtensionManifest`
- Added supporting screenshots under `public/references/wallets/uniswap/screenshots/`

## Attributes

- Added `AndroidPermission.USE_BIOMETRIC`, `USE_FINGERPRINT`, `VIBRATE`, `READ_MEDIA_IMAGES` (all `PASS`) and `AD_ID` (`FAIL`, ad tracking)
- Added `IosUsageDescription.LOCATION_ALWAYS_AND_WHEN_IN_USE` (`FAIL`, background tracking not needed by a wallet)

## Other changes

- Added `RnEthersRs`, `UNIEXT`, `UNIMOB`, `Unitags` to cspell
