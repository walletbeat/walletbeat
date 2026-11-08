`WalletPage` browser specifications live beside the view in `src/views/WalletPage.tests/`. Shared browser infrastructure and component-independent tests remain here.

# WalletPage verification

The [requirements](wallet-page-requirements.md) retain all 209 IDs from the adopted Recrawl `WalletPage` contract. The [acceptance procedures](wallet-page-cases.md) specify the corresponding observations. Requirements are expected behavior; source presence and historical recordings are not passes.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

The test configuration builds and previews the real production site with [controlled wallet fixtures](fixtures/wallet-fixtures.ts) on port 4558. Fixture routes are injected only by the test configuration, not the normal build. All three browser engines run serially to avoid distorting geometry and performance observations through local contention. Set `WALLET_PAGE_URL` to test an existing server, built with the fixture routes; set `WALLET_PAGE_PORT` to choose the local test server port.

For a compatible installed browser build, set `WALLET_PAGE_CHROMIUM_EXECUTABLE`, `WALLET_PAGE_FIREFOX_EXECUTABLE`, or `WALLET_PAGE_WEBKIT_EXECUTABLE` to its launcher. The override applies to collection and recording projects. Every capture attaches the reported browser version and requested executable/channel, or the browser type’s default bundled executable path when neither is overridden. The default path identifies the installed bundle, not necessarily the launched process (Chromium can use a separate headless shell); a compatible protocol and rendered behavior still require verification. Safari Technology Preview and Firefox Nightly retain their native automation paths.

`wallet-navigation.spec.ts` verifies root scroll ownership, native popover focus and independent pie activation, and fragment disclosure. `wallet-icon.spec.ts` exercises a real non-square asset through scrolling and checks label clearance. `structure.spec.ts` protects semantic destinations, native disclosures, hydration, no-script access and proximity snapping across responsive boundaries. `contract.spec.ts` runs the responsive requirement collector on the software fixture in each engine; specialized suites cover hardware, embedded, short, unknown, long-name and multiple-type cases. Each collector output includes all IDs, procedures, exact source/contract hashes, observations, and explicit pass/fail/unverified status. A source mutation invalidates capture. Contract acceptance fails on missing, partial, or unverified evidence; documenting a procedure never turns it into a pass.

`header.spec.ts` checks short, long, and multi-type wallet titles at mobile and desktop widths, native link hit targets, intact badge tokens, wheel input in both directions and native variant selection. `shared-links.spec.ts` checks real destination bindings after variant changes. `disclosure.spec.ts` checks that native closure removes descendant layout, active motion and keyboard participation, and reopening restores content. These bounded suites do not certify the remaining contract clauses.

For a focused development replay, set `WALLET_PAGE_WIDTHS=390` when invoking `wallet-page.mjs` directly. Its report identifies incomplete responsive coverage; the complete contract check rejects focused captures. Run the full width set for acceptance.

Results, failure screenshots, source identities and attached contract reports are written to `test-results/browser`. Browser console and page errors remain failures to investigate. Add `--trace on` to a focused Playwright replay when a full DOM/network trace is needed. Reduced preferences, direction, native input, transition boundaries, recording journeys and final visual review must satisfy the corresponding contract procedures before complete acceptance.

The [recording matrix](recording-matrix.json) is the single source for 18 recording projects: three engines, three widths and two native-input journeys. Theme and transparency vary independently. Firefox uses its browser preference, Chromium uses media emulation, and WebKit records actual media state with unsupported transparency emulation identified. After the complete contract passes on the same source, run `pnpm test:browser:record`. Each result retains video, a final frame, engine version, actual media state, native action metadata and a source snapshot. Native OS cursor pixels are not part of Playwright video. A test-only overlay follows pointer input and displays the computed CSS cursor as pointer, text or default; recording metadata distinguishes this overlay from native cursor capture. Decode and visually inspect every final video before accepting the gallery; generating a video is not visual verification.

Capture compares the commit, complete tracked diff and untracked file contents before and after each run. The served build stamp covers application inputs and the fixture site under `fixtures/`; test drivers remain outside that site. Changing a validator invalidates an active capture but does not require rebuilding unchanged application inputs. Fixture modules must keep build-only helpers and assets under `fixtures/` and consume production modules directly, without importing test drivers. Write outputs outside source or under the ignored `test-results` directory. Changes to fixture or untracked implementation files invalidate evidence too.

The fixture configuration also injects a test-only source endpoint. Captures compare the served build identity with the local source snapshot before trusting observations, so an unrelated server on the same port cannot certify this checkout. Production parity runs must build with this fixture configuration; the endpoint is absent from the normal production configuration. The JSON report follows `WALLET_PAGE_RESULTS` along with the other output artifacts.

### Mandatory aggregate contract acceptance

