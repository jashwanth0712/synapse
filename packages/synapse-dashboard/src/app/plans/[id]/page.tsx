"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressBadge } from "@/components/address-badge";
import { formatDate, stroopsToXLM } from "@/lib/utils";
import { Star, ShoppingCart, Hash, Globe, Code } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: plan } = useSWR(`/api/plans/${id}`, fetcher);
  const { data: purchaseData } = useSWR(`/api/plans/${id}/purchases`, fetcher);

  if (!plan) {
    return <div className="py-8 text-center text-gray-400">Loading plan...</div>;
  }

  if (plan.error) {
    return <div className="py-8 text-center text-red-500">Plan not found</div>;
  }

  const tags = Array.isArray(plan.tags)
    ? plan.tags
    : (() => { try { return JSON.parse(plan.tags); } catch { return []; } })();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold tracking-tight">{plan.title}</h2>
          {plan.tier && <Badge variant={plan.tier}>{plan.tier}</Badge>}
        </div>
        <p className="text-sm text-gray-500">{plan.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{plan.content || "*No content available*"}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {purchaseData?.purchases?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseData.purchases.map((p: Record<string, unknown>) => (
                    <div key={p.id as number} className="flex items-center justify-between border-b pb-2 text-sm">
                      <div>
                        <AddressBadge address={p.buyer_address as string} />
                        <span className="ml-2 text-xs text-gray-400">{formatDate(p.created_at as string)}</span>
                      </div>
                      <span className="font-mono">{stroopsToXLM(p.amount_stroops as number)} XLM</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Contributor</p>
                <AddressBadge address={plan.contributor_address} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Quality
                  </p>
                  <p className="font-medium">
                    {plan.quality_score > 0 ? plan.quality_score.toFixed(0) : "Unscored"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" /> Purchases
                  </p>
                  <p className="font-medium">{plan.purchase_count}</p>
                </div>
              </div>

              {plan.domain && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Domain
                  </p>
                  <Badge variant="purple">{plan.domain}</Badge>
                </div>
              )}

              {(plan.language || plan.framework) && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Code className="h-3 w-3" /> Tech
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {plan.language && <Badge>{plan.language}</Badge>}
                    {plan.framework && <Badge>{plan.framework}</Badge>}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag: string) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Content Hash
                </p>
                <p className="font-mono text-xs break-all">{plan.content_hash}</p>
              </div>

              {plan.ipfs_cid && (
                <div>
                  <p className="text-xs text-gray-500">IPFS CID</p>
                  <p className="font-mono text-xs break-all">{plan.ipfs_cid}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm">{formatDate(plan.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
