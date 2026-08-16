#!/bin/bash

# Build wrapper script that may re-execute the actual build process if some
# steps need that, such as SRI build hashes which turn the build into
# a 2-pass process. Also features optional bwrap-based sandboxing.

set -euo pipefail

# Optional sandboxing via bubblewrap. This is essential to keep the build
# deterministic, as Astro otherwise computes its resource hashes
# (the `astro-island uid`s) based on the absolute path of where the files
# are in the filesystem. By running in a sandbox, we can change the
# perceived path of these files and avoid this non-determinism.
if [[ "${WALLETBEAT_RUNNING_IN_SANDBOX:-}" != "true" ]]; then
	if command -v bwrap >/dev/null 2>&1; then
		tmpfs_arg=()
		if [[ "${WALLETBEAT_MUST_INSTALL_DEPENDENCIES_CLEANLY:-}" == "true" ]]; then
			# Enforce that deps must be installed from scratch in the sandbox by
			# mounting a tmpfs on top of `node_modules`:
			tmpfs_arg=(--tmpfs /tmp/wb-build/node_modules)
		fi
		if [[ "${WALLETBEAT_ENV:-}" == "CI" ]]; then
			sudo sysctl -w kernel.unprivileged_userns_clone=1 &>/dev/null || true
			sudo sysctl -w user.max_user_namespaces=4096 &>/dev/null || true
			sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0 &>/dev/null || true
		fi
		exec bwrap \
			--unshare-user \
			--unshare-ipc \
			--unshare-pid \
			--unshare-uts \
			--ro-bind / / \
			--bind /tmp /tmp \
			--bind "${HOME:-/tmp}" "${HOME:-/tmp}" \
			--bind "$PWD" /tmp/wb-build \
			"${tmpfs_arg[@]}" \
			--dev /dev \
			--proc /proc \
			--chdir /tmp/wb-build \
			--setenv CI true \
			--setenv WALLETBEAT_RUNNING_IN_SANDBOX true \
			-- bash "$0" "$@"
	fi
	if [[ "${WALLETBEAT_MUST_INSTALL_DEPENDENCIES_CLEANLY:-}" == "true" ]]; then
		echo "bwrap is required to sandbox the build (WALLETBEAT_MUST_INSTALL_DEPENDENCIES_CLEANLY=true), but bwrap is not installed." >&2
		exit 1
	fi
	if [[ "${WALLETBEAT_BUILD_MUST_BE_SANDBOXED:-}" == "true" ]]; then
		echo "bwrap is required to sandbox the build (WALLETBEAT_BUILD_MUST_BE_SANDBOXED=true), but bwrap is not installed." >&2
		exit 1
	fi
	if [[ "${WALLETBEAT_ENV:-}" == "CI" ]]; then
		echo "bwrap is required to sandbox the build (WALLETBEAT_ENV=CI), but bwrap is not installed." >&2
		exit 1
	fi
	# Otherwise, run build unsandboxed anyway.
	if [[ "${WALLETBEAT_BUILD_TEST:-}" == true ]]; then
		echo 'bwrap is not available; build will be non-deterministic.' >&2
	fi
fi

if [[ -n "${WALLETBEAT_BUILD_DO_NOT_RECURSE:-}" ]]; then
	exec pnpm astro build
fi

# Ensure dependencies are installed before building.
if [[ ! -d node_modules ]] || [[ -z "$(ls -A node_modules 2>/dev/null)" ]]; then
	pnpm install --frozen-lockfile
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
	elif [[ -w /dev/stderr ]]; then
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build 2>&1 | tee /dev/stderr
	else
		while IFS= read -r line; do
			echo "$line"
			echo "$line" >&2
		done < <(WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build 2>&1)
	fi
}

need_rebuild=''
while IFS= read -r line; do
	if echo "$line" | grep -qE --line-buffered 'SRI hashes have changed|Unable to obtain SRI hash'; then
		need_rebuild='SRI hashes need recomputing'
	fi
done < <(do_build)

if [[ -n "$need_rebuild" ]]; then
	export WALLETBEAT_BUILD_ATTEMPTS_LEFT="$(($((attempts_left)) - 1))"
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
