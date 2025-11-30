# Testing Guide for Stellar x402

This guide walks you through testing the complete stellar-x402 implementation, including all the fixes and new features.

## Prerequisites

1. **Node.js v18+** and **pnpm** installed
2. **Two Stellar testnet accounts** (one for client, one for server)
3. **Redis** (optional - facilitator works without it using in-memory storage)

## Step 1: Setup Stellar Testnet Accounts

### Generate Test Accounts

```bash
# Generate a keypair for the server (merchant)
node -e "const { Keypair } = require('@stellar/stellar-sdk'); const kp = Keypair.random(); console.log('Server Public:', kp.publicKey()); console.log('Server Secret:', kp.secret());"

# Generate a keypair for the client (payer)
node -e "const { Keypair } = require('@stellar/stellar-sdk'); const kp = Keypair.random(); console.log('Client Public:', kp.publicKey()); console.log('Client Secret:', kp.secret());"
```

### Fund Test Accounts

Fund both accounts on Stellar testnet using the friendbot:

```bash
# Fund server account
curl "https://friendbot.stellar.org?addr=YOUR_SERVER_PUBLIC_KEY"

# Fund client account
curl "https://friendbot.stellar.org?addr=YOUR_CLIENT_PUBLIC_KEY"
```

## Step 2: Build All Packages

```bash
cd /Users/imertkaradayi/Development/personal-projects/stellar-x402
pnpm install
pnpm build
```

## Step 3: Start the Facilitator Server

Open a terminal and start the facilitator:

```bash
cd packages/facilitator

# Copy environment file (optional - works without .env)
cp env.example.local .env

# Edit .env if you want to customize:
# - PORT (default: 4022)
# - FACILITATOR_SECRET_KEY (optional, for fee sponsorship)
# - REDIS_URL (optional, for persistence)

# Start the facilitator
pnpm dev
```

You should see:
```
🚀 x402 Stellar Facilitator running on http://localhost:4022
   GET  /supported            - List supported schemes/networks
   POST /verify               - Verify payment
   POST /settle               - Settle payment
   GET  /discovery/resources  - List discoverable resources
   POST /discovery/resources  - Register a resource
   DEL  /discovery/resources  - Unregister a resource
```

### Test Facilitator Endpoints

In another terminal, test the facilitator:

```bash
# Check health
curl http://localhost:4022/health

# Check supported networks
curl http://localhost:4022/supported

# List discovery resources (should be empty initially)
curl http://localhost:4022/discovery/resources
```

## Step 4: Start the Example Server

Open a **new terminal** and start the example server:

```bash
cd examples/server-example

# Edit src/index.ts and set your SERVER_PUBLIC_KEY
# Replace PAY_TO with your server's public key

# Start the server
pnpm start
```

You should see:
```
🚀 Server running at http://localhost:3000
💰 Payments go to: GXXXX...
📡 Facilitator: http://localhost:4022
```

### Test Server Without Payment (Should Return 402)

```bash
# This should return 402 Payment Required
curl http://localhost:3000/api/premium/content
```

You should get a JSON response with payment requirements.

## Step 5: Test Browser Paywall UI

Open your browser and navigate to:
```
http://localhost:3000/api/premium/content
```

You should see:
- ✅ A beautiful paywall UI with Stellar branding
- ✅ Payment amount displayed (1 XLM)
- ✅ "Connect Freighter Wallet" button
- ✅ Network indicator (Stellar Testnet)

**Note:** To test the full paywall flow, you'll need:
1. Freighter wallet extension installed in your browser
2. Freighter connected to Stellar testnet
3. Testnet XLM in your Freighter wallet

## Step 6: Test Programmatic Client

Open a **new terminal** and run the client example:

```bash
cd examples/client-example

# Set your client secret key
export STELLAR_SECRET_KEY="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Run the client
pnpm start
```

The client will:
1. Automatically detect the 402 response
2. Create a payment transaction
3. Sign it with your keypair
4. Retry the request with the X-PAYMENT header
5. Display the successful response

You should see:
```
✅ Success! Received data:
{
  "message": "🎉 You paid for premium content!",
  ...
}

💰 Payment details:
{"success":true,"transaction":"abc123...","network":"stellar-testnet",...}
```

## Step 7: Test Discovery API

### Register a Resource

