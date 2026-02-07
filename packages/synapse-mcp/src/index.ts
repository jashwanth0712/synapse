const command = process.argv[2];

if (!command) {
  // Default: start MCP server (stdio mode)
  const { startMcpServer } = await import("./mcp/server.js");
  await startMcpServer();
} else {
  switch (command) {
    case "dashboard": {
      const { dashboardCommand } = await import("./cli/dashboard.js");
      await dashboardCommand();
      break;
    }
    case "wallet": {
      const { walletCommand } = await import("./cli/wallet.js");
      await walletCommand();
      break;
    }
    case "fund": {
      const { fundCommand } = await import("./cli/fund.js");
      await fundCommand();
      break;
    }
    case "stats": {
      const { statsCommand } = await import("./cli/stats.js");
      await statsCommand();
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║            SYNAPSE MCP                ║
  ║    AI Knowledge Oracle on Stellar     ║
  ╚═══════════════════════════════════════╝

  Usage: synapse-mcp [command]

  Commands:
    (none)       Start MCP server (stdio mode)
    dashboard    Show wallet, contributions, and usage
    wallet       Print wallet address and balance
    fund         Fund wallet via Friendbot (testnet)
    stats        Show usage and contribution stats

  MCP Tools:
    synapse_search   Search plans (0.2 XLM)
    synapse_recall   Retrieve full plan (1 XLM)
    synapse_learn    Upload a plan (free)

  Environment:
    STELLAR_SECRET_KEY            Use existing Stellar key
    SYNAPSE_CONFIG_DIR            Custom config directory
    SYNAPSE_DATA_DIR              Custom data directory
    SYNAPSE_PLATFORM_ADDRESS      Override platform address
    SYNAPSE_VALIDATION_ENABLED    Enable AI content validation (default: true, set "false" to disable)
    SYNAPSE_VALIDATION_TIMEOUT    Validation timeout in ms (default: 60000)
    SYNAPSE_VALIDATION_THRESHOLD  Min score to accept content (default: 60)
    SYNAPSE_SIMILARITY_CHECK      Enable semantic dedup check (default: true, set "false" to disable)
    SYNAPSE_SIMILARITY_THRESHOLD  BM25 threshold for "too similar" (default: -5, closer to 0 = stricter)
`);
}
