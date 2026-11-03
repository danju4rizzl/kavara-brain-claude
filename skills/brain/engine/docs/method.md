# The Method: a self-improving LLM knowledge base

This engine follows the workflow Andrej Karpathy described in April 2026: treat the LLM as a **compiler** that turns raw information into a structured, linked Markdown wiki, rather than as a chatbot you search with.

## The six stages

| # | Stage | What happens | In this engine |
|---|---|---|---|
| 1 | **Ingest** | Dump sources into a flat folder: voice dumps, CVs, exports, articles, PDFs. Capture first, organise later. Never edit them afterwards. | `raw/` |
| 2 | **Compile** | The LLM reads raw files and writes one page per topic: summary, key facts, source attribution, links to related topics, open questions, and where sources disagree. It runs incrementally as new raw files arrive. | `prompts/compile.md` → `wiki/` |
| 3 | **View** | You read and browse the wiki as a graph. The LLM writes it; you read it. | Obsidian |
| 4 | **Query** | Ask questions in plain language with the whole wiki in context. Answers cite pages. | `prompts/query.md`, `kb bundle` |
| 5 | **File back** | Useful answers become new pages, update existing ones, or add gaps. This is what makes it self-improving. | `prompts/file-output.md` → `wiki/07-outputs/`, `wiki/gaps.md` |
| 6 | **Lint** | Regular health checks: broken links, orphans, stale pages, missing sources, contradictions, raw files not yet compiled. | `scripts/kb.mjs lint` + `prompts/lint.md` |

Optional seventh loop, **active research**: gaps found by lint or queries → a web-search-capable model finds sources → saves them to `raw/` → the next compile absorbs them. See `prompts/research.md`.

## Why no RAG?

A personal or small-team wiki is usually well under a few hundred thousand tokens once compiled, which fits in a modern long-context model. Sending the whole wiki avoids the failure modes of retrieval (chunks that miss the paragraph connecting two ideas, top-k cut-offs, embedding drift) and needs no vector database. Retrieval still makes sense at organisational scale. `kb stats` tells you whether your wiki still fits.

## Why compilation instead of summarisation?

Summaries lose detail. Compilation restructures: it keeps the specifics (names, numbers, dates, prices), adds cross-references, records contradictions instead of hiding them, and gives every page the same shape. That makes the wiki both readable for you and efficient for the model.

## Guarding against hallucination

- Every page lists its `sources`, and lint fails if a source doesn't exist.
- Unknowns are marked **[CONFIRM]** and undecided choices **[SET]**, instead of being guessed.
- Contradictions go under **Conflicts** with each side linked to its raw file.
- The LLM lint pass spot-checks claims against `raw/`.

## Design choices in this engine

- **Seeded taxonomy.** Karpathy lets the LLM choose every category. Here, a small default set of folders (core context docs, identity, operations, agents, projects, knowledge, playbooks, outputs) gives AI agents stable paths to route to. The compile prompt can still add or merge folders.
- **Generated maps.** `wiki/index.md` and each folder's `agent.md` are rebuilt from page frontmatter by `kb index`, so they never drift.
- **`agents.md` operating manual.** Every AI tool reads it first: layout, page contract, hard rules and the owner's personal rules.
- **Privacy by default.** The `.gitignore` is an allowlist: only engine files can be committed. Your `raw/` and `wiki/` stay local unless you deliberately version them somewhere private.
