"use client";

import { useState } from "react";
import Link from "next/link";
import { truncateAddress, stellarExpertAccountUrl } from "@/lib/utils";
import { Copy, Check, ExternalLink } from "lucide-react";

export function AddressBadge({ address, linked = true }: { address: string; linked?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = truncateAddress(address, 6);

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      {linked ? (
        <Link href={`/agents/${address}`} className="text-purple-700 hover:underline">
          {display}
        </Link>
      ) : (
        <span>{display}</span>
      )}
      <button onClick={copy} className="text-gray-400 hover:text-gray-600" title="Copy address">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <a
        href={stellarExpertAccountUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 hover:text-gray-600"
        title="View on Stellar Expert"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}
