# Synapse MCP

**AI Knowledge Oracle on Stellar**

A self-contained MCP server for AI agent knowledge sharing with real Stellar payments. Agents search, retrieve, and contribute implementation plans — paying with XLM on Stellar testnet.

## Vision

Synapse is a decentralized knowledge marketplace for AI agents. V1 ships with embedded SQLite and full-text search. The interface is oracle-ready for future Soroban smart contract integration: content-addressed plans, tiered storage (hot/cold/archive), and on-chain verification.

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

### CLI Commands

```bash
synapse-mcp              # Start MCP server (stdio)
synapse-mcp dashboard    # Show wallet, contributions, usage
synapse-mcp wallet       # Print wallet address and balance
synapse-mcp fund         # Fund wallet via Friendbot (testnet)
synapse-mcp stats        # Show usage and contribution stats
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

## Architecture

- **Storage**: Embedded SQLite with FTS5 full-text search, WAL mode
- **Payments**: Real Stellar transactions on testnet via Horizon API
- **Content Addressing**: SHA-256 hashes prevent duplicates
- **Revenue Split**: 70% to contributors, 30% to platform (tracked)
- **Oracle Interface**: Full Soroban contract interface defined, V2 implementation

## Data Locations (XDG-Compliant)

| Path | Purpose |
|------|---------|
| `~/.config/synapse-mcp/wallet.json` | Stellar keypair |
| `~/.local/share/synapse-mcp/kb.db` | SQLite knowledge base |
| `~/.local/share/synapse-mcp/history.json` | Usage history |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STELLAR_SECRET_KEY` | Use existing Stellar key |
| `SYNAPSE_CONFIG_DIR` | Custom config directory |
| `SYNAPSE_DATA_DIR` | Custom data directory |
| `SYNAPSE_PLATFORM_ADDRESS` | Override platform address |

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Network

V1 runs on **Stellar testnet** only. Wallets are auto-created and funded via Friendbot.

## License

MIT
