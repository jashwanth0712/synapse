import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressBadge } from "@/components/address-badge";
import { ShoppingCart, Star } from "lucide-react";

interface PlanCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[] | string;
  domain?: string | null;
  quality_score: number;
  purchase_count: number;
  contributor_address?: string;
  tier?: string;
  rank?: number;
}

export function PlanCard(plan: PlanCardProps) {
  const tags = Array.isArray(plan.tags)
    ? plan.tags
    : (() => { try { return JSON.parse(plan.tags as string); } catch { return []; } })();

  return (
    <Link href={`/plans/${plan.id}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-1">{plan.title}</CardTitle>
            {plan.tier && <Badge variant={plan.tier}>{plan.tier}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{plan.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 5).map((tag: string) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
            {plan.domain && <Badge variant="purple">{plan.domain}</Badge>}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {plan.quality_score > 0 ? plan.quality_score.toFixed(0) : "—"}
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {plan.purchase_count}
              </span>
            </div>
            {plan.contributor_address && (
              <AddressBadge address={plan.contributor_address} />
            )}
          </div>
          {typeof plan.rank === "number" && plan.rank !== 0 && (
            <p className="mt-1 text-xs text-gray-400">Relevance: {Math.abs(plan.rank).toFixed(2)}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
