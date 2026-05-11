#!/bin/bash

# Runs a dev server in the background, print its URL when ready,
# and leave it running in the background.

set -euo pipefail

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
PID_FILE="${SCRIPT_DIR}/dev-server.pid"
URL_FILE="${SCRIPT_DIR}/dev-server.url"
LOG_FILE="${SCRIPT_DIR}/dev-server.log"

TIMEOUT_START=120
TIMEOUT_READY=120
POLL_INTERVAL=1
RESTART=false

for arg in "$@"; do
		case "$arg" in
				--stop)
						if [[ -f "$PID_FILE" ]]; then
								STOP_PID=$(cat "$PID_FILE")
								if kill -0 "$STOP_PID" 2>/dev/null; then
										kill "$STOP_PID" 2>/dev/null || true
										echo "Dev server stopped (PID $STOP_PID)."
								else
										echo "Dev server was not running (stale PID $STOP_PID)."
								fi
								rm -f "$PID_FILE" "$URL_FILE"
						else
								echo "No dev server running."
						fi
						exit 0
						;;
				--restart)
						RESTART=true
						;;
				*)
						echo "Usage: $0 [--stop|--restart]" >&2
						exit 1
						;;
		esac
done

pid_alive() {
		kill -0 "$1" 2>/dev/null
}

cleanup() {
		local pid="$1"
		pid_alive "$pid" && kill "$pid" 2>/dev/null || true
		rm -f "$PID_FILE" "$URL_FILE"
}

dump_logs() {
		cat "$LOG_FILE" 2>/dev/null || true
}

if [[ "$RESTART" == false ]] && [[ -f "$PID_FILE" ]]; then
		EXISTING_PID="$(cat "$PID_FILE")"

		if pid_alive "$EXISTING_PID"; then
				# Server process is alive
				if [[ -f "$URL_FILE" ]]; then
						EXISTING_URL="$(cat "$URL_FILE")"
						if curl -sf --max-time 5 "$EXISTING_URL" >/dev/null 2>&1; then
							echo "Dev server is already running and responsive at $EXISTING_URL (PID: $EXISTING_PID)"
							echo 'If you would like to restart it, run `pnpm dev:background:restart`.'
							echo 'If you would like to stop it, run `pnpm dev:background:stop`.'
							exit 0
						else
								# curl failed → kill and restart
								cleanup "$EXISTING_PID"
						fi
				else
						# URL file missing → remove PID and restart
						rm -f "$PID_FILE"
				fi
		else
				# Process dead → clean up PID file
				rm -f "$PID_FILE"
		fi
fi

# If --restart was passed and we got here, stop the existing server
if [[ "$RESTART" == true ]] && [[ -f "$PID_FILE" ]]; then
		RESTART_PID="$(cat "$PID_FILE")"
		cleanup "$RESTART_PID"
		echo "Restarting dev server..."
fi

# Start new server

# Truncate log file
echo > "$LOG_FILE"

pnpm dev >"$LOG_FILE" 2>&1 &
SERVER_PID="$!"
echo "$SERVER_PID" > "$PID_FILE"

echo "Starting dev server (PID $SERVER_PID)..."

# Phase 1: Wait for URL to appear in logs
ELAPSED=0
URL=""

while (( ELAPSED < TIMEOUT_START )); do
		# Check if process is still alive
		if ! pid_alive "$SERVER_PID"; then
				echo "ERROR: Dev server process died unexpectedly." >&2
				dump_logs >&2
				rm -f "$PID_FILE"
				exit 1
		fi

		# Look for URL in logs
		if [[ -f "$LOG_FILE" ]]; then
				FOUND_URL="$(grep -oE 'http://(localhost|127.0.0.1):[0-9]+' "$LOG_FILE" 2>/dev/null | tail -1 || true)"
				if [[ -n "$FOUND_URL" ]]; then
						URL="$FOUND_URL"
						break
				fi
		fi

		sleep "$POLL_INTERVAL"
		ELAPSED=$(( ELAPSED + POLL_INTERVAL ))
done

if [[ -z "$URL" ]]; then
		echo "ERROR: Dev server did not print a URL within ${TIMEOUT_START}s." >&2
		dump_logs >&2
		cleanup "$SERVER_PID"
		exit 1
fi

# Save URL to file
echo "$URL" > "$URL_FILE"

echo "Dev server bound to \`$URL\`, waiting for it to become responsive..."

# Phase 2: Wait for server to respond to curl
ELAPSED=0

while (( ELAPSED < TIMEOUT_READY )); do
		if ! pid_alive "$SERVER_PID"; then
				echo "ERROR: Dev server process died while waiting for responsiveness." >&2
				dump_logs >&2
				rm -f "$PID_FILE" "$URL_FILE"
				exit 1
		fi

		if curl -sf --max-time 3 "$URL" >/dev/null 2>&1; then
				dump_logs
				echo ''
				echo "Dev server is running at $URL (PID: $SERVER_PID)"
				echo 'If you would like to restart it, run `pnpm dev:background:restart`.'
				echo 'If you would like to stop it, run `pnpm dev:background:stop`.'
				set +e
				disown
				exit 0
		fi

		sleep "$POLL_INTERVAL"
		ELAPSED=$(( ELAPSED + POLL_INTERVAL ))
done

echo "ERROR: Dev server did not become responsive within ${TIMEOUT_READY}s." >&2
dump_logs >&2
cleanup "$SERVER_PID"
exit 1
