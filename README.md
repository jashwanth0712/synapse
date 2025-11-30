# Stellar x402 Ecosystem

Complete Stellar implementation of the [x402 payment protocol](https://github.com/coinbase/x402).

## Packages

| Package | Description |
|---------|-------------|
| [`x402-stellar`](./packages/x402-stellar) | Core library with types, schemas, and facilitator client |
| [`x402-stellar-client`](./packages/x402-stellar-client) | Client SDK for signing payments (Keypair + Freighter) |
| [`x402-stellar-fetch`](./packages/x402-stellar-fetch) | Fetch wrapper that auto-pays 402 responses |
| [`x402-stellar-express`](./packages/x402-stellar-express) | Express middleware for protecting routes |
| [`facilitator`](./packages/facilitator) | Stellar x402 facilitator server |

## Quick Start

### For Wallet/dApp Developers (Pay for APIs)

```bash
npm install x402-stellar-fetch
```

```typescript
import { wrapFetchWithPayment } from "x402-stellar-fetch";
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.fromSecret("SXXX...");
const fetchWithPay = wrapFetchWithPayment(fetch, { type: "keypair", keypair });

// Automatically handles 402 Payment Required responses
const response = await fetchWithPay("https://api.example.com/premium");
```

### For API Developers (Charge for APIs)

```bash
npm install x402-stellar-express
```

```typescript
import express from "express";
import { paymentMiddleware } from "x402-stellar-express";

const app = express();

app.use(paymentMiddleware({
  payTo: "GXXXX...",  // Your Stellar address to receive payments
  routes: {
    "/api/premium/*": { price: "1.00" }  // 1 XLM
  },
  facilitator: { url: "http://localhost:4022" },
  // Optional: Enable browser-friendly paywall UI
  paywall: { appName: "My API" },
}));

app.get("/api/premium/data", (req, res) => {
  res.json({ premium: "content" });
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Quick Test (Browser with Freighter)

The easiest way to test everything:

```bash
# 1. Start facilitator (Terminal 1)
cd packages/facilitator
pnpm dev

# 2. Start example server (Terminal 2)
cd examples/server-example
pnpm install  # First time only
pnpm start

# 3. Open in browser
# Visit: http://localhost:3000
# Click any protected endpoint
# Connect Freighter wallet and pay!
```

**Payment Address:** `GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT`

See [examples/README.md](./examples/README.md) for more details.

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

## Architecture

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   CLIENT    │         │ RESOURCE SERVER │         │   FACILITATOR   │
│  (Wallet)   │         │   (API Owner)   │         │                 │
└──────┬──────┘         └────────┬────────┘         └────────┬────────┘
       │                         │                           │
       │ x402-stellar-client     │ x402-stellar-express      │ facilitator
       │ x402-stellar-fetch      │                           │
       │                         │                           │
```

## License

MIT

