---
title: ENS deployment and recovery
---

# ENS deployment and recovery

`beta` publishes `beta.walletbeat.eth`; `master` publishes `walletbeat.eth`.
Merging this PR into beta does not update production. Production needs the intended
beta changes and these deployment changes merged into master, followed by a
successful deployment. Verify that the build content identifier matches ENS and
that the public site serves that build. Read-only simulation does not prove this
end-to-end outcome.

## Deployment contract

Omnipin packages and pins the build. The ENS updater resolves through the mainnet
Universal Resolver and simulates the authorized DNS-name or name hash setter.
It adds a 50% gas margin, with a 100,000 minimum and 1,000,000 maximum, and simulates
that exact limit. Viem prepares and signs the transaction and waits for its receipt.
The updater requires both a successful receipt and the intended resolved content.
Offchain responses requiring CCIP Read are unsupported and fail verification.

The shell retries only preparation failures. A hash is recorded before broadcast;
a failed receipt, uncertain submission, or wrapper failure after submission stops
retries. Reconcile the logged transaction hash before rerunning. Helios supplies
the signing nonce; the execution RPC can only veto a conflicting pending nonce.
The shared workflow serializes deployments, but other users of the signing account
must coordinate separately. Gas limits do not impose a fee-price cap.

Pins are retained. Age and the newest build do not prove an older build is unused
by ENS, gateway caches, or rollback. The incident runs removed pins still referenced
by both domains; inspect provider retention and restore them through an authorized
operation if necessary.

## Resolver configuration

The documented worker is `0xd28283fCb6e484fCccD3d5b0D24C6ED7Eb28cE86`.
Maintainers must confirm that each GitHub secret corresponds to that public address.
Never expose private keys while checking this.

At the November 1, 2026 investigation:

- **Beta:** ENS v2 registry `0x573a3455c0874cc9d2fb0978733b94a66fba08ee`
  gives the worker ownership of beta. The configured resolver is legacy `PublicResolver`
  `0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63`. Its authorization uses retired
  ENS v1 ownership and rejects the worker. The authorized ENS v2 owner must select
  a compatible resolver, preserve existing records, and grant only the required
  content-hash permission. Editing the retired ENS v1 registry is not the remedy.
- **Production:** resolver `0xCDA5aeEEc47fA51c0cbA8932519F39A949D82F64`
  grants the worker the content-hash role (`0x100`) at its root scope. Its DNS-name
  setter simulation succeeds. No additional permission grant was indicated;
  the observed transaction failed from insufficient gas.

## Read-only pre-merge checks

The readiness workflow validates workflows and simulates both names through direct
RPC and pinned Linux Helios. It uses a public address and a different synthetic
content identifier, without signing or broadcasting. Deployment shares the same
setter and gas simulation. Mocked tests cover receipts and submission failures.

```sh
pnpm deploy:ens check beta.walletbeat.eth \
  --updater 0xd28283fCb6e484fCccD3d5b0D24C6ED7Eb28cE86 \
  --rpc-url https://eth.drpc.org
```

Beta readiness remains red until its configuration is corrected. RPC availability
can also fail these checks: The public node provider rejected proofs only three blocks behind
its head, so readiness uses another existing deployment fallback. A passing check
is a current observation; deployment repeats checks before signing. Keep the public
worker address aligned with key rotations. This workflow does not change merge rules.

When bringing beta into master, retain the three shared deployment workflow files,
branch-specific secrets, and absence of automatic unpinning. Remove the obsolete
`deploy.yaml` trigger. Preserve unrelated master changes, including its Omnipin
version. No resolver changes, merges, or pin restoration are executed by this PR.

## Incident evidence

- [ENS v2 migration](https://eth.blockscout.com/tx/0x8e7d60c18a14b282c2b2c20686bb4e7b83daf8c776ac8fdbaa233046a2624801).
- [Legacy registry cleanup](https://eth.blockscout.com/tx/0xd43291c9304bae5dc9d78dbacefeb4e0297bf8ad6b1df02d5523567f79175586).
- [Production out-of-gas transaction](https://eth.blockscout.com/tx/0xa2a5a2d5624ada0c9d491a7f56133443684500976aeccdc3c9bcaca98f7b6bff).
- [Production deployment](https://github.com/walletbeat/walletbeat/actions/runs/41271513296).
- [Beta deployment](https://github.com/walletbeat/walletbeat/actions/runs/41315949804).
