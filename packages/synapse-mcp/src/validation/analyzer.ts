import { VALIDATION_PASS_THRESHOLD } from "../config.js";
import { callClaude, parseJsonFromClaude } from "./claude-cli.js";
import { buildValidationPrompt } from "./prompt.js";
import type { ValidationInput, ValidationResult, ClaudeValidationOutput } from "./types.js";

export async function validateContent(input: ValidationInput): Promise<ValidationResult> {
  const prompt = buildValidationPrompt(input, VALIDATION_PASS_THRESHOLD);

  try {
    const output = await callClaude(prompt);
    const parsed = parseValidationOutput(output);
    return {
      passed: parsed.passed,
      score: parsed.score,
      category: parsed.category,
      issues: parsed.issues,
      strengths: parsed.strengths,
      feedback: parsed.feedback,
      skipped: false,
    };
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    const isNotInstalled = error.code === "ENOENT";
    const isTimeout = error.message?.includes("timed out") || error.killed === true;

    const reason = isNotInstalled
      ? "Claude CLI not installed"
      : isTimeout
        ? "Validation timed out"
        : `Validation error: ${error.message}`;

    return {
      passed: true,
      score: -1,
      category: "unscored",
      issues: [],
      strengths: [],
      feedback: "",
      skipped: true,
      warning: `${reason} - content stored without quality validation`,
    };
  }
}

function parseValidationOutput(raw: string): ClaudeValidationOutput {
  const parsed = parseJsonFromClaude(raw) as Record<string, unknown>;

  if (
    typeof parsed.passed !== "boolean" ||
    typeof parsed.score !== "number" ||
    !parsed.category
  ) {
    throw new Error("Invalid validation output structure");
  }

  return {
    passed: parsed.passed,
    score: parsed.score,
    category: parsed.category as ClaudeValidationOutput["category"],
    issues: Array.isArray(parsed.issues) ? parsed.issues as string[] : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths as string[] : [],
    feedback: (parsed.feedback as string) || "",
  };
}
