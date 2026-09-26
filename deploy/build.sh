#!/bin/bash

# Build wrapper script that may re-execute the actual build process if some
# steps need that, such as SRI build hashes which turn the build into
# a 2-pass process. Also features optional bwrap-based sandboxing.

set -euo pipefail

IS_LINUX=false
if ( hash uname &>/dev/null ) && [[ "$(uname -s)" == "Linux" ]]; then
	IS_LINUX=true
fi

# Optional sandboxing via bubblewrap. This is essential to keep the build
# deterministic, as Astro otherwise computes its resource hashes
# (the `astro-island uid`s) based on the absolute path of where the files
# are in the filesystem. By running in a sandbox, we can change the
# perceived path of these files and avoid this non-determinism.
if [[ "${WALLETBEAT_RUNNING_IN_SANDBOX:-}" != "true" ]]; then
	if command -v bwrap >/dev/null 2>&1; then
		bwrap_args=()
		if [[ "${WALLETBEAT_MUST_INSTALL_DEPENDENCIES_CLEANLY:-}" == "true" ]]; then
			# Enforce that deps must be installed from scratch in the sandbox by
			# mounting a tmpfs on top of `node_modules`:
			bwrap_args+=(--tmpfs /tmp/wb-build/node_modules)
		fi
		if [[ -d "${HOME:-/non-existent}" ]] && [[ -n "${HOME:-}" ]] && [[ "${HOME:-}" != '/tmp' ]]; then
			bwrap_args+=(--bind "${HOME:-/tmp}" "${HOME:-/tmp}")
		elif [[ -d /home ]]; then
			bwrap_args+=(--bind /home /home)
		else
			bwrap_args+=(--tmpfs /home)
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
			--tmpfs /tmp \
			--bind "$PWD" /tmp/wb-build \
			"${bwrap_args[@]}" \
			--dev /dev \
			--proc /proc \
			--chdir /tmp/wb-build \
			--setenv CI true \
			--setenv WALLETBEAT_RUNNING_IN_SANDBOX true \
			-- bash "$0" "$@"
	fi
	if [[ "$IS_LINUX" == true ]]; then
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
	fi
	# Otherwise, run build unsandboxed anyway.
	if [[ "${WALLETBEAT_BUILD_TEST:-}" == true ]] && [[ "$IS_LINUX" == false ]]; then
		echo 'bwrap is not available; build will be non-deterministic.' >&2
	fi
fi

if [[ -n "${WALLETBEAT_BUILD_DO_NOT_RECURSE:-}" ]]; then
	exec pnpm astro build --frozen-lockfile --offline "$@"
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
	if [[ "$IS_LINUX" == false ]]; then
		return 1
	fi
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
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true script -q -e -f -c 'pnpm astro build --frozen-lockfile --offline' /dev/null 2>&1 | tee /dev/tty | sed -r "s/\x1B\[[0-9;]*[A-Za-z]//g"
	elif has_tty; then
		WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build --frozen-lockfile --offline 2>&1 | tee /dev/tty
	else
		local status_file
		status_file="$(mktemp)"
		while IFS= read -r line; do
			echo "$line"
			echo "$line" >&2
		done < <({
			set +e
			WALLETBEAT_BUILD_DO_NOT_RECURSE=true pnpm astro build --frozen-lockfile --offline 2>&1
			echo "$?" >"$status_file" 2>/dev/null
		})
		local build_status
		build_status="$(cat "$status_file")"
		rm -f "$status_file"
		return "$build_status"
	fi
}

need_rebuild=''
if [[ "$IS_LINUX" == true ]]; then
	while IFS= read -r line; do
		if echo "$line" | grep -qE --line-buffered 'SRI hashes have changed|Unable to obtain SRI hash'; then
			need_rebuild='SRI hashes need recomputing'
		fi
	done < <(do_build)
else
	do_build
fi

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
