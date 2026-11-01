---
type: meta
tags: [meta, prompt]
stage: 0-install
---

# Prompt: Install a new second brain

Run this once, in the folder where you cloned the engine. In Claude Code, Cursor, Codex or Aider, just say:
**"Read prompts/install.md and follow it."**

```
You are installing a Karpathy-style self-improving second brain in the current folder.
The LLM (you) writes the wiki; I read it, curate it and ask questions. Work step by step,
show me what you're doing, and never invent facts about me.

STEP 0: CHECK THE ENGINE
- Confirm these exist: prompts/ (compile, query, file-output, lint, research), scripts/kb.mjs,
  templates/. If any are missing, stop and tell me to re-clone the engine.
- Check for `bun` or `node` (18+) and `git`. Use whichever runtime exists for every command
  below (`bun scripts/kb.mjs …` or `node scripts/kb.mjs …`).
- Read docs/method.md so you understand the six stages.
- Create folders: raw/, wiki/, wiki/07-outputs/.
- Confirm .gitignore is the engine's allowlist version. My private data must never be committed.

STEP 1: INTERVIEW AND CAPTURE (stage 1: ingest)
- Ask me, in ONE message, to paste or attach any of the following (I can skip any):
  1. A voice brain dump transcript, or free-form answers to: who I am; what I do (job / business);
     my top goals for the next 12 months; who my customers or audience are; what I offer and at
     what prices; my team and partners; tools and accounts I use; active projects; how I like
     to write (plus 1–2 samples); my values and working style; things AI should never do for me.
  2. Files: CV, website copy, price list, note-app exports (Notion, Google Docs, Evernote), anything else.
     For a Notion export zip on Windows, use scripts/notion_extract.py (avoids path-too-long errors).
  3. Whether this brain is PERSONAL, BUSINESS or BOTH, and anything I want kept OUT of it.
- Save every source to raw/ UNCHANGED as raw/YYYY-MM-DD-<slug>.md (or the original file),
  with frontmatter: source_type, source, captured: <today>. Unzip exports into raw/<name>/.
  Never edit raw/ after this.
- If any source contains passwords, API keys or logins: do NOT copy them anywhere. Tell me which
  files contain them so I can move them to a password manager.

STEP 2: CHOOSE THE TAXONOMY
Start from this default and DROP folders with no material. Add new folders only when the content clearly needs them:
- wiki/00-core/   core context documents. For a business: strategy, icp (customers),
                  brand-voice, offer-pricing, team, background-mission, client-sales-history,
                  content-media-history. For a personal brain: goals, values-principles,
                  routines, relationships, finances, health, learning, writing-voice.
- wiki/01-identity/    profile/CV; legal or company records
- wiki/02-operations/  tools-and-accounts (no passwords), workflows, standards
- wiki/03-agents/      only if I want AI agents to act for me: vision, roster, approval gates
- wiki/04-projects/    one page per project
- wiki/05-knowledge/   one page per research source or topic
- wiki/06-playbooks/   repeatable step-by-step procedures
- wiki/07-outputs/     dated syntheses filed back from Q&A
Folder names use NN-kebab-case. Page names use kebab-case.

STEP 3: COMPILE (stage 2)
Follow prompts/compile.md. Every topic page MUST follow templates/topic-page.md exactly:
frontmatter (type, summary, sources, tags, up, updated), "> **Summary:**" line, key facts,
then ## Open questions, ## Conflicts, ## Sources, ## Related.
Rules:
- Wiki links always use full vault paths, e.g. [[wiki/00-core/strategy|strategy]].
  Inside Markdown tables, escape the pipe as \|.
- Relations are reciprocal: if A lists B, B lists A.
- Compile, don't summarise: keep names, numbers, dates and prices.
- Never invent a fact. Unknown → **[CONFIRM]**. Undecided choice → **[SET]**.
  Contradiction → ## Conflicts, never a silent fix.
- Store filtered insight, not raw dumps. Keep pages under ~6K tokens.
- If I asked you to decide something (e.g. a strategy), write it as a clearly labelled
  recommendation and also save it as a synthesis in wiki/07-outputs/ (templates/synthesis.md).

STEP 4: WRITE THE SCAFFOLD (copy from templates/ and fill in)
- templates/folder-map.md → wiki/<folder>/agent.md for every folder (frontmatter only;
  set title + description). The script fills in the rest.
- templates/gaps.md → wiki/gaps.md. Fill "Priority", "Raw files to add" and "Research gaps".
- templates/log.md → wiki/log.md. Add one line per pass you ran.
- templates/agents.md → agents.md at the root. Fill in every <placeholder>, especially MY personal rules
  (priorities, what needs my approval, prices you may quote, tone).
- templates/CLAUDE.md → CLAUDE.md at the root.
- templates/synthesis.md → wiki/07-outputs/<today>-setup.md: what was set up, the taxonomy chosen
  and why, and the biggest gaps.

STEP 5: INDEX, LINT, COMMIT (stage 6)
- Run: scripts/kb.mjs index, then scripts/kb.mjs lint. Fix every error and warning, then re-run until clean.
- Run: scripts/kb.mjs stats and tell me whether the wiki fits in a 128K context.
- Run `git status` and CONFIRM that only engine files are listed. raw/, wiki/, agents.md and
  CLAUDE.md must not appear. If they do, stop and warn me.
- Explain that the engine's git history covers only engine files. If I want version history for my
  private notes, suggest a separate PRIVATE repo or backup for raw/ and wiki/.

STEP 6: HAND OVER
Tell me, briefly:
1. The folders and pages you created (one line each).
2. The top 10 open questions and conflicts I should answer first.
3. The 3–5 raw files I should add next.
4. How to use it daily:
   - Add a source to raw/ → "compile the new raw files" (prompts/compile.md)
   - Ask a question → prompts/query.md, then "file that back" (prompts/file-output.md)
   - Weekly → scripts/kb.mjs lint --log, then prompts/lint.md
   - Fill gaps → prompts/research.md
5. Obsidian tips: open this folder as a vault. Settings → Files & links → New link format =
   "Absolute path in vault", Use [[Wikilinks]] = on. In Graph view, add colour groups by tag.
```
