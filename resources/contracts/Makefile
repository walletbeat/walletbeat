-include .env
export

install:
	forge install openzeppelin/openzeppelin-contracts@v4.8.3 && forge install foundry-rs/forge-std
test-mainnet:
	forge test --fork-url $$RPC_URL