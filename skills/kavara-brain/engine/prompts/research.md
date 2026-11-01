---
type: meta
tags: [meta, prompt]
stage: active-research
---

# Prompt: Active research (close gaps from outside)

Use a web-search-capable model or agent.

```
Read wiki/gaps.md → "Research gaps". Pick the {N} highest-value items.
For each:
1. Search for 2–4 credible, recent sources.
2. Save each useful source to raw/ as raw/YYYY-MM-DD-research-<slug>.md with frontmatter
   (source_type: research, source: <url>, captured: <date>) and the relevant excerpts or notes.
   Don't paste whole copyrighted articles. Keep key facts, figures and the URL.
3. Don't edit the wiki yet. Instead list the new raw files and which pages they affect.
Then run prompts/compile.md on those raw files and tick the gap in wiki/gaps.md.
```
