/**
 * Freighter Signer
 *
 * Signs Stellar transactions using the Freighter browser wallet
 */

/**
 * Check if Freighter is installed and connected
 */
export async function isFreighterConnected(): Promise<boolean> {
  try {
    const freighterApi = await import("@stellar/freighter-api");
    const { isConnected } = freighterApi;
    return await isConnected();
  } catch {
    return false;
  }
}

/**
 * Get the public key from Freighter
 *
 * @returns The user's public key
 * @throws If Freighter is not installed or user denies access
 */
export async function getFreighterPublicKey(): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { setAllowed, getPublicKey } = freighterApi;

  // Request access if not already granted
  // setAllowed returns boolean directly
  const isAllowed = await setAllowed();
  if (!isAllowed) {
    throw new Error("Freighter access denied");
  }

  // Get the public key
  // getPublicKey returns string directly
  const publicKey = await getPublicKey();
  if (!publicKey) {
    throw new Error("Failed to get Freighter public key");
  }

  return publicKey;
}

/**
 * Sign a transaction XDR using Freighter
 *
 * @param unsignedTxXdr - The unsigned transaction XDR (base64)
 * @param networkPassphrase - The network passphrase
 * @returns The signed transaction XDR (base64)
 * @throws If Freighter is not installed or user denies signing
 */
export async function signWithFreighter(
  unsignedTxXdr: string,
  networkPassphrase: string
): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { signTransaction } = freighterApi;

  const result = await signTransaction(unsignedTxXdr, {
    networkPassphrase,
  });

  if (!result) {
    throw new Error("Freighter signing failed");
  }

  return result;
}

/**
 * Get the network from Freighter settings
 */
export async function getFreighterNetwork(): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { getNetwork } = freighterApi;

  const result = await getNetwork();
  if (!result) {
    throw new Error("Failed to get Freighter network");
  }

  return result;
}

