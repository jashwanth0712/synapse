"use client";

import { useState } from "react";
import useSWR from "swr";
import { SearchBar } from "@/components/search-bar";
import { PlanCard } from "@/components/plan-card";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import type { PlanSearchResult } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const searchUrl = debouncedQuery || selectedTags.length
    ? `/api/plans/search?q=${encodeURIComponent(debouncedQuery)}&tags=${selectedTags.join(",")}&limit=20`
    : null;

  const { data, isLoading } = useSWR<{ results: PlanSearchResult[] }>(
    searchUrl,
    fetcher
  );

  const { data: statsData } = useSWR("/api/stats", fetcher);
  const topTags: Array<{ tag: string; count: number }> = statsData?.top_tags || [];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Search</h2>
        <p className="text-sm text-gray-500">Search the Synapse knowledge base</p>
      </div>

      <SearchBar value={query} onChange={setQuery} />

      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topTags.map((t) => (
            <button key={t.tag} onClick={() => toggleTag(t.tag)}>
              <Badge
                variant={selectedTags.includes(t.tag) ? "purple" : "default"}
                className="cursor-pointer"
              >
                {t.tag} ({t.count})
              </Badge>
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">Searching...</p>}

      {data?.results && data.results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((result) => (
            <PlanCard
              key={result.id}
              id={result.id}
              title={result.title}
              description={result.description}
              tags={result.tags}
              domain={result.domain}
              quality_score={result.quality_score}
              purchase_count={result.purchase_count}
              rank={result.rank}
            />
          ))}
        </div>
      )}

      {data?.results && data.results.length === 0 && (debouncedQuery || selectedTags.length > 0) && (
        <p className="py-8 text-center text-sm text-gray-400">
          No results found for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}

      {!searchUrl && (
        <p className="py-8 text-center text-sm text-gray-400">
          Enter a search query or select tags to find knowledge
        </p>
      )}
    </div>
  );
}
