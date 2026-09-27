#!/bin/bash

set -euo pipefail
set +x

GATEWAYS=(
	dweb.link
	w3s.link
	nftstorage.link
)

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

ping_gateway() {
	local url="$1"
	local expected_sha actual_sha
	expected_sha="$(sed -E 's#<a href="https://[^"]*cdn-cgi/content\?id=[^"]*"[^>]*></a>##g' "$DEPLOY_DIRECTORY/index.html" | sha256sum | awk '{print $1}')"
	if ! actual_sha="$(curl --fail --location --silent --show-error --max-time 15 "$url" | sed -E 's#<a href="https://[^"]*cdn-cgi/content\?id=[^"]*"[^>]*></a>##g' | sha256sum | awk '{print $1}')"; then
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Failed to fetch content from '$url'." >&2
		return 1
	fi
	if [[ "$actual_sha" != "$expected_sha" ]]; then
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Content hash mismatch for '$url' (expected '$expected_sha', got '$actual_sha')." >&2
		return 1
	fi
	echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Content verified on '$url'."
}

ipfs_check_cid() {
	local cid="$1"
	local url
	if [[ ! "$cid" =~ ^[a-z2-7]+$ ]]; then
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] CID '$cid' is not base32-lowercase alphanumeric; refusing to build check URL." >&2
		return 1
	fi
	url="https://ipfs-check-backend.ipfs.io/check?cid=${cid}&multiaddr=&ipniIndexer=https%3A%2F%2Fcid.contact&timeoutSeconds=30&httpRetrieval=on"
	if ! curl --fail --silent --show-error --max-time 40 "$url" | jq -e '([.[] | select(.DataAvailableOverBitswap.Found == true)] | length) >= 1 and ([.[] | select(.DataAvailableOverHTTP.Found == true)] | length) >= 1' >/dev/null; then
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] CID '$cid' not reported as available by the IPFS check service." >&2
		return 1
	fi
	echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] CID '$cid' reported as available by the IPFS check service."
}

if [[ -z "${DEPLOY_DIRECTORY:-}" ]]; then
	echo 'Missing DEPLOY_DIRECTORY' >&2
	exit 1
fi

DIRECTORY_CID="$(pnpm omnipin pack --only-hash "$DEPLOY_DIRECTORY")"
DEADLINE="$(("$(date +%s)" + 600))"
ONE_GOOD_GATEWAY=false
while true; do
	ALL_GOOD_GATEWAYS=true
	for GATEWAY_FUNC in "${GATEWAY_FUNCTIONS[@]}"; do
		GATEWAY_URL="$(gateway_"$GATEWAY_FUNC" "$DIRECTORY_CID")"
		echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Trying to ping CID '$DIRECTORY_CID' on gateway '$GATEWAY_FUNC' at '$GATEWAY_URL'..." >&2
		if ping_gateway "$GATEWAY_URL"; then
			ONE_GOOD_GATEWAY=true
		else
			ALL_GOOD_GATEWAYS=false
		fi
	done
	echo "[$(date '+%+4Y-%m-%d %H:%M:%S')] Checking CID availability on the IPFS check service..." >&2
	if ipfs_check_cid "$DIRECTORY_CID"; then
		ONE_GOOD_GATEWAY=true
		break
	else
		ALL_GOOD_GATEWAYS=false
	fi
	if [[ "$ALL_GOOD_GATEWAYS" == true ]]; then
		echo "All gateways have the data. Success". >&2
		exit 0
	fi
	if [[ "$DEADLINE" -lt "$(date +%s)" ]]; then
		break
	fi
done
if [[ "$ONE_GOOD_GATEWAY" == false ]]; then
	echo "Failed to refresh any gateway. Failure." >&2
	exit 1
fi
echo 'At least one gateway has the data. Considering this a success'. >&2
exit 0
