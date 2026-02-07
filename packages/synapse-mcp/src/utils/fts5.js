/**
 * Sanitize a query string for SQLite FTS5 MATCH syntax.
 * Strips special FTS5 operators and wraps each token in double quotes
 * so characters like @, /, -, . are treated as literals.
 */
export function sanitizeFts5Query(query) {
  // Remove FTS5 operators: AND, OR, NOT, NEAR
  const cleaned = query
    .replace(/\b(AND|OR|NOT|NEAR)\b/g, "")
    // Remove special chars that are FTS5 syntax: * ^ " { } ( )
    .replace(/[*^"{}()]/g, "")
    .trim();

  // Split into tokens and wrap each in double quotes for literal matching
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '""';

  return tokens.map((t) => `"${t}"`).join(" ");
}