```bash
curl -X POST http://localhost:4022/discovery/resources \
  -H "Content-Type: application/json" \
  -d '{
    "resource": "http://localhost:3000/api/premium/content",
    "type": "http",
    "x402Version": 1,
    "accepts": [{
      "scheme": "exact",
      "network": "stellar-testnet",
      "maxAmountRequired": "10000000",
      "resource": "http://localhost:3000/api/premium/content",
      "description": "Premium API access",
      "mimeType": "application/json",
      "payTo": "YOUR_SERVER_PUBLIC_KEY",
      "maxTimeoutSeconds": 300,
      "asset": "native"
    }],
    "lastUpdated": '$(date +%s)',
    "metadata": {
      "category": "api",
      "provider": "Test Provider"
    }
  }'
```

### List Resources

```bash
# List all resources
curl http://localhost:4022/discovery/resources

# List with pagination
curl "http://localhost:4022/discovery/resources?limit=10&offset=0"

# Filter by type
curl "http://localhost:4022/discovery/resources?type=http"
```

### Test Client Discovery

```typescript
import { useFacilitator } from "x402-stellar";

const { list } = useFacilitator({ url: "http://localhost:4022" });

const resources = await list({ limit: 10 });
console.log(resources);
```

## Step 8: Verify Critical Fixes

### Test Settlement Timing Fix

The middleware now settles **AFTER** the route handler succeeds. To verify:

1. **Create a test route that might fail:**

```typescript
app.get("/api/test-error", (req, res) => {
  res.status(500).json({ error: "Server error" });
});
```

2. **Make a payment request to this endpoint:**
   - Payment should be **verified** but **NOT settled** (because route returned 500)
   - Check facilitator logs - no settlement transaction should appear

3. **Make a payment request to a successful endpoint:**
   - Payment should be **verified AND settled**
   - Check facilitator logs - settlement transaction should appear

### Test Response Buffering

The middleware buffers responses until settlement completes. Verify:
- Response headers (including `X-PAYMENT-RESPONSE`) are set correctly
- Response body is sent only after settlement succeeds
- If settlement fails, a 402 error is returned instead of the buffered response

## Step 9: Test Error Scenarios

### Invalid Payment Header

```bash
curl http://localhost:3000/api/premium/content \
  -H "X-PAYMENT: invalid-base64"
```

Should return 402 with error message.

### Insufficient Balance

Use a client account with no XLM:
- Should return 402 with `insufficient_funds` error

### Expired Transaction

Create a transaction with `validUntilLedger` in the past:
- Should return 402 with `payment_expired` error

## Step 10: Integration Test Checklist

- [ ] Facilitator starts successfully
- [ ] Server starts and protects routes
- [ ] Client can pay and access protected routes
- [ ] Browser shows paywall UI (if Freighter installed)
- [ ] Discovery API lists/registers resources
- [ ] Settlement happens AFTER route succeeds (not before)
- [ ] Failed routes don't trigger settlement
- [ ] Payment response header is set correctly
- [ ] Error responses are handled correctly

## Troubleshooting

### "ECONNREFUSED" errors
- Make sure facilitator is running on port 4022
- Make sure server is running on port 3000

### "Invalid secret key" errors
- Verify your secret key starts with `S`
- Make sure it's a valid Stellar keypair

### "Insufficient funds" errors
- Fund your test account: `curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"`
- Check balance: `curl "https://horizon-testnet.stellar.org/accounts/YOUR_PUBLIC_KEY"`

### Paywall not showing in browser
- Check browser console for errors
- Verify `Accept: text/html` header is sent
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Redis connection errors
- Redis is optional - facilitator works without it
- If you want Redis, install and start it: `redis-server`
- Or remove `REDIS_URL` from `.env` to use in-memory storage

## Next Steps

Once basic testing passes:

1. **Test with Freighter wallet** in browser
2. **Test with multiple concurrent requests**
3. **Test with different payment amounts**
4. **Test with Soroban tokens** (if applicable)
5. **Load test** the facilitator
6. **Test on Stellar mainnet** (with real XLM)

## Quick Test Script

Save this as `test.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Stellar x402..."

# Test facilitator health
echo "1. Testing facilitator..."
curl -s http://localhost:4022/health | grep -q "ok" && echo "✅ Facilitator healthy" || echo "❌ Facilitator down"

# Test server 402 response
echo "2. Testing server 402 response..."
curl -s http://localhost:3000/api/premium/content | grep -q "Payment Required" && echo "✅ Server returns 402" || echo "❌ Server not working"

# Test discovery API
echo "3. Testing discovery API..."
curl -s http://localhost:4022/discovery/resources | grep -q "x402Version" && echo "✅ Discovery API works" || echo "❌ Discovery API failed"

echo "✅ Basic tests complete!"
```

Run with: `chmod +x test.sh && ./test.sh`

