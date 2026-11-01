---
title: ENS deployment and recovery
---

# ENS deployment and recovery

The deployment workflows publish `beta` to `beta.walletbeat.eth` and `master` to
`walletbeat.eth`. They call the shared `deploy-site.yaml` workflow with separate named GitHub secrets. Both workflows share a
concurrency group because their updater accounts may be the same. A merge to beta
does not update the code executed on master; bring these deployment changes into
master when merging beta there.

## Verification and transaction handling

Content reads use the Ethereum mainnet Universal Resolver at
`0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`. Direct ENS v1 registry reads are not a
valid way to check names migrated to ENS v2. The checker makes one observation and
compares its IPFS content identifier with the build content identifier. Missing, malformed, offchain, or
unavailable responses cause verification to fail; this tool does not perform CCIP Read callbacks.

The updater uses the existing `ox` dependency for RPC requests, signing, and
transaction encoding. Omnipin remains responsible for IPFS packaging and pinning.
The updater simulates the DNS-name setter used by ENS v2, then the name hash setter
used by ENS v1 if necessary. Neither a failed simulation nor a missing resolver
can authorize a transaction.

Gas estimates receive a 50% margin and a minimum limit of 100,000 gas. The resulting
limit must not exceed 1,000,000 gas. A second simulation uses that exact limit
before signing. These limits bound the gas budget; they do not impose a fee-price
cap. A successful receipt and a universal content-hash match are both required.

A transaction hash is recorded before broadcast. After that point, a failed
receipt, RPC error, wrapper failure, or receipt timeout stops automatic retries.
The job prints the transaction hash for reconciliation. Check its receipt and the
current resolver content before rerunning a failed job. A pending nonce also
blocks another submission. Helios supplies the verified nonce used for signing;
the execution RPC supplies only the pending-nonce guard because pending state is
not available from Helios. Disagreement blocks the write rather than choosing an
unverified nonce. Other users of the signing account must coordinate
with deployments; GitHub concurrency cannot serialize transactions sent elsewhere.

## Pre-merge readiness checks

The ENS readiness workflow validates workflow syntax and checks both deployment
names through direct RPC and the pinned Linux Helios wrapper. It runs on pull
requests that change deployment code, dependencies, workflows, or this guide.
The jobs receive only the documented public updater address, without deployment
secrets. Keep that address aligned with the actual signer when rotating keys.

The readiness command shares the deployment setter and gas simulation. It uses
a valid synthetic content identifier different from the current record, so checking an
unchanged value cannot hide storage-write costs or bypass authorization. It uses
only reads, gas estimation, and `eth_call`; it never signs or broadcasts a
transaction. The simulated content does not need to exist on IPFS.

```sh
pnpm deploy:ens-preflight check beta.walletbeat.eth \
  --updater 0xd28283fCb6e484fCccD3d5b0D24C6ED7Eb28cE86 \
  --rpc-url https://ethereum-rpc.publicnode.com
```

These checks fail on an incompatible resolver, insufficient authorization, unsafe
gas estimate, or unavailable RPC or Helios service. Beta's known resolver mismatch
is a readiness failure until maintainers correct its configuration; it is not an
expected-success exception. Logs identify the domain, resolver, current content,
and public updater before simulation. Network failures still require diagnosis.
A green check is an observation at that time, not a guarantee about state at a
later deployment. Deployment repeats its checks before signing. Mocked tests
separately cover failed receipts and uncertain broadcasts without live writes.

## Required ENS configuration

Configuration changes below are maintainer operations. This repository change
does not execute them, change secrets, or deploy a resolver.

At the November 1, 2026 investigation, the documented CI worker was
`0xd28283fCb6e484fCccD3d5b0D24C6ED7Eb28cE86`. Confirm the public address associated
with each configured secret through an approved maintainer process; never print
or copy a private key into logs, issues, or documents.

### Beta

The ENS v2 registry at `0x573a3455c0874cc9d2fb0978733b94a66fba08ee` reports the CI
worker as the owner of `beta`, with registry roles. Its configured resolver is the
legacy `PublicResolver` at `0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63`. The ENS v1
registry owner is now Graveyard, so that resolver rejects the worker even though
the worker controls the ENS v2 name.

The authorized ENS v2 registry owner must select or deploy a compatible resolver,
preserve the required records, authorize the intended updater to change beta's
content hash, and set beta's ENS v2 resolver accordingly. Do not try to restore
permissions by editing the retired ENS v1 registry. Use a resolver dedicated to the
intended scope, or grant only the name-scoped content-hash permission needed.
Verify the selected contract's interface and role model before granting access.

Before allowing deployment, perform read-only universal resolution and simulate
the intended setter from the updater address. Verify both the successful
simulation and the preserved records. A successful DNS lookup alone does not
prove write authorization.

### Production

`walletbeat.eth` resolves to the ENS v2 resolver at
`0xCDA5aeEEc47fA51c0cbA8932519F39A949D82F64`. The documented worker had the
content-hash role (`0x100`) at the root scope of the resolver, and its DNS-name setter
simulation succeeded. No additional permission grant was indicated. Recheck this
state and the configured secret's public address before deployment; avoid
broadening permissions to work around a gas failure.

The observed production failure was insufficient transaction gas, followed by a
zero process exit status after a failed receipt. Its execution trace and a
read-only replay distinguish that failure from missing authorization.

## Pin retention and branch integration

Neither workflow automatically removes pins. Content age, pin count, and the new
build content identifier cannot establish whether another name, gateway cache, or rollback still
needs an older build. Storage usage therefore grows until maintainers audit pin
ownership and retention. Inventory both domains and all pinning accounts before
any manual removal.

The November 1 runs logged removal of the CIDs still referenced by both domains.
Inspect current provider retention and restore those pins if necessary through an
authorized operational change. This code cannot restore pins already removed.

When integrating beta into master, retain `deploy-beta.yaml`,
`deploy-master.yaml`, and `deploy-site.yaml` from this change, their domain-specific secrets, the shared
concurrency group, and the absence of automatic unpinning. Remove any obsolete
`deploy.yaml` trigger so a branch cannot deploy twice. Preserve unrelated master
changes, including its Omnipin version; ENS writes no longer depend on that
package's transaction handling. Both workflows must use the universal checker
and the verified transaction updater before either deployment is accepted.

## Incident evidence

- [ENS v2 migration transaction](https://eth.blockscout.com/tx/0x8e7d60c18a14b282c2b2c20686bb4e7b83daf8c776ac8fdbaa233046a2624801).
- [Legacy beta and dev registry cleanup](https://eth.blockscout.com/tx/0xd43291c9304bae5dc9d78dbacefeb4e0297bf8ad6b1df02d5523567f79175586).
- [Production transaction that ran out of gas](https://eth.blockscout.com/tx/0xa2a5a2d5624ada0c9d491a7f56133443684500976aeccdc3c9bcaca98f7b6bff).
- [Production deployment run](https://github.com/walletbeat/walletbeat/actions/runs/41271513296).
- [Beta deployment run](https://github.com/walletbeat/walletbeat/actions/runs/41315949804).
