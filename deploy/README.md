# Hosting and deployment

This document describes how Walletbeat is built, hosted and deployed, so that maintainers have the full picture and other projects can replicate or improve on the setup.

It is derived from the scripts in this directory and the workflows in [`.github/workflows`](/.github/workflows). If the two ever disagree, the scripts are the source of truth.

## Overview

Walletbeat is a fully static Astro site. Each push to the `beta` branch:

1. Runs all checks and builds the site deterministically.
2. Uploads the build output to IPFS (via Filecoin) and pins it on [4EVERLAND](https://www.4everland.org/).
3. Updates the `contenthash` record of the `beta.walletbeat.eth` ENS name to point at the new IPFS CID.
4. Unpins old builds.

Visitors reach the site through an ENS-aware IPFS gateway such as [eth.limo](https://eth.limo/), at [`beta.walletbeat.eth.limo`](https://beta.walletbeat.eth.limo). Because the CID is derived from the content, anyone can rebuild the site at a given commit and check that it matches what the ENS name points to.

The reasoning behind this design (IPFS for content-addressed storage, ENS for naming, a multisig for control) is in the [decentralized hosting decision](/governance/decisions/2025/walletbeat-hosting.md). ENS describes the same general approach in [Decentralized websites](https://ens.domains/blog/post/decentralized-websites).

All deployment tooling runs through [Omnipin](https://omnipin.eth.link/) (the `omnipin` dev dependency), plus a few small tools in this repository:

- [`src/4everland-pin-tool`](/src/4everland-pin-tool): lists and inspects pins on the 4EVERLAND account.
- [`src/tools/ens-content-hash-checker`](/src/tools/ens-content-hash-checker): checks whether an ENS name already points at a given CID.
- [`src/tools/ipfs-availability-checker`](/src/tools/ipfs-availability-checker): checks that a freshly pinned CID can be retrieved.

## Deploy workflow

[`.github/workflows/deploy.yaml`](/.github/workflows/deploy.yaml) runs on every push to `beta`. Its jobs run in sequence; each one only starts if the previous one succeeded.

### 1. Check and build

Runs `pnpm run check:ci` on Linux, macOS, and Windows. On Linux it also runs a clean `pnpm build`, which calls [`build.sh`](build.sh):

- The build runs inside a [bubblewrap](https://github.com/containers/bubblewrap) sandbox at a fixed path. Astro derives some generated identifiers from absolute file paths, so without the sandbox the output (and therefore the CID) would depend on where the repository is checked out. CI refuses to build without the sandbox.
- Subresource integrity hashes make the build a two-pass process. `build.sh` reruns the build (up to 5 attempts) when it detects that the hashes changed.

The `dist` directory is uploaded as a workflow artifact for the next jobs.

### 2. Pin on IPFS

- [`check-existing-pin.sh`](check-existing-pin.sh) computes the CID of `dist` (`omnipin pack --only-hash`) and asks 4EVERLAND whether it is already pinned. If so, the next two steps are skipped.
- [`deploy-omnipin.sh`](deploy-omnipin.sh) uploads `dist` with Omnipin's Filecoin provider (Filecoin mainnet).
- [`pin-omnipin.sh`](pin-omnipin.sh) pins the same CID on 4EVERLAND.

### 3. Update ENS records

- [`check-ipfs-availability.sh`](check-ipfs-availability.sh) waits until the CID can be fetched, either directly from the providers announcing it on `cid.contact` or through a public gateway. This avoids pointing the ENS name at content that nobody can retrieve yet.
- [`update-ens.sh`](update-ens.sh) first checks whether `beta.walletbeat.eth` already points at the CID and exits if so. Otherwise, it sends the record update with `omnipin ens`, signed by the updater account (see [Secrets](#secrets)). It tries a list of public Ethereum RPC endpoints in random order. Both the check and the update go through a local [Helios](https://github.com/a16z/helios) light client (see [`helios/`](helios)), so a dishonest RPC endpoint cannot feed the script false chain data.

### 4. Unpin old IPFS pins

[`unpin-old-ipfs-cids.sh`](unpin-old-ipfs-cids.sh) unpins 4EVERLAND pins created more than 6 hours before the previous commit. It never unpins the current CID and always leaves at least 3 pins on the account, so recent builds stay available for rollback.

## ENS control model

The [hosting decision](/governance/decisions/2025/walletbeat-hosting.md) describes the intended control model:

- The ENS name is owned by a Walletbeat multisig.
- The ability to update records (but not ownership) is delegated to a separate account, so that routine deploys need no human approval. The deploy workflow uses an externally owned account (EOA) whose private key is a CI secret.
- If that account or the CI pipeline is compromised, the multisig can revoke its authority and point the name back at a known-good CID. Old CIDs remain valid because IPFS content is immutable.

The multisig can be operated through the self-hosted Safe interface in [`multisig/`](multisig) (Eternal Safe with Helios and Tor).

## Scheduled and on-demand workflows

| Workflow                                                              | Trigger                            | What it does                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`helios-refresh.yaml`](/.github/workflows/helios-refresh.yaml)       | Every 4 days, or manually          | Runs Helios briefly to refresh the checkpoint in `helios/data/checkpoint`, then commits and pushes it to `beta` as `walletbeat-bot`. `update-ens.sh` runs Helios with `--strict-checkpoint-age`, so a stale checkpoint would break deploys.                                |
| [`coinspect-refresh.yaml`](/.github/workflows/coinspect-refresh.yaml) | Manually                           | Vendors the latest [Coinspect wallet security ranking](https://github.com/coinspect/wallet-security-ranking) reports into `data/coinspect` ([`coinspect/coinspect-update.sh`](coinspect/coinspect-update.sh)), then commits and pushes them to `beta` as `walletbeat-bot`. |
| [`eip-status-drift.yaml`](/.github/workflows/eip-status-drift.yaml)   | Mondays at 08:00 UTC, or manually  | Runs the EIP status checker ([`eip-status/report-drift.sh`](eip-status/report-drift.sh)) and opens, updates, or closes a single issue labeled `eip-status-drift`.                                                                                                          |
| [`check.yaml`](/.github/workflows/check.yaml)                         | Pull requests and pushes to `beta` | Runs the `check:*` scripts as parallel jobs, plus `pnpm run check:ci` on Linux, macOS, and Windows. It does not deploy anything.                                                                                                                                           |

The Helios binary is pinned by version and SHA-512 hash in [`helios/helios.version`](helios/helios.version) and [`helios/helios.sha512sums`](helios/helios.sha512sums). [`helios/helios.sh`](helios/helios.sh) refuses to run an archive whose hash does not match. To upgrade, run `deploy/helios/helios-update.sh <version>` and commit the result.

The bot workflows configure git with [`setup-git.sh`](setup-git.sh), which installs an SSH key for pushing and a separate SSH key for signing commits (CI requires signed commits).

## Secrets

These are the GitHub Actions secrets the workflows use. Their values are never stored in the repository.

| Secret                                              | Used by                                                             | Purpose                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BETA_WALLETBEAT_ETH_4EVERLAND_ACCESS_TOKEN`        | `check-existing-pin.sh`, `pin-omnipin.sh`, `unpin-old-ipfs-cids.sh` | API token for the 4EVERLAND pinning account. Passed as `ACCESS_TOKEN_4EVERLAND` or `OMNIPIN_4EVERLAND_TOKEN`.                                                                                                            |
| `BETA_WALLETBEAT_ETH_UPDATER_EOA_PRIVATE_KEY`       | `deploy-omnipin.sh`, `update-ens.sh`                                | Private key of the account allowed to update the ENS records. Passed as `OMNIPIN_PK` for ENS updates and as `OMNIPIN_FILECOIN_TOKEN` for Filecoin uploads. The account needs enough funds to pay for these transactions. |
| `WALLETBEAT_BOT_GIT_SSH_AUTHENTICATION_KEY_PRIVATE` | `helios-refresh.yaml`, `coinspect-refresh.yaml`                     | SSH key `walletbeat-bot` uses to push to `beta`. Its public half is inline in the workflow files and must be authorized to push to the repository.                                                                       |
| `WALLETBEAT_BOT_GIT_SSH_SIGNING_KEY_PRIVATE`        | `helios-refresh.yaml`, `coinspect-refresh.yaml`                     | SSH key `walletbeat-bot` uses to sign its commits. Its public half is inline in the workflow files.                                                                                                                      |

`eip-status-drift.yaml` only uses the workflow's built-in `GITHUB_TOKEN`.

## Replicating this setup

To deploy a similar static site:

1. Make the site build deterministic, so that a given commit always produces the same CID. See [`build.sh`](build.sh) for one way to do this.
2. Register an ENS name and transfer it to a multisig.
3. Create a fresh EOA for deployments. Give it permission to update the name's records without giving it ownership (the ENS "manager" role), and fund it.
4. Create an account with a pinning provider supported by Omnipin and get an API token.
5. Store the EOA private key and the API token as CI secrets, then adapt [`deploy.yaml`](/.github/workflows/deploy.yaml) and the scripts in this directory, starting with the `ENS_DOMAIN` variable.
6. Optionally, run Helios (or another light client) in front of the RPC endpoints used to read and write ENS records, and keep its checkpoint fresh on a schedule.

## Checking a deployment by hand

You can rebuild the site, compute the CID of the build output and check whether the ENS name points at it:

```bash
SITE_URL=https://beta.walletbeat.eth.limo WALLETBEAT_ENV=CI pnpm build
CID="$(pnpm omnipin pack --only-hash dist)"
pnpm deploy:ens-content-hash-check check beta.walletbeat.eth "$CID"
```

The last command prints `match` when the ENS record points at that CID, and `no-match` followed by the current CID otherwise. A match is only expected when building the same commit on Linux with bubblewrap installed, as CI does.
