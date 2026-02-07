import { config } from "./config";

export async function getLatestLedger(): Promise<number> {
  try {
    const res = await fetch(config.sorobanRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestLedger",
      }),
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return data?.result?.sequence ?? 0;
  } catch {
    return 0;
  }
}
