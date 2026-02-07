import * as StellarSdk from "@stellar/stellar-sdk";
const {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Horizon,
} = StellarSdk;

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export interface PaymentResult {
  success: boolean;
  txHash: string | null;
  error?: string;
}

export async function submitPayment(
  fromKeypair: Keypair,
  toAddress: string,
  amountXLM: string,
): Promise<PaymentResult> {
  const server = new Horizon.Server(HORIZON_URL);

  try {
    const account = await server.loadAccount(fromKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: toAddress,
          asset: Asset.native(),
          amount: amountXLM,
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(fromKeypair);

    const result = await server.submitTransaction(transaction);
    const hash =
      typeof result === "object" && result !== null && "hash" in result
        ? (result as { hash: string }).hash
        : null;

    return { success: true, txHash: hash };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown payment error";
    return { success: false, txHash: null, error: message };
  }
}
