#!/bin/bash
set -euo pipefail
if [[ "$1" == helios:wrap ]]; then
	shift 2
fi
case "$1 $2" in
	'omnipin pack') printf 'bafyexpected\n' ;;
	'deploy:ens-update update')
		echo write >> "$CALL_LOG"
		touch "$WRITE_MARKER"
		if [[ "$WRITE_RESULT" == submitted ]]; then exit 2; fi
		if [[ "$WRITE_RESULT" == wrapper-failure ]]; then echo transaction-hash > "$ENS_TRANSACTION_STATE_FILE"; exit 1; fi
		[[ "$WRITE_RESULT" == success ]]
		;;
	'deploy:ens-content-hash-check check')
		echo check >> "$CALL_LOG"
		result="$BEFORE_RESULT"
		if [[ -f "$WRITE_MARKER" ]]; then result="$AFTER_RESULT"; fi
		case "$result" in
			match) printf '%s\t%s\n' match bafyexpected ;;
			mismatch) printf '%s\t%s\t%s\n' no-match bafyold bafyexpected ;;
			wrong) printf '%s\t%s\n' match bafywrong ;;
			error) exit 1 ;;
			failed-match) printf '%s\t%s\n' match bafyexpected; exit 1 ;;
			malformed) printf 'matching something else\n' ;;
		esac
		;;
	*) echo "Unexpected command: $*" >&2; exit 99 ;;
esac
