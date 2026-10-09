---
title: 'Walletbeat wallet testing: Firmware reproducibility'
description: 'A guide explaining how to check that hardware wallet firmware releases can be rebuilt from their published source code.'
---

# Verifying firmware reproducibility

_This guide explains how to check that the firmware a hardware wallet vendor publishes was built from the vendor's open-source repository. It currently covers Trezor and BitBox02, the two vendors tracked by Walletbeat that publish step-by-step reproducible build instructions._

> **Status of these instructions:** every command in the vendor sections below is taken from the vendor's own documentation, linked at the start of each section, and is only adapted where a comment says so. The Walletbeat team has **not** run these builds end-to-end to confirm them. The vendor's documentation is authoritative: if it differs from this guide, follow the vendor, and please open an issue or pull request to update this guide.

## Why?

Open-source firmware is only useful for security if the binary running on the device was actually built from that source code. A firmware build is **reproducible** when anyone can rebuild it from the tagged source and get a bit-for-bit identical binary. Without reproducible builds, users have to trust that the vendor's build machine and release process were not tampered with.

In Walletbeat, this is the `reproducibleBuilds` sub-criterion of the **Firmware** attribute for hardware wallets (`security.firmware.reproducibleBuilds` in the wallet data).

## High-level guide

Checking that a device runs firmware built from public source code has three parts:

1. **Rebuild the release** from the vendor's version tag, in the vendor's pinned build environment (both vendors below provide a Docker-based build script).
2. **Compare the result with the official release binary.** Official binaries are signed and local builds are not, so the signature must be removed or ignored before comparing hashes. Each vendor documents how to do this.
3. **Check that your device runs that official release**, for example by installing firmware only through the vendor's app and checking the version the device reports. BitBox02 can also display the firmware hash on the device itself (see below).

Requirements for both vendors:

