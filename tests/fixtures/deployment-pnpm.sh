#!/bin/bash
set -euo pipefail
if [[ "$1" == helios:wrap ]]; then
	shift 2
fi
case "$1 $2" in
	'omnipin pack') printf 'bafyexpected\n' ;;
	'deploy:ens update')
		echo write >> "$CALL_LOG"
		if [[ "$WRITE_RESULT" == submitted ]]; then exit 2; fi
		if [[ "$WRITE_RESULT" == wrapper-failure ]]; then echo transaction-hash > "$ENS_TRANSACTION_STATE_FILE"; exit 1; fi
		if [[ "$WRITE_RESULT" == fallback ]]; then
   [[ "$(wc -l < "$CALL_LOG")" -gt 1 ]]
  else
   [[ "$WRITE_RESULT" == success ]]
  fi
		;;
	*) echo "Unexpected command: $*" >&2; exit 99 ;;
esac
