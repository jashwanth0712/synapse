import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "child_process";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

// Must import after mocking
const { validateContent } = await import("../src/validation/analyzer.js");

const mockedExecFile = vi.mocked(execFile);

function mockClaudeResponse(response: object): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      const cb = callback as (err: Error | null, stdout: string, stderr: string) => void;
      cb(null, JSON.stringify({ result: JSON.stringify(response) }), "");
      return {} as ReturnType<typeof execFile>;
    },
  );
}

function mockClaudeError(code: string, message: string): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      const cb = callback as (err: NodeJS.ErrnoException | null, stdout: string, stderr: string) => void;
      const err = new Error(message) as NodeJS.ErrnoException;
      err.code = code;
      cb(err, "", "");
      return {} as ReturnType<typeof execFile>;
    },
  );
}

function mockClaudeTimeout(): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      const cb = callback as (err: NodeJS.ErrnoException | null, stdout: string, stderr: string) => void;
      const err = new Error("timed out") as NodeJS.ErrnoException & { killed: boolean };
      err.killed = true;
      cb(err, "", "");
      return {} as ReturnType<typeof execFile>;
    },
  );
}

const sampleInput = {
  title: "Test Plan",
  content: "Some test content for validation",
  tags: ["test"],
  domain: "web",
};

describe("validateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts high-quality content (score 85)", async () => {
    mockClaudeResponse({
      passed: true,
      score: 85,
      category: "accepted",
      issues: [],
      strengths: ["Well-structured", "Good trade-off analysis"],
      feedback: "Excellent plan.",
    });

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
    expect(result.category).toBe("accepted");
    expect(result.skipped).toBe(false);
    expect(result.strengths).toHaveLength(2);
  });

  it("rejects low-quality content (score 30)", async () => {
    mockClaudeResponse({
      passed: false,
      score: 30,
      category: "rejected",
      issues: ["Raw code dump", "No explanatory prose"],
      strengths: [],
      feedback: "Add architectural reasoning and explanatory text.",
    });

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(false);
    expect(result.score).toBe(30);
    expect(result.category).toBe("rejected");
    expect(result.issues).toHaveLength(2);
    expect(result.feedback).toContain("architectural reasoning");
  });

  it("returns needs_improvement for mid-range scores (score 50)", async () => {
    mockClaudeResponse({
      passed: false,
      score: 50,
      category: "needs_improvement",
      issues: ["Missing error handling section"],
      strengths: ["Good structure"],
      feedback: "Add error handling documentation to improve score.",
    });

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(false);
    expect(result.score).toBe(50);
    expect(result.category).toBe("needs_improvement");
    expect(result.issues).toHaveLength(1);
  });

  it("gracefully degrades when Claude CLI is not installed (ENOENT)", async () => {
    mockClaudeError("ENOENT", "spawn claude ENOENT");

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(-1);
    expect(result.category).toBe("unscored");
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("Claude CLI not installed");
  });

  it("gracefully degrades on timeout", async () => {
    mockClaudeTimeout();

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(-1);
    expect(result.category).toBe("unscored");
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("timed out");
  });

  it("gracefully degrades on malformed JSON response", async () => {
    mockedExecFile.mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
        const cb = callback as (err: Error | null, stdout: string, stderr: string) => void;
        cb(null, "this is not json at all", "");
        return {} as ReturnType<typeof execFile>;
      },
    );

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(-1);
    expect(result.category).toBe("unscored");
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("Validation error");
  });

  it("handles JSON response with missing required fields", async () => {
    mockClaudeResponse({ score: 70 }); // missing passed, category

    const result = await validateContent(sampleInput);

    expect(result.passed).toBe(true);
    expect(result.score).toBe(-1);
    expect(result.skipped).toBe(true);
  });
});