- [Docker](https://www.docker.com/) and Git. Trezor's script is meant for a usual x86 Linux system.
- Enough disk space and time for the build: the build environments include complete toolchains

## Trezor

_Source: [Trezor firmware documentation: Reproducible build](https://github.com/trezor/trezor-firmware/blob/0cbc8f590a5ead1834ccd1ec65596651fe3bd4a9/docs/common/reproducible-build.md). Trezor pins its build environment with Nix, `uv` and Cargo, and provides the `build-docker.sh` script._

### Step 1: Pick the version tag

- Firmware for the Trezor One is tagged `legacy/vX.Y.Z` (for example `legacy/v1.10.3`).
- Newer models (Model T and the Safe family) use `core/vX.Y.Z` (for example `core/v2.8.3`).

### Step 2: Build the firmware

```bash
git clone https://github.com/trezor/trezor-firmware.git
cd trezor-firmware
git checkout core/v2.8.3
bash build-docker.sh core/v2.8.3
```

To build only one model, add `--models=<model identifier>`: `T1B1` (Trezor One), `T2T1` (Model T), `T2B1` (Safe 3 rev. A), `T3B1` (Safe 3 rev. B), `T3T1` (Safe 5) or `T3W1` (Safe 7). For example:

```bash
bash build-docker.sh --models=T3T1 core/v2.8.3
```

The resulting images are in `build/core-<model>/firmware/firmware.bin` and `build/core-<model>-bitcoinonly/firmware/firmware.bin`, or in `build/legacy/firmware/firmware.bin` and `build/legacy-bitcoinonly/firmware/firmware.bin` for the Trezor One.

### Step 3: Get the official firmware

Download the official image with `trezorctl` (part of the `trezor` Python package), for example for the Safe 5:

```bash
trezorctl firmware download --model t3t1 --version 2.8.3
```

The official images are also published in the [`trezor/data` repository](https://github.com/trezor/data/tree/master/firmware).

### Step 4: Remove the signature and compare (Model T and Safe family)

Official images are signed and local builds are not, so the two will not be identical until the signature is zeroed out. The 65-byte signature sits at offset 959 of the firmware header, which comes right after the vendor header. The offset to use therefore depends on the model:

| Model   | Vendor header size | Signature offset |
| ------- | ------------------ | ---------------- |
| Model T | 4608 bytes         | 5567             |
| Safe 3  | 512 bytes          | 1471             |
| Safe 5  | 1024 bytes         | 1983             |
| Safe 7  | 1024 bytes         | 1983             |

```bash
OFFSET=1983  # Safe 5; use the value for your model from the table above
dd if=/dev/zero of=trezor-t3t1-2.8.3.bin bs=1 seek=$OFFSET count=65 conv=notrunc
sha256sum trezor-t3t1-2.8.3.bin
sha256sum build/core-T3T1/firmware/firmware.bin
```

The two hashes should be identical.

### Step 4 (Trezor One): Remove the headers and compare

Official firmware for the Trezor One older than 1.12 starts with a 256-byte legacy header. Local builds don't have this header, so strip it first. Then zero out the 195 bytes of signature data (three 65-byte signatures) at offset 544:

```bash
tail -c +257 trezor-1.10.3.bin > trezor-1.10.3-nolegacyhdr.bin
dd if=/dev/zero of=trezor-1.10.3-nolegacyhdr.bin bs=1 seek=544 count=195 conv=notrunc
sha256sum trezor-1.10.3-nolegacyhdr.bin
sha256sum build/legacy/firmware/firmware.bin
```

Trezor notes that the fingerprints printed at the end of `build-docker.sh` for the Trezor One don't match the official firmware because of the legacy header, and that firmware for the Trezor One built this way won't boot on a device.

## BitBox02

_Source: [BitBox02 firmware: Reproducible builds](https://github.com/BitBoxSwiss/bitbox02-firmware/blob/eed2e68ec6324baeb82f5615604abb714381a6bb/releases/README.md). BitBox pins all build dependencies with Docker and provides the `releases/build.sh` script._

The same unsigned firmware binaries are used for the BitBox02 and the BitBox02 Nova, except for v9.26.2, which has a separate binary per product and edition (see the vendor documentation for that release).

### Step 1: Check the community assertions (no build needed)

For every release, the `releases/firmware-vX.Y.Z/` folder of the repository contains an assertion file (for example `assertion-bitbox02-multi.txt`) stating the tag, the commit, and the SHA-256 hash of the unsigned binary built from it. Each one is accompanied by GPG signatures from people who reproduced the build. To check a signature:

```bash
cd releases/firmware-v9.25.0/
# import any missing public keys (adapted: the keys are in releases/pubkeys/)
gpg --import ../pubkeys/benma.asc
gpg --verify assertion-bitbox02-multi-benma.sig assertion-bitbox02-multi.txt
```

A valid signature means that the signer says they reproduced the binary with the stated hash. It is not an endorsement of the firmware itself.

### Step 2: Rebuild the firmware yourself

From the `releases/` folder of the [`bitbox02-firmware` repository](https://github.com/BitBoxSwiss/bitbox02-firmware), run `./build.sh <version tag> <make command>`:

```bash
# Multi edition
./build.sh firmware/v9.25.0 "make firmware"
# Bitcoin-only edition, from v9.25.0
./build.sh firmware/v9.25.0 "make firmware-btc"
# Bitcoin-only edition, until v9.24.0
./build.sh firmware-btc-only/v9.24.0 "make firmware-btc"
```

Then hash the result:

```bash
sha256sum temp/build/bin/firmware.bin      # Multi edition
sha256sum temp/build/bin/firmware-btc.bin  # Bitcoin-only edition
# On macOS, use `shasum -a 256` instead of `sha256sum`.
```

Compare the hash with the one in the release's assertion file.

### Step 3: Compare with the signed release binary

Download the signed binary from the [GitHub release](https://github.com/BitBoxSwiss/bitbox02-firmware/releases) (for example `firmware-bitbox02-multi.v9.27.1.signed.bin`). With the BitBox02 Python library installed, the `describe_signed_firmware.py` script in `releases/` prints the hash of the unsigned binary inside it, which should match your build:

```bash
./describe_signed_firmware.py firmware-bitbox02-multi.v9.27.1.signed.bin
```

The script also prints the hash that the BitBox02 bootloader shows on the device's screen at startup, if this option was turned on when installing the firmware. This lets you check that the firmware on your own device is the release you verified.

## Recording results in Walletbeat

Use the outcome to fill in `security.firmware.reproducibleBuilds` in the hardware wallet's data file (`FirmwareType.PASS`, `FirmwareType.PARTIAL` or `FirmwareType.FAIL`). Cite the vendor's reproducible build documentation, and mention in the commit or pull request whether you reproduced a build yourself and for which version.

## Other vendors

This guide does not yet cover other hardware wallets tracked by Walletbeat. If a vendor documents a way to reproduce its firmware builds, please add a section for it. Follow the same structure: link to the vendor's instructions, the build steps, how to compare with the official binary, and how to check the firmware on the device.
