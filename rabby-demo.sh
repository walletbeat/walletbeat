#!/bin/bash

for flow in INSTALL ONBOARDING_NEW ONBOARDING_IMPORT SEND_ETHER SEND_USDC NATIVE_SWAP MAKE_TRANSACTION IDLE_PRE_INSTALL; do
	pnpm wallet-data-collection --id=rabby --variant=BROWSER mark-flow-unsupported --flow="$flow"
done

# Filter requests: keep only is_verified and total_balance
FILE="data/software-wallets/collection/rabby/rabby.browser.capture.json"
jq '.flows.APP_CONNECTION.requests |= map(select(.path == "/v1/engine/origin/is_verified" or .path == "/v1/user/total_net_curve"))' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"


# pnpm wallet-data-collection --id=rabby --variant=browser check
# pnpm wallet-data-collection --id=rabby --variant=browser capture --flow=APP_CONNECTION
# pnpm wallet-data-collection --id=rabby --variant=browser review-strings
# pnpm wallet-data-collection --id=rabby --variant=browser mark-string --string=app.uniswap.org --data=WALLET_CONNECTED_DOMAINS
# pnpm wallet-data-collection --id=rabby --variant=browser mark-string --string=0x...--data=ACCOUNT_ADDRESS
