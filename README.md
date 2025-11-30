# Stellar x402 Ecosystem

> Complete Stellar implementation of the [x402 payment protocol](https://github.com/coinbase/x402).  
> "1 line of code to accept digital dollars on Stellar. No fees, 2-second settlement, $0.001 minimum payment."

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## What is x402?

The [x402 payment protocol](https://github.com/coinbase/x402) is an open standard for internet-native payments that leverages the existing `402 Payment Required` HTTP status code. It enables:

- **Chain-agnostic payments** - Works across different blockchains
- **Gasless for clients** - Facilitators can sponsor transaction fees
- **Minimal integration** - 1 line for servers, 1 function for clients
- **Low minimums** - Support for micropayments ($0.001+)
- **Fast settlement** - 2-5 second confirmation times

## What Makes Stellar x402 Different?

This implementation brings x402 to the **Stellar network**, offering unique advantages:

### 🚀 **Ultra-Fast Settlement**
- **2-5 second confirmation** - Stellar's consensus protocol enables near-instant finality
- **Ledger-based expiry** - Transactions expire based on ledger sequence, not block height or timestamps
- **No gas wars** - Fixed, predictable transaction fees

### 💰 **True Gasless Payments**
- **Fee sponsorship via fee-bump** - Facilitators can pay transaction fees on behalf of clients
- **Trust-minimized** - Client's signed transaction is never modified; only fee payer changes
- **Optional fee sponsorship** - Works with or without facilitator fee sponsorship

### 🔐 **Native Stellar Features**
- **XDR transaction format** - Uses Stellar's native XDR (eXternal Data Representation) for transactions
- **Built-in replay protection** - Stellar's sequence numbers prevent transaction replay at protocol level
- **Native XLM support** - Direct XLM payments without token contracts
- **Soroban token support** - Ready for Stellar Asset Contracts (SAC) when needed

### 🌐 **Browser-First Experience**
- **Freighter wallet integration** - Seamless browser payments with the most popular Stellar wallet
- **Beautiful paywall UI** - Pre-built, responsive payment interface for web apps
- **No RPC required** - Clients don't need direct blockchain access

### 📦 **Complete Ecosystem**
- **5 specialized packages** - Modular architecture for different use cases
- **100% x402 compliant** - Fully compatible with the x402 specification
- **Type-safe** - Full TypeScript support with Zod validation

### Comparison with Other x402 Implementations

| Feature | EVM (Coinbase) | Stellar (Ours) |
|---------|---------------|---------------|
| **Transaction Format** | Signature-based | XDR (signed transaction) |
| **Fee Sponsorship** | Meta-transactions | Fee-bump transactions |
| **Settlement Time** | ~12 seconds | **2-5 seconds** |
| **Expiry Mechanism** | Timestamp (`validBefore`) | Ledger sequence (`validUntilLedger`) |
| **Native Asset** | Requires ERC-20 | **Native XLM** |
| **Replay Protection** | Nonce-based | **Sequence numbers** (protocol-level) |
| **Browser Wallet** | MetaMask | **Freighter** |

## Packages

| Package | Description | Use Case |
|---------|-------------|----------|
| [`x402-stellar`](./packages/x402-stellar) | Core library with types, schemas, and facilitator client | Building custom integrations |
| [`x402-stellar-client`](./packages/x402-stellar-client) | Client SDK for signing payments (Keypair + Freighter) | Client applications |
| [`x402-stellar-fetch`](./packages/x402-stellar-fetch) | Fetch wrapper that auto-pays 402 responses | Simple client integrations |
| [`x402-stellar-express`](./packages/x402-stellar-express) | Express middleware for protecting routes | Node.js/Express servers |
| [`facilitator`](./packages/facilitator) | Stellar x402 facilitator server | Payment verification & settlement |

## Quick Start

### For Wallet/dApp Developers (Pay for APIs)

Install the fetch wrapper:

```bash
npm install x402-stellar-fetch @stellar/stellar-sdk
```

**With Keypair (Backend/Scripts):**

```typescript
import { wrapFetchWithPayment, createKeypairSigner } from "x402-stellar-fetch";
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.fromSecret("SXXX...");
const signer = createKeypairSigner(keypair);
const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// Automatically handles 402 Payment Required responses
const response = await fetchWithPay("https://api.example.com/premium");
const data = await response.json();
```

**With Freighter (Browser):**

```typescript
import { wrapFetchWithPayment, createFreighterSigner } from "x402-stellar-fetch";

const signer = createFreighterSigner();
const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// Freighter will prompt user to approve payment
const response = await fetchWithPay("https://api.example.com/premium");
```

### For API Developers (Charge for APIs)

Install the Express middleware:

```bash
npm install x402-stellar-express express
```

```typescript
import express from "express";
import { paymentMiddleware } from "x402-stellar-express";

const app = express();

// Protect routes with payments - that's it!
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

app.listen(3000);
```

## Architecture

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   CLIENT    │         │ RESOURCE SERVER │         │   FACILITATOR   │
│  (Wallet)   │         │   (API Owner)   │         │                 │
└──────┬──────┘         └────────┬────────┘         └────────┬────────┘
       │                         │                           │
       │ 1. Request              │                           │
       ├────────────────────────>│                           │
       │                         │                           │
       │ 2. 402 Payment Required  │                           │
       │<────────────────────────┤                           │
       │                         │                           │
       │ 3. Sign payment (XDR)   │                           │
       │    with Freighter/      │                           │
       │    Keypair              │                           │
       │                         │                           │
       │ 4. Request + X-PAYMENT   │                           │
       ├────────────────────────>│                           │
       │                         │                           │
       │                         │ 5. Verify payment         │
       │                         ├──────────────────────────>│
       │                         │                           │
       │                         │ 6. Verification result     │
       │                         │<──────────────────────────┤
       │                         │                           │
       │                         │ 7. Serve content          │
       │                         │                           │
       │                         │ 8. Settle payment         │
       │                         ├──────────────────────────>│
       │                         │                           │
       │                         │ 9. Submit to Stellar      │
       │                         │    (with optional         │
       │                         │     fee-bump)             │
       │                         │                           │
       │                         │ 10. Settlement result      │
       │                         │<──────────────────────────┤
       │                         │                           │
       │ 11. 200 OK + Content    │                           │
       │     + X-PAYMENT-RESPONSE │                           │
       │<────────────────────────┤                           │
       │                         │                           │
```

## Development

### Prerequisites

- **Node.js** v18 or higher
- **pnpm** v8 or higher
- **Stellar testnet account** (fund via [friendbot](https://friendbot.stellar.org))

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/stellar-x402.git
cd stellar-x402

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Running Examples

The easiest way to test everything:

```bash
# Terminal 1: Start facilitator
cd packages/facilitator
pnpm dev

# Terminal 2: Start example server
cd examples/server-example
pnpm install  # First time only
pnpm start

# Terminal 3: Open in browser
# Visit: http://localhost:3000
# Click any protected endpoint
# Connect Freighter wallet and pay!
```

**Payment Address:** `GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT`

See [examples/README.md](./examples/README.md) for more details.

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

## Protocol Compliance

This implementation is **100% compliant** with the [x402 specification](https://github.com/coinbase/x402/blob/main/specs/x402-specification.md):

- ✅ All facilitator endpoints (`/verify`, `/settle`, `/supported`)
- ✅ Payment payload and requirements schemas
- ✅ Error codes and response formats
- ✅ Replay protection and idempotency
- ✅ Trust-minimized payment flows

See [packages/facilitator/X402_COMPLIANCE_STATUS.md](./packages/facilitator/X402_COMPLIANCE_STATUS.md) for detailed compliance documentation.

## Key Features

### 🔒 **Security**
- **Trust-minimized** - Facilitators cannot move funds without client signatures
- **Replay protection** - Redis-backed transaction hash tracking
- **Idempotency** - Cached settlement results prevent duplicate payments
- **Zod validation** - Type-safe request/response validation

### ⚡ **Performance**
- **Fast settlement** - 2-5 second confirmation on Stellar
- **Optional fee sponsorship** - Gasless payments for clients
- **Efficient verification** - Local and remote verification support
- **Response buffering** - Settles payments after route success

### 🎨 **Developer Experience**
- **TypeScript first** - Full type safety and IntelliSense
- **Modular packages** - Use only what you need
- **Beautiful paywall** - Pre-built UI for web applications
- **Comprehensive examples** - Browser and programmatic clients

### 🌍 **Ecosystem**
- **Freighter integration** - Most popular Stellar wallet
- **Express middleware** - Drop-in payment protection
- **Fetch wrapper** - Automatic payment handling
- **Discovery API** - Resource registration and discovery

## Network Support

Currently supported networks:

- ✅ **Stellar Testnet** (`stellar-testnet`)
- 🚧 **Stellar Mainnet** (`stellar-mainnet`) - Coming soon

## Contributing

Contributions are welcome! Please see our contributing guidelines for details.

## License

MIT

---

**Built with ❤️ for the Stellar ecosystem**
