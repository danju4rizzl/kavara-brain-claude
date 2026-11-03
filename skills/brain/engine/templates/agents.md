---
type: meta
tags: [meta, root]
updated: <YYYY-MM-DD>
---

# agents.md: Operating Manual for This Knowledge Base

**Owner:** <name> · <one-line description: role, business, location>
**Method:** Karpathy-style LLM knowledge base (see docs/method.md). **The LLM writes the wiki; the owner reads, curates and asks questions.** No RAG: the whole wiki fits in context (run `kb stats`).

## Layout

```
<vault>/                   ← Obsidian vault root
├── agents.md              ← this file: rules for every AI tool (CLAUDE.md points here)
├── raw/                   ← STAGE 1  sources, any format. Capture only. Never edit or delete.
├── wiki/                  ← STAGE 2  compiled knowledge (LLM-written markdown)
│   ├── index.md           ← generated topic hierarchy: start every query here
│   ├── gaps.md            ← open questions, research to do, raw files to add
│   ├── log.md             ← append-only history of every compile / file / lint pass
│   ├── <NN-folders>/      ← topic folders, each with a generated agent.md map
│   └── 07-outputs/        ← STAGE 5  filed Q&A syntheses (dated)
├── prompts/  templates/  docs/
└── scripts/kb.mjs         ← STAGE 6  index · lint · bundle · stats (bun or node)
```

## The six stages

| # | Stage | Trigger | Do this | Prompt |
|---|---|---|---|---|
| 1 | **Ingest** | New info appears | Drop it in `raw/` unchanged | — |
| 2 | **Compile** | New/changed raw files | Update or create pages, then `kb index` | [[prompts/compile]] |
| 3 | **View** | Anytime | The owner browses in Obsidian | — |
| 4 | **Query** | A question | `wiki/index.md` → relevant pages → cited answer | [[prompts/query]] |
| 5 | **File back** | New insight, decision or gap | `wiki/07-outputs/` + update pages + gaps | [[prompts/file-output]] |
| 6 | **Lint** | Weekly + after every compile | `kb lint --log`, then the LLM check | [[prompts/lint]] |

Active research: [[prompts/research]] on the "Research gaps" list in [[wiki/gaps]].

## Page contract

Every topic page follows `templates/topic-page.md`: frontmatter (`type`, `summary`, `sources`, `tags`, `up`, `updated`), a `> **Summary:**` line, key facts, then `## Open questions`, `## Conflicts`, `## Sources`, `## Related`. Links use full vault paths, e.g. `[[wiki/00-core/<page>|<page>]]` (escape `\|` inside tables). Relations are reciprocal.

## Hard rules

1. **Never invent facts.** Every claim traces to `raw/` or a filed output. Unknown → **[CONFIRM]**; undecided → **[SET]**.
2. **Never edit `raw/`.** Corrections go in the wiki, with the conflict noted.
3. Don't hand-edit generated files (`wiki/index.md`, the tables in `wiki/*/agent.md`). Run `kb index`.
4. Store filtered insight, not raw data. Keep pages under ~6K tokens.
5. Record contradictions under **Conflicts**; never silently "fix" them.
6. Log every compile, file-back and lint pass in [[wiki/log]].
7. **Never copy passwords, API keys or logins** into the wiki, prompts or third-party tools.
8. Never commit `raw/`, `wiki/`, `agents.md` or `CLAUDE.md` to the public engine repo. The `.gitignore` allowlist enforces this.

## Owner's rules

- **Priorities:** <what the owner is working toward; link the strategy/goals page>
- **Needs approval before acting:** <e.g. sending messages, spending money, publishing, quoting prices>
- **Prices you may quote:** <link to the pricing page, or "none">
- **Tone:** <link to the writing-voice page>

## Quick routes

| Task | Go to |
|---|---|
| Anything: start here | [[wiki/index]] |
| <common task> | [[wiki/<NN-folder>/<page>\|<page>]] |
| What's unknown? | [[wiki/gaps]] |

## Commands

```bash
bun scripts/kb.mjs index        # rebuild index.md, folder maps, gaps auto-section
bun scripts/kb.mjs lint --log   # health check, logged to wiki/log.md   (node works too)
bun scripts/kb.mjs bundle       # .kb/wiki-bundle.md → paste into any LLM for full-context Q&A
bun scripts/kb.mjs stats        # size + context-window fit
```
