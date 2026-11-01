// secrets.mjs: zero-dependency secret scanner shared by the Kavara Brain guards.
// scan(text) → [{ kind, preview }] (previews are masked; the secret itself is never printed).

const PLACEHOLDER = /^(\*{3,}|•+|<[^>]*>|\[[^\]]*\]|\{\{.*\}\}|\$\{.*\}|x{3,}|redacted|removed|hidden|none|null|n\/a|tbd|todo|example|changeme|your[-_a-z]*|manager|vault|keychain|\(.*\))$/i;

const RULES = [
  { kind: "private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { kind: "OpenAI/Anthropic-style API key", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: "Stripe key", re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "credentials in URL", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@\/'"`]+:([^\s@\/'"`]{3,})@[^\s'"`]+/gi, group: 1 },
  {
    kind: "labelled secret",
    re: /\b(?:pass(?:word|wd|code|phrase)?|pwd|secret|api[_ -]?key|access[_ -]?token|auth[_ -]?token|client[_ -]?secret|merchant[_ -]?(?:key|passphrase|salt))\b\s*[:=]\s*[`"']?([^\s`"'|,;)]{4,})/gi,
    group: 1,
  },
  { kind: "PIN", re: /\bpin\b\s*[:=]\s*(\d{4,8})\b/gi, group: 1 },
];

const mask = (s) => (s.length <= 4 ? "****" : s.slice(0, 2) + "*".repeat(Math.min(8, s.length - 2)));

export function scan(text = "") {
  const out = [];
  for (const { kind, re, group } of RULES) {
    for (const m of text.matchAll(re)) {
      const value = group ? m[group] : m[0];
      if (!value || PLACEHOLDER.test(value) || /CONFIRM|\bSET\b/.test(value)) continue;
      out.push({ kind, preview: mask(value) });
    }
  }
  return out;
}
