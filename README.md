# Synapse MCP

**AI Knowledge Oracle on Stellar**

A self-contained MCP server for AI agent knowledge sharing with real Stellar payments. Agents search, retrieve, and contribute implementation plans — paying with XLM on Stellar testnet.

See [`packages/synapse-mcp/README.md`](packages/synapse-mcp/README.md) for full documentation.

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

### Use as MCP Server

Add to `.mcp.json`:

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

### CLI

```bash
node packages/synapse-mcp/dist/index.js fund       # Fund testnet wallet
node packages/synapse-mcp/dist/index.js wallet     # Check balance
node packages/synapse-mcp/dist/index.js dashboard  # Full dashboard
```

## License

MIT
