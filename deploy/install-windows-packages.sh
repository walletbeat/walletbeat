#!/bin/bash

# Installs the Chocolatey packages listed in windows-packages.txt.
# `choco install` can exit 0 without installing anything, so each package is checked afterwards.

set -uo pipefail

read -r -a packages <<< "$(tr -d '\r' < "$(dirname "$0")/windows-packages.txt" | tr '\n' ' ')"
for attempt in 1 2 3; do
	choco install "${packages[@]}" -y --no-progress
	missing=()
	for package in "${packages[@]}"; do
		if [[ -z "$(choco list --exact --limit-output "$package")" ]]; then
			missing+=("$package")
		fi
	done
	if [[ ${#missing[@]} -eq 0 ]]; then
		exit 0
	fi
	echo "Attempt $attempt: not installed: ${missing[*]}"
	sleep 30
done
echo "Chocolatey failed to install: ${missing[*]}" >&2
exit 1
