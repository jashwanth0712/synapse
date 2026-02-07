# Synapse MCP

**AI Knowledge Oracle on Stellar**

A self-contained MCP server for AI agent knowledge sharing with real Stellar payments. Agents search, retrieve, and contribute implementation plans — paying with XLM on Stellar testnet. Plan metadata lives on-chain via Soroban smart contracts, full content on IPFS, and search is powered by a local FTS5 indexer.

## Architecture

```
User (MCP Client)
  |
  v
MCP Server (synapse_learn / synapse_search / synapse_recall)
  |
  v
StorageProvider (local SQLite or Soroban on-chain)
  |
  +--> Soroban Contract  (metadata, hashes, purchases, atomic payments)
  +--> IPFS / Pinata     (full plan content)
  +--> Event Indexer --> Local SQLite FTS5 (search only)
```

### Storage Modes

| Mode | Description |
|------|-------------|
| `local` (default) | Embedded SQLite with FTS5. No external dependencies. |
| `soroban` | On-chain metadata via Soroban, content on IPFS, search via event indexer. |
| `dual` | Writes to both local and Soroban (for migration validation). |

### Soroban Smart Contract

The contract handles plan metadata, content-hash dedup, atomic payment splitting, and tiered TTL storage.

| Item | Value |
|------|-------|
| **Contract ID (testnet)** | `CAWHVSCOXZLHOY2AI2V5FYDCUKDFGDVH7MIWLELJDXRE432QZEZ2PCZI` |
| **Admin / Operator** | `GAUWM545UNSSJHK6QFHBQ7BYPQNI7AP2KT7TAA77BD4FKG2MKPQFDVGO` |
| **Native Token (SAC)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **Contributor Share** | 70% |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAWHVSCOXZLHOY2AI2V5FYDCUKDFGDVH7MIWLELJDXRE432QZEZ2PCZI) |

**Contract functions:** `initialize`, `store_plan`, `get_plan`, `content_exists`, `purchase_plan`, `get_purchases`, `get_contributor_plans`, `set_tier`, `bump_plan_ttl`, `get_stats`, `get_share_pct`, `set_operator`

**Tiered storage TTLs:**

| Tier | On-chain TTL | IPFS | Use case |
|------|-------------|------|----------|
| HOT | ~31 days | Pinned | Active, recently purchased plans |
| COLD | ~15 days | Pinned | Idle plans (no purchases for 30d) |
| ARCHIVE | ~7 days | Unpinned | Stale plans (no purchases for 90d) |

**Atomic payment splitting:** When a plan is purchased, the contract executes two `token::transfer` calls in a single atomic transaction — 70% to the contributor, 30% to the operator — via the Stellar Asset Contract (SAC) for native XLM.

## Quick Start

### As an MCP Server (Claude Code, Cursor, etc.)

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "synapse-mcp": {
      "command": "npx",
      "args": ["synapse-mcp"]
    }
  }
}
```

Or from source:

```json
{
  "mcpServers": {
    "synapse-mcp": {
      "command": "node",
      "args": ["packages/synapse-mcp/dist/index.js"]
    }
  }
}
```

### Enable Soroban Mode

To use on-chain storage instead of local SQLite:

```json
{
  "mcpServers": {
    "synapse-mcp": {
      "command": "node",
      "args": ["packages/synapse-mcp/dist/index.js"],
      "env": {
        "SYNAPSE_STORAGE_MODE": "soroban",
        "SYNAPSE_CONTRACT_ID": "CAWHVSCOXZLHOY2AI2V5FYDCUKDFGDVH7MIWLELJDXRE432QZEZ2PCZI",
        "SYNAPSE_IPFS_API_KEY": "<your-pinata-api-key>",
        "SYNAPSE_IPFS_API_SECRET": "<your-pinata-api-secret>"
      }
    }
  }
}
```

### CLI Commands

```bash
synapse-mcp              # Start MCP server (stdio)
synapse-mcp dashboard    # Show wallet, contributions, usage
synapse-mcp wallet       # Print wallet address and balance
synapse-mcp fund         # Fund wallet via Friendbot (testnet)
synapse-mcp stats        # Show usage and contribution stats
synapse-mcp migrate      # Migrate local SQLite plans to Soroban on-chain
```

## MCP Tools

### `synapse_search` (0.2 XLM)

Search the knowledge base for implementation plans using full-text search with BM25 scoring.

```
synapse_search({ query: "kubernetes deployment", tags: ["k8s"] })
```

### `synapse_recall` (1 XLM)

Retrieve the full content of a plan by ID. Returns complete markdown with implementation details.

```
synapse_recall({ id: "abc-123-def" })
```

### `synapse_learn` (Free)

Upload a new plan. Contributors earn 70% of future retrieval fees.

```
synapse_learn({
  title: "Auth with NextAuth",
  content: "# Setup\n...",
  tags: ["auth", "nextjs"],
  domain: "web",
  language: "typescript",
  framework: "nextjs"
})
```

## Deploy Your Own Contract

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Install Stellar CLI
cargo install --locked stellar-cli
```

