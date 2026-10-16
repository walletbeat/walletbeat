# Coinspect wallet security reports

Vendored snapshot of public wallet security reports from Coinspect's
[Wallet Security Ranking](https://github.com/coinspect/wallet-security-ranking)
data repository.

- Upstream source: <https://github.com/coinspect/wallet-security-ranking>
- Local tree: `current-reports/` (mirrored from upstream `current-reports/`;
  image bundles are omitted)
- Check definitions: `config/checks.json` (mirrored from upstream `config/checks.json`
  at the same commit as the reports)
- Upstream commit pin: `upstream-commit.json`
- License: see [`LICENSE`](./LICENSE) (CC BY 4.0)

Refreshed by `/deploy/coinspect/coinspect-update.sh` (see also
`/.github/workflows/coinspect-refresh.yaml`).

Wallet data files use these reports only to fill fields that have not been
researched yet (`null`). They import the report JSON for a variant and pass it
to the matching helper in `/src/schema/coinspect.ts`. Researched values always
take precedence. `/deploy/coinspect/coinspect-audit.ts` (also run by
`/tests/coinspect-integrity.test.ts`) fails when a `null` field could be filled
from Coinspect data but is not; the refresh workflow then opens or updates a
`coinspect-import` issue instead of pushing, and closes that issue once a later
refresh passes the checks. The audit's non-blocking findings go into the
snapshot commit message.
