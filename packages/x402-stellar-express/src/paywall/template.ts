/**
 * Paywall HTML Template
 *
 * Generates a server-rendered HTML page for the Stellar paywall.
 * Uses the Freighter wallet extension for signing transactions.
 */

import type { PaymentRequirements } from "x402-stellar";
import type { PaywallConfig } from "../types.js";
import { paywallStyles } from "./styles.js";
import { formatStroopsToXLM, getNetworkDisplayName, isTestnetNetwork } from "./paywallUtils.js";

// Re-export PaywallConfig for convenience
export type { PaywallConfig };

export interface GetPaywallHtmlOptions {
  /** Payment requirements from the 402 response */
  paymentRequirements: PaymentRequirements;
  /** The current URL being accessed */
  currentUrl: string;
  /** Optional paywall configuration */
  config?: PaywallConfig;
}

/**
 * Generate the paywall HTML page
 */
export function getPaywallHtml(options: GetPaywallHtmlOptions): string {
  const { paymentRequirements, currentUrl, config } = options;

  const amount = formatStroopsToXLM(paymentRequirements.maxAmountRequired);
  const assetDisplay =
    paymentRequirements.asset === "native" ? "XLM" : paymentRequirements.asset.slice(0, 8) + "...";
  const networkDisplay = getNetworkDisplayName(paymentRequirements.network);
  const isTestnet = isTestnetNetwork(paymentRequirements.network);
  const appName = config?.appName || "Protected Content";
  const debugMode = config?.debug === true;

  // Stellar logo SVG (inline)
  const stellarLogoSvg = `<svg viewBox="0 0 100 100" class="paywall-logo"><circle cx="50" cy="50" r="48" fill="url(#stellarGradient)"/><defs><linearGradient id="stellarGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#3b82f6"/></linearGradient></defs><text x="50" y="62" text-anchor="middle" fill="white" font-size="32" font-weight="bold">✦</text></svg>`;

  // Network configuration
  const networkPassphrase = isTestnet
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015";
  const horizonUrl = isTestnet
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Required - ${appName}</title>
  <style>${paywallStyles}</style>
</head>
<body>
  <div class="paywall-container">
    <div class="paywall-header">
      ${config?.appLogo ? `<img src="${config.appLogo}" alt="${appName}" class="paywall-logo">` : stellarLogoSvg}
      <h1 class="paywall-title">Payment Required</h1>
      <p class="paywall-subtitle">${paymentRequirements.description || `Access to ${appName}`}</p>
    </div>

    <div class="paywall-amount-section">
      <div class="paywall-amount">${amount}</div>
      <div class="paywall-asset">${assetDisplay}</div>
      <div class="paywall-network">
        <span class="paywall-network-dot"></span>
        ${networkDisplay}${isTestnet ? " (Testnet)" : ""}
      </div>
    </div>

    <div id="status" class="paywall-status hidden"></div>

    <div class="paywall-details">
      <div class="paywall-detail-row">
        <span class="paywall-detail-label">Resource</span>
        <span class="paywall-detail-value" title="${paymentRequirements.resource}">${new URL(paymentRequirements.resource).pathname}</span>
      </div>
      <div class="paywall-detail-row">
        <span class="paywall-detail-label">Recipient</span>
        <span class="paywall-detail-value" title="${paymentRequirements.payTo}">${paymentRequirements.payTo.slice(0, 8)}...${paymentRequirements.payTo.slice(-4)}</span>
      </div>
    </div>

    <button id="connectBtn" class="paywall-button paywall-button-primary">
      <svg class="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
      </svg>
      <span id="connectBtnText">Connect Freighter Wallet</span>
    </button>

    <button id="payBtn" class="paywall-button paywall-button-primary hidden">
      <span id="payBtnText">Pay ${amount} ${assetDisplay}</span>
    </button>

    <div id="balance" class="paywall-balance hidden"></div>

    <button id="cancelBtn" class="paywall-button paywall-button-secondary">
      Cancel
    </button>

    ${
      debugMode
        ? `
    <div id="debugPanel" style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 12px; color: #a0aec0; max-height: 200px; overflow-y: auto;">
      <strong>Debug Log:</strong>
      <div id="debugLog"></div>
    </div>
    `
        : ""
    }

    <div class="paywall-footer">
      <a href="https://www.freighter.app/" target="_blank" rel="noopener">Get Freighter Wallet</a>
      <span style="margin: 0 8px; color: var(--border-color);">•</span>
      <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener">Powered by x402</a>
    </div>
  </div>

  <script type="module">
    // Configuration from server
    const paymentRequirements = ${JSON.stringify(paymentRequirements)};
    const currentUrl = ${JSON.stringify(currentUrl)};
    const networkPassphrase = ${JSON.stringify(networkPassphrase)};
    const horizonUrl = ${JSON.stringify(horizonUrl)};
    const debugMode = ${JSON.stringify(debugMode)};

    // DOM elements
    const connectBtn = document.getElementById('connectBtn');
    const connectBtnText = document.getElementById('connectBtnText');
    const payBtn = document.getElementById('payBtn');
    const payBtnText = document.getElementById('payBtnText');
    const cancelBtn = document.getElementById('cancelBtn');
    const statusEl = document.getElementById('status');
    const balanceEl = document.getElementById('balance');
    const debugLog = document.getElementById('debugLog');

    // State
    let publicKey = null;

    // Debug logging
    function log(message) {
      console.log('[Paywall]', message);
      if (debugMode && debugLog) {
        const time = new Date().toLocaleTimeString();
        debugLog.innerHTML += '<div>' + time + ': ' + message + '</div>';
        debugLog.parentElement.scrollTop = debugLog.parentElement.scrollHeight;
      }
    }

    // UI helpers
    function showStatus(message, type) {
      statusEl.textContent = message;
      statusEl.className = 'paywall-status paywall-status-' + type;
      statusEl.classList.remove('hidden');
    }

    function hideStatus() {
      statusEl.classList.add('hidden');
    }

    function formatBalance(balance) {
      return parseFloat(balance).toFixed(2);
    }

    // Wait for Freighter extension to be injected
    async function waitForFreighter(timeout) {
      if (timeout === undefined) timeout = 3000;
      const start = Date.now();
      log('Waiting for Freighter extension...');

      while (Date.now() - start < timeout) {
        if (window.freighterApi) {
          log('Freighter API detected');
          return window.freighterApi;
        }
        await new Promise(function(r) { setTimeout(r, 100); });
      }

      log('Freighter not detected after ' + timeout + 'ms');
      return null;
    }

    // Check HTTPS requirement
    function checkHttps() {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showStatus('Freighter requires HTTPS. Please access this page via HTTPS.', 'error');
        connectBtn.disabled = true;
        return false;
      }
      return true;
    }

    // Connect wallet
    async function connectWallet() {
      if (!checkHttps()) return;

      connectBtn.disabled = true;
      connectBtnText.textContent = 'Connecting...';
      log('Connecting wallet...');

      try {
        const freighter = await waitForFreighter(5000);
        if (!freighter) {
          throw new Error('Freighter wallet not detected. Please install it from https://freighter.app and refresh.');
        }

        // Request access
        log('Requesting access...');
        const accessResult = await freighter.requestAccess();
        log('Access result: ' + JSON.stringify(accessResult));

        if (accessResult.error) {
          throw new Error('Access denied: ' + accessResult.error);
        }

        // Get address
        log('Getting address...');
        const addressResult = await freighter.getAddress();
        log('Address result: ' + JSON.stringify(addressResult));

        if (addressResult.error) {
          throw new Error('Failed to get address: ' + addressResult.error);
        }

        publicKey = addressResult.address;
        if (!publicKey) {
          throw new Error('No address returned from Freighter');
        }

        log('Connected: ' + publicKey);

        // Update UI
        connectBtn.classList.add('hidden');
        payBtn.classList.remove('hidden');

        // Fetch balance
        await updateBalance();

        showStatus('Connected: ' + publicKey.slice(0, 8) + '...' + publicKey.slice(-4), 'success');
        setTimeout(hideStatus, 2000);

      } catch (error) {
        log('Connection error: ' + error.message);
        showStatus(error.message || 'Failed to connect wallet', 'error');
        connectBtn.disabled = false;
        connectBtnText.textContent = 'Connect Freighter Wallet';
      }
    }

    // Update balance display
    async function updateBalance() {
      try {
        const response = await fetch(horizonUrl + '/accounts/' + publicKey);
        if (response.ok) {
          const account = await response.json();
          const xlmBalance = account.balances.find(function(b) { return b.asset_type === 'native'; });
          if (xlmBalance) {
            balanceEl.textContent = 'Balance: ' + formatBalance(xlmBalance.balance) + ' XLM';
            balanceEl.classList.remove('hidden');
          }
        }
      } catch (e) {
        log('Failed to fetch balance: ' + e.message);
      }
    }

    // Make payment
    async function makePayment() {
      payBtn.disabled = true;
      payBtnText.innerHTML = '<span class="spinner"></span> Processing...';
      log('Starting payment...');

      try {
        showStatus('Building transaction...', 'loading');

        // Import Stellar SDK from CDN
        const StellarSdk = await import('https://cdn.jsdelivr.net/npm/@stellar/stellar-sdk@12.0.1/+esm');
        log('Stellar SDK loaded');

        // Load source account
        const server = new StellarSdk.Horizon.Server(horizonUrl);
        const sourceAccount = await server.loadAccount(publicKey);
        log('Account loaded: sequence ' + sourceAccount.sequence);

        // Calculate amount in XLM (7 decimals)
        const stroops = BigInt(paymentRequirements.maxAmountRequired);
        const xlmAmount = (Number(stroops) / 10000000).toFixed(7);
        log('Payment amount: ' + xlmAmount + ' XLM');

        // Build transaction
        let txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: networkPassphrase,
        });

        // Add payment operation
        if (paymentRequirements.asset === 'native') {
          txBuilder = txBuilder.addOperation(
            StellarSdk.Operation.payment({
              destination: paymentRequirements.payTo,
              asset: StellarSdk.Asset.native(),
              amount: xlmAmount,
            })
          );
        } else {
          throw new Error('Custom token payments not yet supported');
        }

        // Set timeout and build
        const timeout = paymentRequirements.maxTimeoutSeconds || 300;
        txBuilder = txBuilder.setTimeout(timeout);
        const tx = txBuilder.build();
        log('Transaction built');

        // Sign with Freighter
        showStatus('Please sign the transaction in Freighter...', 'loading');

        const freighter = window.freighterApi;
        if (!freighter) {
          throw new Error('Freighter wallet not available');
        }

        log('Requesting signature...');
        const signResult = await freighter.signTransaction(tx.toXDR(), {
          networkPassphrase: networkPassphrase,
        });
        log('Sign result received');

        if (signResult.error) {
          throw new Error('Signing failed: ' + signResult.error);
        }

        const signedTxXdr = signResult.signedTxXdr;
        if (!signedTxXdr) {
          throw new Error('No signed transaction returned');
        }

        log('Transaction signed');
        showStatus('Submitting payment...', 'loading');

        // Get current ledger for validUntilLedger
        const ledgerResponse = await server.ledgers().order('desc').limit(1).call();
        const currentLedger = ledgerResponse.records[0].sequence;
        const validUntilLedger = currentLedger + Math.ceil(timeout / 5);

        // Build payment payload
        const paymentPayload = {
          x402Version: 1,
          scheme: 'exact',
          network: paymentRequirements.network,
          payload: {
            signedTxXdr: signedTxXdr,
            sourceAccount: publicKey,
            amount: paymentRequirements.maxAmountRequired,
            destination: paymentRequirements.payTo,
            asset: paymentRequirements.asset,
            validUntilLedger: validUntilLedger,
            nonce: crypto.randomUUID(),
          },
        };

        const paymentHeader = btoa(JSON.stringify(paymentPayload));
        log('Payment header created');

        // Submit to server with X-PAYMENT header
        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'X-PAYMENT': paymentHeader,
          },
        });

        if (response.ok) {
          log('Payment successful!');
          showStatus('Payment successful! Redirecting...', 'success');

          // Handle response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            document.documentElement.innerHTML = await response.text();
          } else {
            window.location.reload();
          }
        } else {
          const errorData = await response.json().catch(function() { return {}; });
          throw new Error(errorData.error || 'Payment failed: ' + response.status);
        }

      } catch (error) {
        log('Payment error: ' + error.message);
        showStatus(error.message || 'Payment failed', 'error');
        payBtn.disabled = false;
        payBtnText.textContent = 'Pay ${amount} ${assetDisplay}';
      }
    }

    // Cancel and go back
    function cancel() {
      window.history.back();
    }

    // Event listeners
    connectBtn.addEventListener('click', connectWallet);
    payBtn.addEventListener('click', makePayment);
    cancelBtn.addEventListener('click', cancel);

    // Check environment on load
    (async function() {
      log('Paywall initialized');

      // Check HTTPS
      if (!checkHttps()) {
        log('HTTPS check failed');
        return;
      }

      // Wait a bit for extension to inject
      await new Promise(function(r) { setTimeout(r, 1000); });

      // Try auto-connect if already authorized
      const freighter = await waitForFreighter(3000);
      if (freighter) {
        try {
          log('Checking if already connected...');
          const addressResult = await freighter.getAddress();

          if (addressResult.address && !addressResult.error) {
            publicKey = addressResult.address;
            log('Already connected: ' + publicKey);

            connectBtn.classList.add('hidden');
            payBtn.classList.remove('hidden');
            await updateBalance();

            showStatus('Wallet connected: ' + publicKey.slice(0, 8) + '...' + publicKey.slice(-4), 'success');
            setTimeout(hideStatus, 2000);
          }
        } catch (e) {
          // Not connected yet, that's fine
          log('Not yet authorized: ' + e.message);
        }
      }
    })();
  </script>
</body>
</html>`;
}
