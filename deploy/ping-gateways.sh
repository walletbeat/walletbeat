#!/bin/bash

set -euo pipefail
set +x

gateway_filebase() {
	echo "https://ipfs.filebase.io/ipfs/${1}/"
}

GATEWAY_FUNCTIONS=(
	filebase
)

# At most this many provider addresses are tried per routing lookup.
MAX_PROVIDERS=5

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

# Converts an HTTPS provider address such as /dns/example.com/tcp/443/https or
# /dns4/example.com/tcp/443/tls/sni/example.com/http into a base URL.
provider_address_to_url() {
	local address="$1"
	if [[ "$address" =~ ^/(dns|dns4|dns6|ip4)/([A-Za-z0-9.-]+)/tcp/([0-9]{1,5})/(https|tls/http|tls/sni/[A-Za-z0-9.-]+/http)$ ]]; then
		echo "https://${BASH_REMATCH[2]}:${BASH_REMATCH[3]}"
		return 0
	fi
	return 1
}

# Asks cid.contact which providers advertise the CID over the trustless
# HTTP gateway protocol, then fetches the root block directly from them. This
# avoids depending on any public gateway; the block is verified against the
# CID's own digest, so an untrusted provider cannot fake availability.
ipfs_provider_check() {
	local url="$1" routing_status routing_retry_after provider_address provider_url actual_digest
	local -a provider_urls=()
	if ! fetch_endpoint "$url" 30; then
		log "Failed to look up providers for CID '$DIRECTORY_CID' on cid.contact."
		return 1
	fi
	routing_status="$HTTP_STATUS"
	routing_retry_after="$RETRY_AFTER_DELAY"
	while IFS= read -r provider_address; do
		if provider_url="$(provider_address_to_url "$provider_address")"; then
			provider_urls+=("$provider_url")
		fi
	done < <(jq -r '.Providers[]? | select(.Protocols | index("transport-ipfs-gateway-http")) | .Addrs[]?' "$TEMP_DIRECTORY/body" | head -n "$MAX_PROVIDERS")
	if [[ "${#provider_urls[@]}" -eq 0 ]]; then
		log "No HTTP providers found for CID '$DIRECTORY_CID' on cid.contact."
		return 1
	fi
	for provider_url in "${provider_urls[@]}"; do
		if ! fetch_endpoint "${provider_url}/ipfs/${DIRECTORY_CID}?format=raw" 30; then
			log "Failed to fetch root block from provider '$provider_url'."
			continue
		fi
		actual_digest="$(sha256sum "$TEMP_DIRECTORY/body" | awk '{print $1}')"
		if [[ "$actual_digest" == "$EXPECTED_ROOT_DIGEST" ]]; then
			log "Root block of CID '$DIRECTORY_CID' verified on provider '$provider_url'."
			return 0
		fi
		log "Root block digest mismatch on provider '$provider_url' (expected '$EXPECTED_ROOT_DIGEST', got '$actual_digest')."
	done
	# Back off according to the indexer, not the last provider tried.
	HTTP_STATUS="$routing_status"
	RETRY_AFTER_DELAY="$routing_retry_after"
	return 1
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
# The CID is the multibase prefix 'b' plus base32 (without padding) of
# <version><codec><hash>. Only CIDv1 with a single-byte codec and a
# sha2-256 hash is supported, which is what omnipin produces.
CID_BASE32="$(tr 'a-z' 'A-Z' <<<"${DIRECTORY_CID#b}")"
while [[ "$((${#CID_BASE32} % 8))" -ne 0 ]]; do
	CID_BASE32+='='
done
CID_HEX="$(basenc --base32 --decode <<<"$CID_BASE32" | od -An -tx1 -v | tr -d ' \n')"
if [[ ! "$CID_HEX" =~ ^01[0-7][0-9a-f]1220([0-9a-f]{64})$ ]]; then
	log "CID '$DIRECTORY_CID' is not a CIDv1 with a sha2-256 hash; cannot verify provider blocks."
	exit 1
fi
EXPECTED_ROOT_DIGEST="${BASH_REMATCH[1]}"
EXPECTED_SHA="$(sed -E 's#<a href="https://[^"]*cdn-cgi/content\?id=[^"]*"[^>]*></a>##g' "$DEPLOY_DIRECTORY/index.html" | sha256sum | awk '{print $1}')"
TEMP_DIRECTORY="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIRECTORY"' EXIT

# Each endpoint has its own attempt count, backoff, and cooldown. Track the
# waiting budget using the shell's elapsed seconds.
ENDPOINTS=(ipfs-providers "${GATEWAY_FUNCTIONS[@]}")
ENDPOINT_URLS=("https://cid.contact/routing/v1/providers/${DIRECTORY_CID}")
ATTEMPTS=()
BACKOFF_SECONDS=()
NEXT_ATTEMPTS=()
LAST_HTTP_STATUS=()
for GATEWAY_FUNC in "${GATEWAY_FUNCTIONS[@]}"; do
	ENDPOINT_URLS+=("$(gateway_"$GATEWAY_FUNC" "$DIRECTORY_CID")")
done
DEADLINE="$((SECONDS + 600))"
for INDEX in "${!ENDPOINTS[@]}"; do
	ATTEMPTS+=(0)
	BACKOFF_SECONDS+=(10)
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
		if [[ "${ENDPOINTS[$INDEX]}" == ipfs-providers ]]; then
			CHECK_FUNCTION=ipfs_provider_check
		fi
		if "$CHECK_FUNCTION" "${ENDPOINT_URLS[$INDEX]}"; then
			LAST_HTTP_STATUS[$INDEX]="$HTTP_STATUS"
			print_summary
			log 'CID availability verified. Success.'
			exit 0
		fi
		LAST_HTTP_STATUS[$INDEX]="$HTTP_STATUS"
		# Add up to 20% jitter; at the cap, jitter downward to stay within 60s.
		JITTER="$((RANDOM % (BACKOFF_SECONDS[$INDEX] / 5 + 1)))"
		if [[ "${BACKOFF_SECONDS[$INDEX]}" -eq 60 ]]; then
			RETRY_DELAY="$((60 - JITTER))"
		else
			RETRY_DELAY="$((BACKOFF_SECONDS[$INDEX] + JITTER))"
		fi
		if [[ "$RETRY_AFTER_DELAY" -gt "$RETRY_DELAY" ]]; then
			RETRY_DELAY="$RETRY_AFTER_DELAY"
		fi
		NEXT_ATTEMPTS[$INDEX]="$((SECONDS + RETRY_DELAY))"
		BACKOFF_SECONDS[$INDEX]="$((BACKOFF_SECONDS[$INDEX] * 2))"
		if [[ "${BACKOFF_SECONDS[$INDEX]}" -gt 60 ]]; then
			BACKOFF_SECONDS[$INDEX]=60
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
