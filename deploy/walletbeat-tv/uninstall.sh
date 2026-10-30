#!/bin/sh
set -eu
case "$(uname -s)" in
    Darwin)
        cache_directory="$HOME/Library/Caches/walletbeat-tv"
        data_directory="$HOME/Library/Application Support"
        shortcut="${WALLETBEAT_TV_DESKTOP:-$HOME/Desktop}/Walletbeat TV.command"
        ;;
    Linux)
        cache_directory="${XDG_CACHE_HOME:-$HOME/.cache}/walletbeat-tv"
        data_directory="${XDG_DATA_HOME:-$HOME/.local/share}"
        shortcut="$data_directory/applications/walletbeat-tv.desktop"
        ;;
    *) echo 'Use uninstall-walletbeat-tv.ps1 on Windows.' >&2; exit 1 ;;
esac
if [ -d "$cache_directory" ]; then
    exec 9>"$cache_directory/launch.lock"
    if [ "$(uname -s)" = Darwin ]; then
        lockf -s -t 0 9 || { echo 'Close Walletbeat TV before uninstalling.' >&2; exit 1; }
    else
        flock -n 9 || { echo 'Close Walletbeat TV before uninstalling.' >&2; exit 1; }
    fi
fi
rm -f -- "$shortcut"
rm -rf -- "$data_directory/walletbeat-tv" "$cache_directory"
echo 'Walletbeat TV uninstalled. Shared browsers and system packages were kept.'
