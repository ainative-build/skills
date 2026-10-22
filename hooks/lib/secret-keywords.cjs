/**
 * Secret-output guardrail keyword matcher.
 *
 * These patterns detect prompts about credential handling. They are intentionally
 * separate from privacy-checker.cjs: this hook is a soft UserPromptSubmit
 * reminder, while privacy-checker powers path-based deny gates.
 */

const SECRET_KEYWORD_PATTERNS = [
  /\.env(?:\b|$)/i,
  /(?:^|[^A-Za-z0-9])credentials?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])secrets?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])api[\s_-]*keys?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])access[\s_-]*keys?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])tokens?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])bearer(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])jwts?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])private[\s_-]*keys?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])oauth(?:[\s_-]+client)?[\s_-]*secrets?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])client[\s_-]*secrets?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])cloud[\s_-]*keys?(?:$|[^A-Za-z0-9])/i,
  /(?:^|[^A-Za-z0-9])env[\s_-]+files?(?:$|[^A-Za-z0-9])/i,
];

function containsSecretKeyword(prompt) {
  if (typeof prompt !== 'string' || prompt.trim() === '') return false;
  return SECRET_KEYWORD_PATTERNS.some((pattern) => pattern.test(prompt));
}

module.exports = {
  SECRET_KEYWORD_PATTERNS,
  containsSecretKeyword,
};