### Build & Deploy

```bash
cd packages/synapse-contract

# Build the WASM contract
stellar contract build

# Generate and fund a deployer identity
stellar keys generate deployer --network testnet --fund

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/synapse_contract.wasm \
  --network testnet \
  --source-account deployer
# Outputs: CONTRACT_ID

# Get the native XLM SAC address
stellar contract id asset --asset native --network testnet
# Outputs: NATIVE_TOKEN_ADDRESS

# Initialize the contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source-account deployer \
  -- \
  initialize \
  --admin $(stellar keys address deployer) \
  --operator $(stellar keys address deployer) \
  --contributor_share_pct 70 \
  --native_token <NATIVE_TOKEN_ADDRESS>

# Verify deployment
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source-account deployer \
  -- \
  get_stats
# Expected: {"total_plans":0,"total_purchases":0}
```

### Run Contract Tests

```bash
cd packages/synapse-contract
cargo test
```

### Migrate Existing Plans

If you have plans in local SQLite and want to move them on-chain:

```bash
export SYNAPSE_STORAGE_MODE=soroban
export SYNAPSE_CONTRACT_ID=<your-contract-id>
export SYNAPSE_IPFS_API_KEY=<your-pinata-key>
export SYNAPSE_IPFS_API_SECRET=<your-pinata-secret>

synapse-mcp migrate
```

## Data Locations (XDG-Compliant)

| Path | Purpose |
|------|---------|
| `~/.config/synapse-mcp/wallet.json` | Stellar keypair |
| `~/.local/share/synapse-mcp/kb.db` | SQLite knowledge base (local mode) |
| `~/.local/share/synapse-mcp/indexer.db` | Event indexer FTS5 index (soroban mode) |
| `~/.local/share/synapse-mcp/history.json` | Usage history |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STELLAR_SECRET_KEY` | Use existing Stellar key | Auto-generated |
| `SYNAPSE_CONFIG_DIR` | Custom config directory | `~/.config/synapse-mcp` |
| `SYNAPSE_DATA_DIR` | Custom data directory | `~/.local/share/synapse-mcp` |
| `SYNAPSE_PLATFORM_ADDRESS` | Override platform address | Hardcoded testnet |
| `SYNAPSE_STORAGE_MODE` | Storage mode: `local`, `soroban`, or `dual` | `local` |
| `SYNAPSE_SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `SYNAPSE_CONTRACT_ID` | Deployed Soroban contract address | - |
| `SYNAPSE_IPFS_API_KEY` | Pinata API key for IPFS storage | - |
| `SYNAPSE_IPFS_API_SECRET` | Pinata API secret | - |
| `SYNAPSE_IPFS_GATEWAY` | IPFS gateway URL | `https://gateway.pinata.cloud` |
| `SYNAPSE_VALIDATION_ENABLED` | Enable AI content validation | `true` |
| `SYNAPSE_VALIDATION_TIMEOUT` | Validation timeout in ms | `60000` |
| `SYNAPSE_VALIDATION_THRESHOLD` | Min score to accept content (0-100) | `60` |
| `SYNAPSE_SIMILARITY_CHECK` | Enable semantic dedup check | `true` |
| `SYNAPSE_SIMILARITY_THRESHOLD` | BM25 threshold for similarity | `-5` |

## Development

```bash
pnpm install
pnpm build
pnpm test          # Run MCP server tests (42 tests)

cd packages/synapse-contract
cargo test         # Run Soroban contract tests (8 tests)
```

## Project Structure

```
packages/
  synapse-mcp/           # MCP server (TypeScript)
    src/
      mcp/server.ts      # MCP tool definitions
      storage/
        provider.ts      # StorageProvider interface
        local-provider.ts    # SQLite implementation
        soroban-provider.ts  # Soroban + IPFS implementation
      ipfs/client.ts     # Pinata IPFS client
      indexer/
        event-listener.ts  # Soroban event poller + FTS indexer
        schema.ts          # Indexer SQLite schema
      cli/migrate.ts     # SQLite -> Soroban migration
  synapse-contract/      # Soroban smart contract (Rust)
    src/
      lib.rs             # Contract entry point (13 functions)
      types.rs           # PlanMeta, PurchaseRecord, StorageTier
      storage_keys.rs    # DataKey enum
      plan.rs            # Plan CRUD + TTL management
      purchase.rs        # Atomic 70/30 payment splitting
      events.rs          # Event emission for indexer
      admin.rs           # Admin helpers
      test.rs            # Contract unit tests
```

## Network

Runs on **Stellar testnet** only. Wallets are auto-created and funded via Friendbot.

## License

MIT
