---
type: meta
tags: [meta, prompt]
stage: 4-query
---

# Prompt: Query the wiki (full context, no RAG)

Any model with enough context. For tools that can't read folders, run `bun scripts/kb.mjs bundle` and attach `.kb/wiki-bundle.md`.

```
Answer using ONLY this knowledge base. Read agents.md and wiki/index.md first, then every page
relevant to the question. If the whole wiki fits in your context, read all of it.

QUESTION: {question}

RULES
- Cite the wiki page for every claim, e.g. (→ [[wiki/00-core/offer-pricing]]).
- Say clearly what the KB does NOT know. Point to [[wiki/gaps]] items or suggest raw sources to add.
- Surface any ## Conflicts that affect the answer. Don't pick a side silently.
- Separate "what the KB says" from "my inference/recommendation".

END WITH a block titled "File back?" listing:
- new insights or decisions worth saving as a synthesis in wiki/07-outputs/
- pages that should be updated
- new gaps / research questions
```

Query ladder to test a new KB: (1) facts: "What does <offer/project> include?" (2) synthesis: "Which of my offers fits <customer type>, and why?" (3) analysis: "What are the biggest gaps blocking <main goal>?"
