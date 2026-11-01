---
type: meta
tags: [meta, prompt]
stage: 2-compile
---

# Prompt: Compile raw/ → wiki/

Use a top-tier long-context model (e.g. Claude Code in this folder). Runs **incrementally**.

```
You are the compiler for this knowledge base. Read agents.md first and follow its page contract.

INPUT
- The current wiki: wiki/index.md plus every page it lists (or `.kb/wiki-bundle.md`).
- The NEW or CHANGED raw files: {list them, or: every raw/ file listed under "Uncompiled raw files" in wiki/gaps.md}.

TASK
1. Read each new raw file completely. Identify the distinct topics, facts, decisions and numbers in it.
2. For each topic:
   - If a wiki page already covers it, UPDATE that page: merge in the new facts (keep specifics),
     add the raw file to `sources` (frontmatter and ## Sources), and bump `updated`.
   - If no page fits, CREATE one in the most fitting folder (or propose a new folder if the
     taxonomy no longer fits). Follow the page contract exactly.
3. COMPILE, DON'T SUMMARISE: restructure into a consistent format, keep names, numbers, dates
   and quotes that matter, and add [[wiki links]] to related pages.
4. CONTRADICTIONS: if the new source disagrees with an existing page or another source,
   do NOT overwrite. Add a bullet under ## Conflicts that links each side to its raw file,
   and add an open question asking the owner which is right.
5. UNKNOWNS: mark missing values **[CONFIRM]** (fact) or **[SET]** (decision such as a price), and list them
   under ## Open questions.
6. RELATIONS: keep ## Related reciprocal. If A lists B, B must list A.
7. Don't invent anything. Every new sentence must trace to a raw file.
8. Flag raw files that don't fit any topic in wiki/gaps.md under "Unplaced raw files".

AFTER
- Run `bun scripts/kb.mjs index` and then `bun scripts/kb.mjs lint`. Fix every error.
- Append to wiki/log.md: `- YYYY-MM-DD · **compile**: <raw files> → <pages created/updated>`
- git commit -m "compile: <short description>"

OUTPUT TO ME: a short list of pages created/updated, new conflicts, and new open questions.
```
