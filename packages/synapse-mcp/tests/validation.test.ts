import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "child_process";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

// Must import after mocking
const { validateContent } = await import("../src/validation/analyzer.js");
const { checkSemanticSimilarity } = await import("../src/validation/similarity.js");

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

function mockClaudeRawResponse(raw: string): void {
  mockedExecFile.mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      const cb = callback as (err: Error | null, stdout: string, stderr: string) => void;
      cb(null, raw, "");
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
    mockClaudeRawResponse("this is not json at all");

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

describe("checkSemanticSimilarity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no duplicate when candidates list is empty", async () => {
    const result = await checkSemanticSimilarity("New Plan", "content", []);

    expect(result.hasDuplicate).toBe(false);
    expect(result.matches).toHaveLength(0);
    expect(result.skipped).toBe(false);
  });

  it("detects duplicate when Claude reports high similarity (80%)", async () => {
    const candidates = [
      { id: "abc-123", title: "Existing Plan", content: "existing content" },
    ];

    mockClaudeRawResponse(
      JSON.stringify({
        result: JSON.stringify([
          { id: "abc-123", title: "Existing Plan", similarity: 80, explanation: "Same topic and approach" },
        ]),
      }),
    );

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].similarity).toBe(80);
    expect(result.matches[0].explanation).toContain("Same topic");
  });

  it("allows content when Claude reports low similarity (30%)", async () => {
    const candidates = [
      { id: "abc-123", title: "Existing Plan", content: "existing content" },
    ];

    mockClaudeRawResponse(
      JSON.stringify({
        result: JSON.stringify([
          { id: "abc-123", title: "Existing Plan", similarity: 30, explanation: "Different approach entirely" },
        ]),
      }),
    );

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it("only flags candidates above threshold with multiple candidates", async () => {
    const candidates = [
      { id: "abc-123", title: "Plan A", content: "content a" },
      { id: "def-456", title: "Plan B", content: "content b" },
    ];

    mockClaudeRawResponse(
      JSON.stringify({
        result: JSON.stringify([
          { id: "abc-123", title: "Plan A", similarity: 85, explanation: "Very similar" },
          { id: "def-456", title: "Plan B", similarity: 25, explanation: "Different topic" },
        ]),
      }),
    );

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe("abc-123");
  });

  it("gracefully degrades when Claude CLI is not installed", async () => {
    const candidates = [
      { id: "abc-123", title: "Existing Plan", content: "existing content" },
    ];

    mockClaudeError("ENOENT", "spawn claude ENOENT");

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("Claude CLI not installed");
  });

  it("gracefully degrades on timeout", async () => {
    const candidates = [
      { id: "abc-123", title: "Existing Plan", content: "existing content" },
    ];

    mockClaudeTimeout();

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("timed out");
  });

  it("gracefully degrades on malformed response", async () => {
    const candidates = [
      { id: "abc-123", title: "Existing Plan", content: "existing content" },
    ];

    mockClaudeRawResponse("not json");

    const result = await checkSemanticSimilarity("New Plan", "new content", candidates);

    expect(result.hasDuplicate).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.warning).toContain("Similarity check error");
  });
});
