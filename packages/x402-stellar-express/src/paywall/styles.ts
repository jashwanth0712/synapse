/**
 * Paywall CSS Styles
 *
 * Embedded styles for the Stellar paywall UI.
 */

export const paywallStyles = `
:root {
  --bg-dark: #000000;
  --bg-card: #111111;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --border-color: #333333;
  --accent-color: #ffffff;
  --success-color: #ffffff;
  --error-color: #ffffff;
  --dither-color: #222222;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Courier New', Courier, monospace; /* Tech/Retro feel */
  background-color: var(--bg-dark);
  /* Dither effect using radial gradient */
  background-image: radial-gradient(var(--dither-color) 1px, transparent 1px);
  background-size: 4px 4px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  padding: 20px;
}

.paywall-container {
  max-width: 400px;
  width: 100%;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  padding: 32px;
  position: relative;
  /* Hard shadow for retro feel */
  box-shadow: 8px 8px 0px var(--border-color);
}

.paywall-header {
  text-align: center;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 24px;
}

.paywall-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  filter: grayscale(100%) contrast(200%);
}

.paywall-title {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.paywall-subtitle {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.paywall-amount-section {
  border: 1px solid var(--border-color);
  padding: 24px;
  text-align: center;
  margin-bottom: 24px;
  background: var(--bg-card);
}

.paywall-amount {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
  font-family: 'Courier New', Courier, monospace;
}

.paywall-asset {
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
}

.paywall-network {
  display: inline-block;
  margin-top: 12px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.paywall-network-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--text-secondary);
  border-radius: 50%;
  margin-right: 4px;
}

.paywall-details {
  margin-bottom: 32px;
}

.paywall-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dotted var(--border-color);
  font-size: 12px;
}

.paywall-detail-row:last-child {
  border-bottom: none;
}

.paywall-detail-label {
  color: var(--text-secondary);
  text-transform: uppercase;
}

.paywall-detail-value {
  color: var(--text-primary);
  text-align: right;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Courier New', Courier, monospace;
}

.paywall-button {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--text-primary);
  border-radius: 0; /* Square corners */
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Courier New', Courier, monospace;
}

.paywall-button-primary {
  background: var(--text-primary);
  color: var(--bg-dark);
}

.paywall-button-primary:hover:not(:disabled) {
  background: transparent;
  color: var(--text-primary);
}

.paywall-button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--text-secondary);
}

.paywall-button-secondary {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  margin-top: 12px;
}

.paywall-button-secondary:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.paywall-status {
  text-align: center;
  padding: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
  font-size: 12px;
  text-transform: uppercase;
}

.paywall-status-loading {
  border-style: dashed;
}

.paywall-status-success {
  background: var(--text-primary);
  color: var(--bg-dark);
  border-color: var(--text-primary);
}

.paywall-status-error {
  border-color: var(--text-primary);
  color: var(--text-primary);
  /* Striped background for error */
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    #333 10px,
    #333 20px
  );
}

.paywall-balance {
  text-align: center;
  color: var(--text-secondary);
  font-size: 11px;
  margin-top: 16px;
  font-family: 'Courier New', Courier, monospace;
}

.paywall-footer {
  text-align: center;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.paywall-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 10px;
  text-transform: uppercase;
}

.paywall-footer a:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--bg-dark); /* Contrast with button text */
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.wallet-icon {
  width: 16px;
  height: 16px;
}

.hidden {
  display: none !important;
}
`;

