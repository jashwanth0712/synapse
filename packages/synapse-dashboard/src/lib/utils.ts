import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stroopsToXLM(stroops: number): string {
  return (stroops / 10_000_000).toFixed(2);
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function stellarExpertTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function stellarExpertAccountUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sanitizeFts5Query(query: string): string {
  return query
    .replace(/[^\w\s*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
