import { execFile } from "child_process";
import { VALIDATION_TIMEOUT_MS, VALIDATION_PASS_THRESHOLD } from "../config.js";
import { buildValidationPrompt, VALIDATION_JSON_SCHEMA } from "./prompt.js";
import type { ValidationInput, ValidationResult, ClaudeValidationOutput } from "./types.js";

const MAX_BUFFER = 1024 * 1024; // 1MB

export async function validateContent(input: ValidationInput): Promise<ValidationResult> {
  const prompt = buildValidationPrompt(input, VALIDATION_PASS_THRESHOLD);

  try {
    const output = await callClaude(prompt);
    const parsed = parseClaudeOutput(output);
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

function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      {
        timeout: VALIDATION_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr && !stdout) {
          reject(new Error(`Claude CLI stderr: ${stderr}`));
          return;
        }
        resolve(stdout);
      },
    );

    child.stdin?.end();
  });
}

function parseClaudeOutput(raw: string): ClaudeValidationOutput {
  let text = raw.trim();

  // Claude --output-format json wraps response in a JSON object with a "result" field
  try {
    const wrapper = JSON.parse(text);
    if (wrapper.result) {
      text = typeof wrapper.result === "string" ? wrapper.result : JSON.stringify(wrapper.result);
    }
  } catch {
    // Not wrapped, continue with raw text
  }

  // Try to extract JSON from the text (may be surrounded by markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

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
    category: parsed.category,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    feedback: parsed.feedback || "",
  };
}
