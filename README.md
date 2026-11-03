# Kavara Brain for Claude

A Claude plugin that builds and runs a **privacy-first, self-improving second brain**: the AI compiles your raw notes into a linked Markdown wiki you read in Obsidian, answers questions from it, files new insights back in, and keeps it healthy. It follows Andrej Karpathy's LLM knowledge-base workflow (raw → compile → view → query → file back → lint).

Part of the **Kavara Brain** suite by [Kavara Digital Global](https://kavaradigital.com):

| Product | What it is |
|---|---|
| [Kavara Brain Engine](https://github.com/danju4rizzl/second-brain-core) | The tool-agnostic core and **the one link to share**: prompts, scripts, templates. Works with any AI coding tool. |
| **Kavara Brain for Claude** (this repo) | The engine plus a Claude skill, slash commands, an auditor agent and guard hooks |
| Kavara Brain Guard *(planned)* | MCP server + git hooks: the same guards for Cursor, Antigravity, Codex, Grok Build |
| Kavara Brain Sync *(planned)* | Encrypted private sync of your notes across computers |

## What you get

- **One skill, nine modes**, each with a slash command:

  | Command | Does |
  |---|---|
  | `/kv-brain:install` | Interviews you, copies the engine in, compiles your first wiki, writes your `agents.md` |
  | `/kv-brain:compile` | Turns new files in `raw/` into wiki pages (sources, open questions, conflicts) |
  | `/kv-brain:import` | Brings in Notion / Google Docs / other exports, with a credential sweep first |
  | `/kv-brain:ask` | Answers from the whole wiki with page citations |
  | `/kv-brain:file` | Saves an answer or decision back into the wiki (the self-improving loop) |
  | `/kv-brain:check` | Lint script + an independent **brain-auditor** agent review |
  | `/kv-brain:research` | Closes research gaps with web sources |
  | `/kv-brain:publish` | Makes a clean, engine-only copy safe for public GitHub |
  | `/kv-brain:weekly` | Schedules automatic weekly checks |

- **Guard hooks** (Claude Code), active only inside a vault:

  | Hook | Guard |
  |---|---|
  | Session start | Injects vault status (pages, open questions, lint errors, days since last check) |
  | Before file writes | `raw/` is append-only; blocks anything that looks like a password, API key, token or login |
  | Before `git add/commit/push` | Blocks private files (`raw/`, `wiki/`, `agents.md`, …) and secrets from being committed or pushed |
  | After wiki edits | Rebuilds the index and folder maps; reports broken links and orphans for that page |
  | End of response | Reminds the AI to log wiki changes in `wiki/log.md` |

  The guards fail open: if Node is missing or a check errors, they never lock you out.

## Install

**Claude Code**

```
/plugin marketplace add danju4rizzl/second-brain-core
/plugin install kv-brain@kavara
```

(The engine repo is the single front door; `/plugin marketplace add danju4rizzl/kavara-brain-claude` also works.)

Then open (or create) a folder and run `/kv-brain:install`.

**Claude desktop app:** install the `.plugin` file from the [Releases](https://github.com/danju4rizzl/kavara-brain-claude/releases) page. The skill, commands and agent work there; hook support in the desktop app may be partial, so the same rules are also written into the skill and your `agents.md`.

**Requirements:** Node.js 18+ (or Bun) and git. Obsidian is recommended for reading.

## Privacy model

- Your vault (`raw/`, `wiki/`, `agents.md`) **never** goes to a public repo. The vault's `.gitignore` is an allowlist, and the git hook blocks private paths even if someone forces them.
- Want version history for your notes? Use a **private** repo and add `{"privateRepo": true}` to `.kavara-brain.json` in that repo. Secrets are still blocked.
- Credentials found in imports are reported to you, never copied.

## For other AI tools

Cursor, Codex, Antigravity, Grok Build and others can use the [engine](https://github.com/danju4rizzl/second-brain-core) directly (`AGENTS.md` + prompts + scripts). The hard guards for those tools are coming in **Kavara Brain Guard**.

## Docs

- [FAQ & troubleshooting](docs/FAQ.md) · [Changelog](CHANGELOG.md) · [Security & privacy reports](SECURITY.md) · [Release notes v0.2.0](docs/releases/v0.2.0.md)

## Development

```bash
node test/run.mjs     # 32 guard tests on a throwaway vault
```

The engine is vendored, unmodified, in `skills/brain/engine/` (see `ENGINE_VERSION`). To update it, copy a released engine version over that folder (rename `.gitignore` to `gitignore.template`), bump `ENGINE_VERSION` and the plugin version, and run the tests.

### Releasing

Releases are automatic. Add a `## [x.y.z] - YYYY-MM-DD` entry at the top of `CHANGELOG.md`, set the same version in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, and push to `main`. The [release workflow](.github/workflows/release.yml) runs the tests, builds `kv-brain.plugin`, tags `vx.y.z` and publishes a GitHub release with the file attached. The notes come from `docs/releases/vx.y.z.md` if it exists, otherwise from the CHANGELOG entry. Pushes that don't change the version do nothing.

## License

[MIT](LICENSE) © 2026 Danjuma Ashiwaju-Garba
