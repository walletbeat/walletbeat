#!/bin/bash

set -euo pipefail
set +x

gateway_dweb() {
	echo "https://${1}.ipfs.dweb.link/"
}

gateway_w3s() {
	echo "https://${1}.ipfs.w3s.link/"
}

gateway_nftstorage() {
	echo "https://${1}.ipfs.nftstorage.link/"
}

GATEWAY_FUNCTIONS=(
	dweb
	w3s
	nftstorage
)

log() {
	echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] $*" >&2
}

# Retry-After can be a number of seconds or an HTTP date. Only use the final
# response's headers, so a redirect's cooldown does not affect the destination.
read_retry_after() {
	local retry_after retry_at now
	RETRY_AFTER_DELAY=0
	retry_after="$(awk '
		/^HTTP\// { value = "" }
		tolower($0) ~ /^retry-after:/ {
			value = $0
			sub(/^[^:]*:[[:space:]]*/, "", value)
			sub(/[[:space:]]*$/, "", value)
		}
		END { print value }
	' "$TEMP_DIRECTORY/headers")"
	if [[ "$retry_after" =~ ^[0-9]+$ ]]; then
		# Strip leading zeros and bound untrusted numbers before shell arithmetic.
		retry_after="${retry_after#"${retry_after%%[!0]*}"}"
		retry_after="${retry_after:-0}"
		if [[ "${#retry_after}" -gt 3 ]]; then
			RETRY_AFTER_DELAY=600
		else
			RETRY_AFTER_DELAY="$((10#$retry_after))"
			if [[ "$RETRY_AFTER_DELAY" -gt 600 ]]; then
				RETRY_AFTER_DELAY=600
			fi
		fi
	elif [[ -n "$retry_after" ]]; then
		if retry_at="$(date --date="$retry_after" +%s 2>/dev/null)"; then
			now="$(date +%s)"
			if [[ "$retry_at" -gt "$now" ]]; then
				RETRY_AFTER_DELAY="$((retry_at - now))"
				if [[ "$RETRY_AFTER_DELAY" -gt 600 ]]; then
					RETRY_AFTER_DELAY=600
				fi
			fi
		else
			log "Ignoring invalid Retry-After header: '$retry_after'."
		fi
	fi
}

fetch_endpoint() {
	local url="$1" max_time="$2" remaining
	HTTP_STATUS=000
	CURL_EXIT_CODE=0
	RETRY_AFTER_DELAY=0
	remaining="$((DEADLINE - SECONDS))"
	if [[ "$remaining" -le 0 ]]; then
		return 1
	fi
	if [[ "$max_time" -gt "$remaining" ]]; then
		max_time="$remaining"
	fi
	# Save the body separately: error responses and partial transfers must never
	# become input to the content hash or availability check.
	: >"$TEMP_DIRECTORY/headers"
	if HTTP_STATUS="$(curl --fail --location --silent --show-error \
		--max-time "$max_time" --dump-header "$TEMP_DIRECTORY/headers" \
		--output "$TEMP_DIRECTORY/body" --write-out '%{http_code}' "$url")"; then
		CURL_EXIT_CODE=0
	else
		CURL_EXIT_CODE="$?"
	fi
	read_retry_after
	[[ "$CURL_EXIT_CODE" -eq 0 ]]
}

ping_gateway() {
	local url="$1" actual_sha
	if ! fetch_endpoint "$url" 15; then
		log "Failed to fetch content from '$url'."
		return 1
	fi
	if ! actual_sha="$(sed -E 's#<a href="https://[^"]*cdn-cgi/content\?id=[^"]*"[^>]*></a>##g' "$TEMP_DIRECTORY/body" | sha256sum | awk '{print $1}')"; then
		log "Failed to hash content from '$url'."
		return 1
	fi
	if [[ "$actual_sha" != "$EXPECTED_SHA" ]]; then
		log "Content hash mismatch for '$url' (expected '$EXPECTED_SHA', got '$actual_sha')."
		return 1
	fi
	log "Content verified on '$url'."
}

ipfs_check_cid() {
	local url="$1"
	if ! fetch_endpoint "$url" 40; then
		log "Failed to fetch CID availability from the IPFS check service."
		return 1
	fi
	if ! jq -e '([.[] | select(.DataAvailableOverBitswap.Found == true)] | length) >= 1 and ([.[] | select(.DataAvailableOverHTTP.Found == true)] | length) >= 1' "$TEMP_DIRECTORY/body" >/dev/null; then
		log "CID '$DIRECTORY_CID' not reported as available by the IPFS check service."
		return 1
	fi
	log "CID '$DIRECTORY_CID' reported as available by the IPFS check service."
}

print_summary() {
	local index
	for index in "${!ENDPOINTS[@]}"; do
		log "${ENDPOINTS[$index]}: ${ATTEMPTS[$index]} attempts; last HTTP status: ${LAST_HTTP_STATUS[$index]}."
	done
}

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"
if [[ ! "$DIRECTORY_CID" =~ ^[a-z2-7]+$ ]]; then
	log "CID '$DIRECTORY_CID' is not base32-lowercase alphanumeric; refusing to build check URLs."
	exit 1
