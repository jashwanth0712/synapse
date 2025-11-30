# Stellar x402 Examples

Simple, runnable examples to test the Stellar x402 implementation.

## Quick Start (3 Steps)

### Step 1: Start Facilitator

```bash
cd ../packages/facilitator
pnpm dev
```

Wait for: `🚀 x402 Stellar Facilitator running on http://localhost:4022`

### Step 2: Start Example Server

```bash
cd ../examples/server-example
pnpm install  # First time only
pnpm start
```

Wait for: `🚀 Server running at http://localhost:3000`

### Step 3: Test in Browser

1. Open: `http://localhost:3000`
2. Click "Premium Content" (or any protected endpoint)
3. Connect Freighter wallet
4. Pay and access content!

## What You'll Test

✅ **Paywall UI** - Beautiful browser-friendly payment interface  
✅ **Freighter Integration** - Connect and pay with Freighter wallet  
✅ **Settlement Timing** - Payment settles after route succeeds  
✅ **Error Handling** - Proper 402 responses for invalid payments  

## Payment Address

All payments go to: `GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT`

## Examples

- **server-example** - Express server with protected routes (use this for browser testing)
- **client-example** - Programmatic client that auto-pays (for API testing)

## Prerequisites

- Node.js v18+
- pnpm installed
- Freighter wallet extension (for browser testing)
- Stellar testnet account with XLM (fund via friendbot)

## Troubleshooting

See individual example READMEs for detailed troubleshooting.

