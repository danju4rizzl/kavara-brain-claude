---
type: meta
tags: [meta, prompt]
stage: 5-file-back
---

# Prompt: File a Q&A output back into the wiki

This is what makes the brain self-improving. Run it after any query that produced something worth keeping.

```
Take the answer above (or: {paste output}) and file it into the knowledge base. Follow agents.md.

1. SYNTHESIS: if it contains a new conclusion, decision, comparison or plan, save it as
   wiki/07-outputs/YYYY-MM-DD-<slug>.md with type: synthesis. Use the full page contract;
   `sources` = the wiki pages and raw files it was derived from.
2. PROPAGATE: update every affected topic page (facts, decisions, prices, status), link it to
   the synthesis under ## Related, and bump `updated`. Decisions the owner confirmed resolve
   their [CONFIRM]/[SET] markers: remove them and note "confirmed by owner YYYY-MM-DD".
3. GAPS: add new unknowns to the right page's ## Open questions; add external research needs to
   wiki/gaps.md → "Research gaps"; add missing documents to "Raw files to add".
4. If the owner stated new facts in the chat, ALSO save them verbatim as
   raw/YYYY-MM-DD-chat-<slug>.md (so the fact has a source), then cite it.
5. Run `bun scripts/kb.mjs index && bun scripts/kb.mjs lint`, fix errors, log to wiki/log.md
   (`**file**`), and git commit.
```