fi
EXPECTED_SHA="$(sed -E 's#<a href="https://[^"]*cdn-cgi/content\?id=[^"]*"[^>]*></a>##g' "$DEPLOY_DIRECTORY/index.html" | sha256sum | awk '{print $1}')"
TEMP_DIRECTORY="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIRECTORY"' EXIT

# Each endpoint has its own attempt count, backoff, and cooldown. Track the
# waiting budget using the shell's elapsed seconds.
ENDPOINTS=("${GATEWAY_FUNCTIONS[@]}" ipfs-check)
ENDPOINT_URLS=()
ATTEMPTS=()
BACKOFFS=()
NEXT_ATTEMPTS=()
LAST_HTTP_STATUS=()
for GATEWAY_FUNC in "${GATEWAY_FUNCTIONS[@]}"; do
	ENDPOINT_URLS+=("$(gateway_"$GATEWAY_FUNC" "$DIRECTORY_CID")")
done
ENDPOINT_URLS+=("https://ipfs-check-backend.ipfs.io/check?cid=${DIRECTORY_CID}&multiaddr=&ipniIndexer=https%3A%2F%2Fcid.contact&timeoutSeconds=30&httpRetrieval=on")
DEADLINE="$((SECONDS + 600))"
for INDEX in "${!ENDPOINTS[@]}"; do
	ATTEMPTS+=(0)
	BACKOFFS+=(10)
	NEXT_ATTEMPTS+=("$SECONDS")
	LAST_HTTP_STATUS+=(not-attempted)
done

while [[ "$SECONDS" -lt "$DEADLINE" ]]; do
	for INDEX in "${!ENDPOINTS[@]}"; do
		if [[ "$SECONDS" -ge "$DEADLINE" ]]; then
			break
		fi
		if [[ "$SECONDS" -lt "${NEXT_ATTEMPTS[$INDEX]}" ]]; then
			continue
		fi
		ATTEMPTS[$INDEX]="$((ATTEMPTS[$INDEX] + 1))"
		log "Checking '${ENDPOINTS[$INDEX]}' for CID '$DIRECTORY_CID' (attempt ${ATTEMPTS[$INDEX]}) at '${ENDPOINT_URLS[$INDEX]}'..."
		CHECK_FUNCTION=ping_gateway
		if [[ "${ENDPOINTS[$INDEX]}" == ipfs-check ]]; then
			CHECK_FUNCTION=ipfs_check_cid
		fi
		if "$CHECK_FUNCTION" "${ENDPOINT_URLS[$INDEX]}"; then
			LAST_HTTP_STATUS[$INDEX]="$HTTP_STATUS"
			print_summary
			log 'CID availability verified. Success.'
			exit 0
		fi
		LAST_HTTP_STATUS[$INDEX]="$HTTP_STATUS"
		# Add up to 20% jitter; at the cap, jitter downward to stay within 60s.
		JITTER="$((RANDOM % (BACKOFFS[$INDEX] / 5 + 1)))"
		if [[ "${BACKOFFS[$INDEX]}" -eq 60 ]]; then
			RETRY_DELAY="$((60 - JITTER))"
		else
			RETRY_DELAY="$((BACKOFFS[$INDEX] + JITTER))"
		fi
		if [[ "$RETRY_AFTER_DELAY" -gt "$RETRY_DELAY" ]]; then
			RETRY_DELAY="$RETRY_AFTER_DELAY"
		fi
		NEXT_ATTEMPTS[$INDEX]="$((SECONDS + RETRY_DELAY))"
		BACKOFFS[$INDEX]="$((BACKOFFS[$INDEX] * 2))"
		if [[ "${BACKOFFS[$INDEX]}" -gt 60 ]]; then
			BACKOFFS[$INDEX]=60
		fi
		if [[ "${NEXT_ATTEMPTS[$INDEX]}" -ge "$DEADLINE" ]]; then
			log "${ENDPOINTS[$INDEX]}: HTTP $HTTP_STATUS, curl exit $CURL_EXIT_CODE; retry delay ${RETRY_DELAY}s exceeds the remaining budget. No further attempts."
		else
			log "${ENDPOINTS[$INDEX]}: HTTP $HTTP_STATUS, curl exit $CURL_EXIT_CODE; next retry in ${RETRY_DELAY}s."
		fi
	done
	if [[ "$SECONDS" -ge "$DEADLINE" ]]; then
		break
	fi
	NEXT_WAKE="$DEADLINE"
	for INDEX in "${!ENDPOINTS[@]}"; do
		if [[ "${NEXT_ATTEMPTS[$INDEX]}" -lt "$NEXT_WAKE" ]]; then
			NEXT_WAKE="${NEXT_ATTEMPTS[$INDEX]}"
		fi
	done
	WAIT_SECONDS="$((NEXT_WAKE - SECONDS))"
	if [[ "$WAIT_SECONDS" -gt 0 ]]; then
		sleep "$WAIT_SECONDS"
	fi
done
print_summary
log 'No endpoint verified CID availability within the ten-minute budget. Failure.'
exit 1
