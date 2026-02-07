import type { ValidationInput } from "./types.js";

export const VALIDATION_JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    passed: { type: "boolean", description: "Whether the content meets quality threshold" },
    score: { type: "number", description: "Quality score 0-100" },
    category: {
      type: "string",
      enum: ["accepted", "needs_improvement", "rejected"],
      description: "Classification based on score thresholds",
    },
    issues: {
      type: "array",
      items: { type: "string" },
      description: "Specific quality issues found",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Positive aspects of the content",
    },
    feedback: {
      type: "string",
      description: "Actionable feedback for improving the content",
    },
  },
  required: ["passed", "score", "category", "issues", "strengths", "feedback"],
  additionalProperties: false,
});

export function buildValidationPrompt(input: ValidationInput, passThreshold: number): string {
  return `You are a quality gate for an AI knowledge base called Synapse. Your job is to evaluate submitted content and determine if it is high-quality, generic, and reusable enough to be stored for other AI agents to learn from.

## Content to Evaluate

**Title:** ${input.title}
**Tags:** ${input.tags.join(", ")}
**Domain:** ${input.domain || "general"}

<content>
${input.content}
</content>

## Hard Reject Rules (any single match = reject with score 0)

1. Contains hardcoded absolute paths (e.g., /Users/..., C:\\Users\\..., /home/username/...)
2. Contains literal API keys, tokens, secrets, or passwords (not placeholder examples)
3. Is a project-specific README or changelog that repeatedly references one specific repository or organization
4. Fewer than 200 words of substantive content
5. Raw code dump with no explanatory prose or reasoning
6. Pasted conversation or chat transcript

## Scoring Rubric (0-100)

Award points in each category:
- **Architectural reasoning & trade-off analysis** (0-20): Does it explain WHY certain decisions were made? Are trade-offs discussed?
- **Generic applicability** (0-20): Uses placeholders instead of hardcoded values. Approach can be applied to different projects.
- **Well-structured markdown** (0-15): Clear sections, headers, organized flow.
- **Error handling & edge cases** (0-15): Documents what can go wrong and how to handle it.
- **Code examples with annotations** (0-15): Code snippets have explanatory comments or surrounding prose.
- **Reusable patterns** (0-15): Names and describes generalizable patterns or approaches.

## Thresholds

- Score >= ${passThreshold}: "accepted" (passed = true)
- Score 40-${passThreshold - 1}: "needs_improvement" (passed = false, provide specific feedback)
- Score < 40: "rejected" (passed = false)

## Instructions

1. First check all Hard Reject Rules. If ANY match, set score to 0, category to "rejected", passed to false.
2. If no hard reject, score each rubric category and sum.
3. Set the category and passed fields based on the thresholds above.
4. List specific issues and strengths.
5. Provide actionable feedback the contributor can use to improve.

Return ONLY the JSON result.`;
}
