# Mode: install

Set up a new second brain in the current folder (or a folder the user names).

## 1. Check

- Folder already has `wiki/` + `agents.md`? It's a vault. Don't reinstall; offer compile or check instead.
- `node --version` (18+) or `bun --version`, and `git --version`. If Node/Bun is missing, tell the user to install Node.js LTS and stop.
- If the folder is a git repo with a remote, check whether that remote is public. A vault must stay private.

## 2. Copy the engine into the folder

Copy from this skill's `engine/` (never modify the originals):

| From `engine/` | To the vault |
|---|---|
| `prompts/` | `prompts/` |
| `scripts/` | `scripts/` |
| `templates/` | `templates/` |
| `docs/` | `docs/` |
| `package.json` | `package.json` |
| `gitignore.template` | `.gitignore` (if a `.gitignore` already exists, show the user both and merge, keeping the allowlist) |
| `ENGINE_VERSION` | `ENGINE_VERSION` |

Create empty `raw/`, `wiki/`, `wiki/07-outputs/`.

## 3. Run the engine's install prompt

Follow `engine/prompts/install.md` from **STEP 1** (interview and capture) through **STEP 6** (hand over). Rules from SKILL.md apply throughout. In STEP 5, after `git status`, confirm that only engine files are listed.

## 4. Plugin extras

- Tell the user the guard hooks are active in Claude Code for this folder: raw/ protection, secret scan, auto lint, git guard, log reminder.
- Offer **weekly** mode (`references/weekly.md`).
- If they want version history for their private notes, explain the two options: no git for notes (default), or a **private** repo with `{"privateRepo": true}` in `.kavara-brain.json`. Never a public one.
