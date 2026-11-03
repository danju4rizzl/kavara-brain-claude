---
name: brain
description: Build and run a Karpathy-style, privacy-first LLM second brain (raw/ → compiled wiki/ → Obsidian), and run any of its modes. Use when the user wants to set up or install a second brain, knowledge base or Obsidian wiki; compile or import notes (Notion, Google Docs, voice dumps, CVs); ask questions from their wiki; file an answer back; run a health check or lint; research gaps; publish a clean engine to GitHub; or set up weekly automated checks. Also use whenever the working folder contains agents.md plus wiki/ and raw/.
---

# Kavara Brain

A second brain the AI **writes** and the owner **reads**. Six stages: ingest (`raw/`) → compile (`wiki/`) → view (Obsidian) → query → file back → lint. No RAG: the whole wiki fits in context. The method is in `engine/docs/method.md`.

## Where things are

- **Engine** (pinned, never edit): `engine/` next to this file: `prompts/`, `scripts/kb.mjs`, `scripts/notion_extract.py`, `templates/`, `docs/`, `gitignore.template`, `ENGINE_VERSION`.
- **A vault** is any folder with `wiki/` plus `agents.md` or `raw/`. Its own `agents.md` is the owner's operating manual. **Read it before anything else** and follow it over this file where they differ.
- **Script:** use the vault's own `scripts/kb.mjs` if present, otherwise `node <this skill>/engine/scripts/kb.mjs <cmd> --root <vault>`. Commands: `index`, `lint [--json] [--log]`, `bundle`, `stats`.

## Pick the mode

| User wants… | Mode | Read |
|---|---|---|
| A new second brain in this folder | **install** | `references/install.md` |
| New files in `raw/` turned into wiki pages | **compile** | `engine/prompts/compile.md` |
| A Notion / Google Docs / other export brought in | **import** | `references/import.md` |
| An answer from the wiki | **ask** | `engine/prompts/query.md` |
| An answer, decision or new fact saved into the wiki | **file-back** | `engine/prompts/file-output.md` |
| A health check / lint | **check** | `engine/prompts/lint.md` + delegate the semantic pass to the **brain-auditor** agent when available |
| Gaps closed with web research | **research** | `engine/prompts/research.md` |
| A clean public engine copy for GitHub | **publish** | `references/publish.md` |
| Automatic weekly checks | **weekly** | `references/weekly.md` |

No vault in the folder and the request is about one? Offer **install**. Unsure which mode? Ask one short question.

## Hard rules (every mode)

1. **Never invent facts.** Every claim traces to `raw/` or a filed output. Unknown fact → **[CONFIRM]**; undecided choice → **[SET]**.
2. **`raw/` is append-only.** Add new sources under new names; never edit, overwrite or delete existing ones. Corrections go in the wiki, with the disagreement under `## Conflicts`.
3. **Never copy passwords, API keys, tokens or logins** anywhere in the vault, prompts or third-party tools. Write "stored in password manager" and tell the owner which source holds it.
4. **Follow the page contract** (`engine/templates/topic-page.md`): frontmatter `type, summary, sources, tags, up, updated`; sections `## Open questions`, `## Conflicts`, `## Sources`, `## Related`. Use full-path links (`[[wiki/00-core/x|x]]`, escape `\|` in tables) and keep relations reciprocal.
5. **Don't hand-edit generated files** (`wiki/index.md`, the tables in `wiki/*/agent.md`, the auto block in `wiki/gaps.md`). Run `kb index`.
6. **After every change:** `kb index` → `kb lint` → fix errors → one line in `wiki/log.md`.
7. **Privacy:** never stage `raw/`, `wiki/`, `agents.md`, `CLAUDE.md`, `.kb/` or `.obsidian/` in a public repo. The vault's `.gitignore` is an allowlist; keep it.
8. **Approval gates:** follow the owner's rules in `agents.md`. Ask before anything irreversible or outward-facing.

## Guard hooks (Claude Code)

This plugin's hooks enforce rules 2, 3, 6 and 7 automatically: status on session start, raw/ append-only, secret scan, auto index + lint after wiki edits, git privacy guard, and a log reminder at the end. If a hook blocks you, **fix the cause**; don't work around it. In hosts without hooks, follow the rules yourself and run `kb lint` before finishing.
