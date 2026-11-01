---
type: meta
tags: [meta, prompt]
stage: 6-lint
---

# Prompt: Lint & health check

Two layers: the **script** catches structure; the **LLM** catches meaning. A fast, cheap model is fine for the LLM pass.

## Layer 1: script (weekly + after every compile)

```bash
bun scripts/kb.mjs index
bun scripts/kb.mjs lint --log      # --json for machine-readable output
```

It checks: broken [[links]], missing frontmatter or sections, sources not found, orphan pages, one-way relations, stale pages (>30 days), oversized pages, uncompiled raw files, raw files newer than the pages citing them, folders without maps, and total size vs context.

## Layer 2: LLM health check

```
Read agents.md and the whole wiki (or .kb/wiki-bundle.md) plus the lint output below.
Report, as a checklist with page links:
1. CONTRADICTIONS between pages that aren't yet recorded under ## Conflicts.
2. UNGROUNDED CLAIMS: statements that don't trace to any listed source (spot-check against raw/).
3. OUTDATED facts: prices, dates or statuses superseded by newer sources or filed outputs.
4. DUPLICATION: the same fact maintained in two places. Pick one home and link to it from the other.
5. MISSING TOPICS: things referenced repeatedly that deserve their own page.
6. TAXONOMY: folders or pages that should be merged, split or moved.
7. RESEARCH GAPS: questions the KB can't answer that outside research could, for wiki/gaps.md.
Then FIX everything that doesn't need the owner's judgement, list what does, re-run the script,
log `**lint**` to wiki/log.md and git commit.

LINT OUTPUT:
{paste `kb lint` output}
```