`pnpm test:browser` runs the three native browser projects and then the source-matched 209-requirement aggregate check. Collection fails on capture errors, incomplete required viewport sampling or observed counterexamples. Unverified obligations are retained in `acceptance.json` and fail aggregate acceptance; a successful individual collection does not certify the full contract. Specialized tests contribute only explicit `contract-evidence` attachments after their verified test passes. Historical reports and suite names never imply a current pass.

For a focused development run, use `pnpm test:browser:collect src/views/WalletPage.tests/contract-lifecycle.spec.ts`. This intentionally collects evidence without claiming complete acceptance. Output defaults to `test-results/browser`; `WALLET_PAGE_RESULTS` selects a private directory for both collection and aggregate output. To aggregate several reports captured against exactly the same source and contract, run `pnpm test:browser:accept /absolute/private/acceptance.json /absolute/private/first/report.json /absolute/private/second/report.json`. Source changes require a new capture.

The Android requirement is a later low-end-browser performance target per the human clarification. A constrained native Chromium mobile profile is identified as emulation; no attached physical device is required. Structural first-pass acceptance precedes this performance validation.

After the accepted recording matrix, run `node tests/browser/recording-gallery.mjs <report.json> <new-output-directory>` to validate metadata and fully decode all 18 videos. The resulting gallery retains visual review as pending until every video is inspected.

### Focused native resize diagnosis

Run `WALLET_PAGE_NATIVE_RESIZE=1 pnpm test:browser:collect src/views/WalletPage.tests/performance.spec.ts --project=chromium --headed --grep "native window resize diagnostics"` against the source-matched fixture server. This opt-in, headed Chromium capture uses real browser-window bounds with viewport emulation disabled. It covers resizing within desktop/mobile bands and across responsive breakpoints, both with a retained fragment and after native manual scrolling. It is available before structural first-pass acceptance for focused diagnosis; it does not replace the gated final performance profile.

The journey retains clock markers, native window command acknowledgments, passive browser frame data, a compressed rendering trace, a final screenshot and the existing source/browser identity attachments. Geometry polling occurs before or after the timed journey. A passing collection proves successful capture and eventual viewport delivery; performance remains explicitly unverified pending trace/pixel review and qualified, source-equivalent comparisons. Frame-stream timestamps are not physical-display deadlines. Keep failed captures as evidence; do not promote presentation-changing ablations into causal acceptance.

The existing `WALLET_PAGE_REAL_CHROME_PERFORMANCE=1` headed performance project can collect a focused diagnostic without `WALLET_PAGE_FIRST_PASS`. These captures explicitly report `diagnosticOnly: true` and do not establish performance acceptance. Diagnostic mode loads without CPU throttling before applying the 6x scroll profile; with a first-pass report, the original 6x startup profile is retained. When a first-pass report is supplied, its source, completion, and contract hash must still match. Final performance acceptance requires structural coverage and inspection of the native trace and presentation evidence.

### Native WebKit held-key verification

Use an explicitly selected `WebKitTestRunner` distribution against the source-matched fixture server. This separate engine witness does not skip or reinterpret a failing bundled Playwright test. The executable and a new absolute private artifact directory are required; no browser installation is performed.

```sh
WALLET_WEBKIT_RUNNER=/absolute/native/Release/WebKitTestRunner \
WALLET_PAGE_URL=http://127.0.0.1:4558/__wallet-page/credits/ \
WALLET_PAGE_RESULTS=/absolute/project-private-artifacts/native-keyboard-new-run \
node src/views/WalletPage.tests/native-keyboard.mjs
```

The runner uses the executable's directory for DYLD framework/library lookup; set `WALLET_WEBKIT_FRAMEWORKS` to an absolute directory when the distribution requires another location. It records the executable hash and requested framework path, not an independently proven loaded-engine revision. Retain distribution provenance alongside the result.

The native window is 390 × 900 CSS pixels. Source/build identity, visibility, focus, the native counter positive control and the cumulative-inset `H1` endpoint are checked before the journey. After each of four five-key batches, the test verifies trusted `keydown`/`keyup` delivery, frame advancement, retained focus and visibility, and forward travel. The output retains standard output, standard error, generated native fixture and JSON result; timeout, missing APIs, source mismatch and failed travel fail the command. The fixture must also expose a closed Security News incident: its entry-flow boundary is checked closed, open and closed again. This is keyboard/disclosure-boundary coverage, not scroll-event/scrollend, compositor or performance acceptance.

The approach differs from the Playwright `H1` journey: this witness seeks the independently calibrated `H1` endpoint programmatically with snapping enabled, then uses `WebKitTestRunner` held raw keys. It does not reproduce the Playwright binary seek with snapping temporarily disabled, page-focused trusted wheel approach, or scroll/scrollend delivery assertions. A pass cannot invalidate a failing Playwright wheel-to-key journey. The native fixture uses a fresh 390 × 900 shown window and the user-selected distribution, not Playwright’s browser embedding.
