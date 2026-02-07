import { callClaude, parseJsonFromClaude } from "./claude-cli.js";
import type { SimilarityCandidate, SimilarityMatch, SimilarityResult } from "./types.js";

const SIMILARITY_DUPLICATE_THRESHOLD = 70; // 70%+ similarity = duplicate

export async function checkSemanticSimilarity(
  newTitle: string,
  newContent: string,
  candidates: SimilarityCandidate[],
): Promise<SimilarityResult> {
  if (candidates.length === 0) {
    return { hasDuplicate: false, matches: [], skipped: false };
  }

  try {
    const prompt = buildSimilarityPrompt(newTitle, newContent, candidates);
    const output = await callClaude(prompt);
    const parsed = parseSimilarityOutput(output);

    const duplicates = parsed.filter((m) => m.similarity >= SIMILARITY_DUPLICATE_THRESHOLD);

    return {
      hasDuplicate: duplicates.length > 0,
      matches: duplicates,
      skipped: false,
    };
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    const isNotInstalled = error.code === "ENOENT";
    const isTimeout = error.message?.includes("timed out") || error.killed === true;

    const reason = isNotInstalled
      ? "Claude CLI not installed"
      : isTimeout
        ? "Similarity check timed out"
        : `Similarity check error: ${error.message}`;

    return {
      hasDuplicate: false,
      matches: [],
      skipped: true,
      warning: `${reason} - similarity check skipped`,
    };
  }
}

function buildSimilarityPrompt(
  newTitle: string,
  newContent: string,
  candidates: SimilarityCandidate[],
): string {
  // Truncate content to keep prompt reasonable (first 1500 chars each)
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + "\n...[truncated]" : s;

  const candidateBlocks = candidates
    .map(
      (c, i) => `### Existing Plan ${i + 1}: "${c.title}" (id: ${c.id})
<existing_content_${i + 1}>
${truncate(c.content, 1500)}
</existing_content_${i + 1}>`,
    )
    .join("\n\n");

  return `You are a semantic similarity checker for the Synapse AI knowledge base. Your job is to determine if a NEW plan being submitted is substantially similar to existing plans already in the database.

## New Plan Being Submitted

**Title:** ${newTitle}

<new_content>
${truncate(newContent, 2000)}
</new_content>

## Existing Plans to Compare Against

${candidateBlocks}

## Instructions

For EACH existing plan, determine a similarity score (0-100):
- **0-30**: Different topics or fundamentally different approaches
- **31-50**: Related topic but distinct content, different angle or scope
- **51-69**: Significant overlap but adds meaningful new information
- **70-89**: Very similar content, mostly covers the same ground
- **90-100**: Near-identical, same topic with same approach and examples

Focus on **semantic meaning**, not surface-level wording. Two plans about "JWT auth in Express" with the same architectural approach and trade-offs are duplicates even if worded differently. But "JWT auth in Express" vs "JWT auth in Django" are distinct.

Return a JSON array with one object per existing plan:
[
  {
    "id": "<plan id>",
    "title": "<plan title>",
    "similarity": <0-100>,
    "explanation": "<brief reason for the score>"
  }
]

Return ONLY the JSON array.`;
}

function parseSimilarityOutput(raw: string): SimilarityMatch[] {
  let text = raw.trim();

  // Handle Claude --output-format json wrapper
  try {
    const wrapper = JSON.parse(text);
    if (wrapper.result) {
      text = typeof wrapper.result === "string" ? wrapper.result : JSON.stringify(wrapper.result);
    }
  } catch {
    // Not wrapped
  }

  // Extract JSON array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    // Try extracting a single object and wrapping it
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      return [validateMatch(obj)];
    }
    throw new Error("No JSON found in similarity response");
  }

  const parsed = JSON.parse(arrayMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array from similarity check");
  }

  return parsed.map(validateMatch);
}

function validateMatch(obj: unknown): SimilarityMatch {
  const m = obj as Record<string, unknown>;
  return {
    id: String(m.id || ""),
    title: String(m.title || ""),
    similarity: typeof m.similarity === "number" ? m.similarity : 0,
    explanation: String(m.explanation || ""),
  };
}
