import { IPFS_API_KEY, IPFS_API_SECRET, IPFS_GATEWAY } from "../config.js";

export interface IPFSClient {
  pin(content: string): Promise<{ cid: string; size: number }>;
  get(cid: string): Promise<string>;
  unpin(cid: string): Promise<void>;
  isPinned(cid: string): Promise<boolean>;
}

const PINATA_API_BASE = "https://api.pinata.cloud";

export class PinataClient implements IPFSClient {
  private apiKey: string;
  private apiSecret: string;
  private gateway: string;

  constructor(
    apiKey: string = IPFS_API_KEY,
    apiSecret: string = IPFS_API_SECRET,
    gateway: string = IPFS_GATEWAY,
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.gateway = gateway;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      pinata_api_key: this.apiKey,
      pinata_secret_api_key: this.apiSecret,
    };
  }

  async pin(content: string): Promise<{ cid: string; size: number }> {
    const body = {
      pinataContent: {
        content,
        timestamp: new Date().toISOString(),
      },
      pinataMetadata: {
        name: `synapse-plan-${Date.now()}`,
      },
    };

    const res = await fetch(`${PINATA_API_BASE}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pinata pin failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      IpfsHash: string;
      PinSize: number;
    };
    return { cid: data.IpfsHash, size: data.PinSize };
  }

  async get(cid: string): Promise<string> {
    const url = `${this.gateway}/ipfs/${cid}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`IPFS get failed (${res.status}): ${cid}`);
    }

    const data = (await res.json()) as { content: string };
    return data.content;
  }

  async unpin(cid: string): Promise<void> {
    const res = await fetch(`${PINATA_API_BASE}/pinning/unpin/${cid}`, {
      method: "DELETE",
      headers: this.headers(),
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Pinata unpin failed (${res.status}): ${text}`);
    }
  }

  async isPinned(cid: string): Promise<boolean> {
    const res = await fetch(
      `${PINATA_API_BASE}/data/pinList?hashContains=${cid}&status=pinned`,
      {
        headers: this.headers(),
      },
    );

    if (!res.ok) {
      return false;
    }

    const data = (await res.json()) as { count: number };
    return data.count > 0;
  }
}
