"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { truncateAddress, stellarExpertAccountUrl } from "@/lib/utils";
import { Copy, Check, ExternalLink } from "lucide-react";
import { generateBlobby } from "blobby-svg";

/** Simple hash to seed a deterministic PRNG from an address string. */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generate a deterministic blobby SVG for a given address. */
function generateSeededBlobby(address: string): string {
  const seed = hashCode(address);
  const rng = seededRandom(seed === 0 ? 1 : seed);
  const original = Math.random;
  Math.random = rng;
  try {
    const svg = generateBlobby({ size: 100 });
    // Strip width/height attributes so the SVG scales to fill its container via CSS
    return svg.replace(/ width="\d+"/, "").replace(/ height="\d+"/, "");
  } finally {
    Math.random = original;
  }
}

export function AddressBadge({ address, linked = true }: { address: string; linked?: boolean }) {
  const [copied, setCopied] = useState(false);

  const blobSvg = useMemo(() => generateSeededBlobby(address), [address]);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = truncateAddress(address, 6);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm">
      <span
        className="inline-flex items-center justify-center h-6 w-6 shrink-0 rounded-full overflow-hidden [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: blobSvg }}
      />
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
