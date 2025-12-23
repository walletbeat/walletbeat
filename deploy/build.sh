#!/bin/bash

# Build wrapper script that may re-execute the actual build process if some
# steps need that, such as SRI build hashes which turn the build into
# a 2-pass process.

set -euo pipefail

if [[ -n "${WALLETBEAT_BUILD_DO_NOT_RECURSE:-}" ]]; then
	exec pnpm astro build
fi

attempts_left=5
if [[ -n "${WALLETBEAT_BUILD_ATTEMPTS_LEFT:-}" ]]; then
	attempts_left="$WALLETBEAT_BUILD_ATTEMPTS_LEFT"
fi

has_tty() {
	if [[ ! -e /dev/tty ]]; then
		return 1
	fi
	if ! readlink "/proc/$$/fd/2" | grep -qE /dev; then
		return 1
	fi
	return 0
}

do_build() {
	if has_tty && hash script &>/dev/null; then
		# Using `script` preserves terminal colors.
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true script -q -e -f -c 'pnpm astro build' /dev/null 2>&1 | tee /dev/tty | sed -r "s/\x1B\[[0-9;]*[A-Za-z]//g"
	elif has_tty; then
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build 2>&1 | tee /dev/tty
	else
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build 2>&1 | cat
	fi
}

need_rebuild=''
while IFS= read -r line; do
	if echo "$line" | grep -qE --line-buffered 'SRI hashes have changed|Unable to obtain SRI hash'; then
		need_rebuild='SRI hashes need recomputing'
	fi
done < <(do_build)

if [[ -n "$need_rebuild" ]]; then
	export WALLETBEAT_BUILD_ATTEMPTS_LEFT="$(( $((attempts_left)) - 1 ))"
	if [[ "$attempts_left" -le 1 ]]; then
		echo "> Need to rebuild (${need_rebuild}) but ran out of rebuild attempts. Build failed." >&2
		exit 1
	elif [[ "$WALLETBEAT_BUILD_ATTEMPTS_LEFT" == 1 ]]; then
		echo "> Need to rebuild (${need_rebuild}); rebuilding (last rebuild attempt)..." >&2
	else
		echo "> Need to rebuild (${need_rebuild}); rebuilding (${WALLETBEAT_BUILD_ATTEMPTS_LEFT} rebuild attempts left)..." >&2
	fi
	exec "$0" "$@"
fi
