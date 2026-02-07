export interface ValidationInput {
  title: string;
  content: string;
  tags: string[];
  domain?: string;
}

export interface ClaudeValidationOutput {
  passed: boolean;
  score: number;
  category: "accepted" | "needs_improvement" | "rejected";
  issues: string[];
  strengths: string[];
  feedback: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  category: "accepted" | "needs_improvement" | "rejected" | "unscored";
  issues: string[];
  strengths: string[];
  feedback: string;
  skipped: boolean;
  warning?: string;
}

export interface SimilarityCandidate {
  id: string;
  title: string;
  content: string;
}

export interface SimilarityMatch {
  id: string;
  title: string;
  similarity: number; // 0-100, how similar Claude thinks they are
  explanation: string;
}

export interface SimilarityResult {
  hasDuplicate: boolean;
  matches: SimilarityMatch[];
  skipped: boolean;
  warning?: string;
}
