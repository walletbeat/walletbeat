# Wallet Playground Extension Harness

The deterministic E2E smoke test uses a fake EIP-6963/EIP-1193 provider:

```sh
pnpm test:e2e:wallet-playground
```

This covers the playground UI and RPC wiring without a browser extension prompt.

For a real wallet extension, use Chromium with an unpacked extension directory. Playwright requires a persistent Chromium context and these extension flags:

- `--disable-extensions-except=/absolute/path/to/extension`
- `--load-extension=/absolute/path/to/extension`

## Setup

1. Download a wallet extension build. For MetaMask, use the official `metamask-extension` GitHub releases and choose a Chromium-compatible zip.
2. Unzip it to a local directory that contains `manifest.json`.
3. Start Walletbeat:

```sh
pnpm run dev -- --host ::1 --port 4321
```

4. Run the opt-in real-extension harness:

```sh
WALLET_EXTENSION_PATH=/absolute/path/to/unpacked-extension \
PLAYWRIGHT_BASE_URL=http://localhost:4321 \
pnpm test:e2e:wallet-playground:real
```

The real-extension harness verifies that Chromium loads the extension and that the playground can discover an injected provider. Full transaction/signature prompt approval is wallet-specific: seed a browser profile or extend the harness with that wallet's onboarding and confirmation selectors.

## Notes

- Keep the real wallet profile disposable. Do not use wallets with real funds.
- The deterministic fake-wallet E2E test should be the default regression gate.
- The real-extension harness is for compatibility checks against specific wallet builds.
