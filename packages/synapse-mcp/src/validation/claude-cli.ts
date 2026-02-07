import { execFile } from "child_process";
import { VALIDATION_TIMEOUT_MS } from "../config.js";

const MAX_BUFFER = 1024 * 1024; // 1MB

export function callClaude(prompt: string): Promise<string> {
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

export function parseJsonFromClaude(raw: string): unknown {
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

  return JSON.parse(jsonMatch[0]);
}
