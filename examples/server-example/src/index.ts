/**
 * Example Express server protected with x402 payments
 *
 * Run with: pnpm start
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { paymentMiddleware } from "x402-stellar-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files (for test pages)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Stellar address to receive payments
const PAY_TO = "GC63PSERYMUUUJKYSSFQ7FKRAU5UPIP3XUC6X7DLMZUB7SSCPW5BSIRT";

// Add x402 payment middleware
app.use(
  paymentMiddleware({
    payTo: PAY_TO,
    routes: {
      // Protect /api/premium/* routes - costs 1 XLM
      "/api/premium/*": {
        price: "1.00",
        description: "Premium API access",
      },
      // Protect /api/data route - costs 0.5 XLM
      "/api/data": {
        price: "0.50",
        description: "Access to data endpoint",
      },
    },
    // Point to your facilitator (run locally or use hosted)
    facilitator: {
      url: "http://localhost:4022",
    },
    // Use testnet for development
    network: "stellar-testnet",
    // Optional: Enable browser-friendly paywall UI
    paywall: {
      appName: "Example API",
      debug: true, // Enable debug logging panel
    },
  })
);

// Protected routes
app.get("/api/premium/content", (req, res) => {
  res.json({
    message: "🎉 You paid for premium content!",
    data: {
      secret: "This is premium data",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/api/premium/stats", (req, res) => {
  res.json({
    message: "Premium statistics",
    stats: {
      users: 1234,
      revenue: 5678,
    },
  });
});

app.get("/api/data", (req, res) => {
  res.json({
    message: "You paid for data access!",
    data: [1, 2, 3, 4, 5],
  });
});

// Free routes (no payment required)
app.get("/", (req, res) => {
  // Serve a simple HTML page for browser testing
  if (req.get("Accept")?.includes("text/html")) {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stellar x402 Example</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      background: rgba(26, 26, 46, 0.8);
      border: 1px solid #2d2d44;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 32px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #7c3aed, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p { margin-bottom: 24px; color: #a0aec0; line-height: 1.6; }
    .endpoints {
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid #2d2d44;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .endpoints h2 {
      font-size: 18px;
      margin-bottom: 16px;
      color: #7c3aed;
    }
    .endpoint {
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .endpoint a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
    .endpoint a:hover {
      text-decoration: underline;
    }
    .price {
      color: #10b981;
      font-weight: 600;
    }
    .note {
      background: rgba(59, 130, 246, 0.1);
      border-left: 3px solid #3b82f6;
      padding: 16px;
      border-radius: 8px;
      margin-top: 24px;
    }
    .note strong { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌟 Stellar x402 Example</h1>
    <p>Welcome! This is a demo server protected with Stellar x402 payments.</p>
    
    <div class="endpoints">
      <h2>Free Endpoints</h2>
      <div class="endpoint">
        <a href="/">Home</a>
        <span style="color: #10b981;">Free</span>
      </div>
      <div class="endpoint">
        <a href="/health">Health Check</a>
        <span style="color: #10b981;">Free</span>
      </div>
    </div>

    <div class="endpoints">
      <h2>Protected Endpoints (Require Payment)</h2>
      <div class="endpoint">
        <a href="/api/premium/content">Premium Content</a>
        <span class="price">1 XLM</span>
      </div>
      <div class="endpoint">
        <a href="/api/premium/stats">Premium Stats</a>
        <span class="price">1 XLM</span>
      </div>
      <div class="endpoint">
        <a href="/api/data">Data API</a>
        <span class="price">0.5 XLM</span>
      </div>
    </div>

    <div class="note">
      <strong>💡 How to Test:</strong><br>
      1. Click any protected endpoint above<br>
      2. You'll see a payment UI (if Freighter is installed)<br>
      3. Connect your Freighter wallet<br>
      4. Approve the payment<br>
      5. Access the protected content!
    </div>
  </div>
</body>
</html>
    `);
  } else {
    res.json({
      message: "Welcome to the x402 example server!",
      endpoints: {
        free: ["GET /", "GET /health"],
        paid: [
          "GET /api/premium/content (1 XLM)",
          "GET /api/premium/stats (1 XLM)",
          "GET /api/data (0.5 XLM)",
        ],
      },
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`💰 Payments go to: ${PAY_TO}`);
  console.log(`📡 Facilitator: http://localhost:4022`);
  console.log("");
  console.log("Protected endpoints:");
  console.log("  GET /api/premium/* - 1 XLM");
  console.log("  GET /api/data - 0.5 XLM");
});

