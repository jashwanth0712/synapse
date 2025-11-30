# Stellar x402 Example Server

A simple, runnable example server that demonstrates Stellar x402 payments.

## Quick Start

### 1. Start the Facilitator

In a separate terminal, start the facilitator server:

```bash
cd ../../packages/facilitator
pnpm dev
```

The facilitator will run on `http://localhost:4022`

### 2. Start This Server

```bash
# Install dependencies (if not already done)
pnpm install

# Start the server
pnpm start
```

The server will run on `http://localhost:3000`

### 3. Test in Browser

1. Open your browser and go to: `http://localhost:3000`
2. Click on any protected endpoint (e.g., "Premium Content")
3. You'll see the payment UI
4. Connect your Freighter wallet (make sure it's on Stellar Testnet)
5. Approve the payment
6. Access the protected content!

## Payment Address

All payments go to: `GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT`

## Endpoints

### Free Endpoints
- `GET /` - Home page (HTML or JSON)
- `GET /health` - Health check

### Protected Endpoints (Require Payment)
- `GET /api/premium/content` - Premium content (1 XLM)
- `GET /api/premium/stats` - Premium statistics (1 XLM)
- `GET /api/data` - Data API (0.5 XLM)

## Testing

### Browser Testing (Recommended)

1. Make sure Freighter wallet is installed and connected to Stellar Testnet
2. Visit `http://localhost:3000` in your browser
3. Click any protected endpoint
4. The paywall UI will appear
5. Connect Freighter and pay
6. You'll see the protected content!

### Programmatic Testing

Use the client example:

```bash
cd ../client-example
STELLAR_SECRET_KEY=YOUR_SECRET_KEY pnpm start
```

## Troubleshooting

**"ECONNREFUSED" error:**
- Make sure the facilitator is running on port 4022
- Check: `curl http://localhost:4022/health`

**Paywall not showing:**
- Make sure you're accessing via browser (not curl)
- Check browser console for errors
- Verify Freighter is installed

**Payment fails:**
- Make sure your Freighter wallet is on Stellar Testnet
- Ensure you have testnet XLM in your wallet
- Fund your wallet: `curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"`
