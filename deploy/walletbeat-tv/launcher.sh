#!/bin/sh
set -eu

download() {
	if command -v curl >/dev/null 2>&1; then
		curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 "$1" -o "$2"
	elif command -v wget >/dev/null 2>&1; then
		wget --quiet --tries=3 --timeout=30 -O "$2" "$1"
	else
		echo 'Install curl or wget, then run this launcher again.' >&2
		return 1
	fi
}

require_space() {
	available_kib=$(df -Pk "$1" | awk 'NR == 2 { print $4 }')
	case "$available_kib" in
		''|*[!0-9]*) echo "Cannot determine free disk space at $1." >&2; exit 1 ;;
	esac
	if [ "$available_kib" -lt "$2" ]; then
		echo "Walletbeat TV needs at least $(( $2 / 1024 )) MiB free at $1. Free disk space and rerun the same command." >&2
		exit 1
	fi
}

main() {
	case "$(uname -s)" in
		Darwin)
			platform=darwin
			if [ "$(sw_vers -productVersion | cut -d. -f1)" -lt 14 ]; then
				echo 'Walletbeat TV requires macOS 14 or later.' >&2
				exit 1
			fi
			;;
		Linux) platform=linux ;;
		*) echo 'Use the PowerShell launcher on Windows.' >&2; exit 1 ;;
	esac
	case "$(uname -m)" in
		arm64|aarch64) architecture=arm64 ;;
		x86_64|amd64) architecture=x64 ;;
		*) echo 'Unsupported processor architecture.' >&2; exit 1 ;;
	esac

	require_space "${TMPDIR:-/tmp}" 16384
	installation_directory=$(mktemp -d "${TMPDIR:-/tmp}/walletbeat-tv.XXXXXX")
	trap 'rm -rf "$installation_directory"' EXIT
	trap 'exit 130' INT
	trap 'exit 143' HUP TERM
	cd "$installation_directory"

	node_version=@NODE_VERSION@
	if [ "$platform" = darwin ]; then
		cache_directory="$HOME/Library/Caches/walletbeat-tv"
	else
		cache_directory="${XDG_CACHE_HOME:-$HOME/.cache}/walletbeat-tv"
	fi
	mkdir -p "$cache_directory"
	exec 9>"$cache_directory/launch.lock"
	if [ "$platform" = darwin ]; then
		lockf -s -t 0 9 || { echo 'Walletbeat TV is already running or installing. Close it before launching another.' >&2; exit 1; }
	else
		flock -n 9 || { echo 'Walletbeat TV is already running or installing. Close it before launching another.' >&2; exit 1; }
	fi
	export WALLETBEAT_TV_CACHE="$cache_directory"
	cat > runtime-probe.cjs <<'RUNTIME_PROBE'
@RUNTIME_PROBE@
RUNTIME_PROBE
	node_executable=''
	if command -v node >/dev/null 2>&1; then
		npm_cli=$(node runtime-probe.cjs "$(command -v npm || true)" 2>/dev/null || true)
		if [ -n "$npm_cli" ]; then node_executable=$(node -p process.execPath); fi
	fi
	if [ -z "$node_executable" ]; then
		runtime_directory="$cache_directory/node-$node_version-$platform-$architecture"
		node_executable="$runtime_directory/bin/node"
		if [ "$("$node_executable" --version 2>/dev/null || true)" != "$node_version" ] || [ ! -f "$runtime_directory/lib/node_modules/npm/bin/npm-cli.js" ]; then
			require_space "$installation_directory" 262144
			require_space "$cache_directory" 262144
			echo 'Walletbeat TV: installing its runtime…'
			archive_name="node-$node_version-$platform-$architecture.tar.gz"
			download "https://nodejs.org/dist/$node_version/$archive_name" "$archive_name"
			download "https://nodejs.org/dist/$node_version/SHASUMS256.txt" SHASUMS256.txt
			grep "  $archive_name\$" SHASUMS256.txt > node.sha256
			if command -v sha256sum >/dev/null 2>&1; then
				sha256sum -c node.sha256
			else
				shasum -a 256 -c node.sha256
			fi
			mkdir runtime
			tar -xzf "$archive_name" -C runtime --strip-components=1
			mkdir -p "$cache_directory"
			rm -rf "$runtime_directory"
			mv runtime "$runtime_directory"
			rm "$archive_name" SHASUMS256.txt node.sha256
		fi
		npm_cli="$runtime_directory/lib/node_modules/npm/bin/npm-cli.js"
	fi
	export WALLETBEAT_TV_NPM_CLI="$npm_cli"
	echo "Walletbeat TV: using runtime $node_executable"
	if [ "$platform" = darwin ]; then decode_flag=-D; else decode_flag=-d; fi
	base64 "$decode_flag" > install.mjs <<'INSTALLATION_SCRIPT'
@INSTALLATION_SCRIPT@
INSTALLATION_SCRIPT
	"$node_executable" install.mjs "$@"
}

main "$@"
