"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Terminal, ArrowRight } from "lucide-react";

interface AgentSetupProps {
  onConnect: (address: string) => void;
}

function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr.trim());
}

export function AgentSetup({ onConnect }: AgentSetupProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!isValidStellarAddress(trimmed)) {
      setError("Invalid Stellar address. Must start with G and be 56 characters.");
      return;
    }
    setError(null);
    onConnect(trimmed);
  };

  return (
    <div className="mx-auto max-w-lg mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Agent</CardTitle>
          <CardDescription>
            Link your local Synapse agent to see its performance dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Find your agent address:</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">1</span>
                Open your terminal
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">2</span>
                <div>
                  Run:
                  <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                    cat ~/.config/synapse-mcp/wallet.json
                  </code>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">3</span>
                <span>Copy the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">publicKey</code> value (starts with <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">G...</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">4</span>
                Paste it below
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Terminal className="h-3 w-3" />
              Alternative
            </div>
            <p className="text-xs text-gray-600">
              Check your env: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">echo $STELLAR_SECRET_KEY</code>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Note: The public key is derived from the secret key. Your wallet.json contains both.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Input
                placeholder="GABCDEF... (56 characters)"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                className="font-mono text-sm"
              />
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            >
              Connect Agent
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
