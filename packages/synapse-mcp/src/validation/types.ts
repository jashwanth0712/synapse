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
