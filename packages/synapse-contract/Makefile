.PHONY: build test deploy clean

# Build the contract WASM
build:
	stellar contract build

# Run Rust unit tests
test:
	cargo test

# Deploy to Stellar testnet
deploy:
	stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/synapse_contract.wasm \
		--network testnet \
		--source-account default

# Initialize deployed contract (replace CONTRACT_ID, ADMIN, OPERATOR, TOKEN)
init:
	stellar contract invoke \
		--id $(CONTRACT_ID) \
		--network testnet \
		--source-account default \
		-- \
		initialize \
		--admin $(ADMIN) \
		--operator $(OPERATOR) \
		--contributor_share_pct 70 \
		--native_token $(NATIVE_TOKEN)

clean:
	cargo clean
