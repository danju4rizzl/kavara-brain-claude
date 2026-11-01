# FAQ & Troubleshooting: Kavara Brain for Claude

General questions (what to feed it, `[CONFIRM]`/`[SET]`, conflicts, Obsidian, privacy) are answered in the [engine FAQ](https://github.com/danju4rizzl/second-brain/blob/main/docs/FAQ.md). This page covers the plugin.

## Install

**What's the install command?**
In Claude Code:
```
/plugin marketplace add danju4rizzl/second-brain
/plugin install kavara-brain@kavara-brain
```
(`/plugin marketplace add danju4rizzl/kavara-brain-claude` works too; both point to the same plugin.) Then open a folder and run `/brain-install`.

**Claude desktop app?**
Download `kavara-brain.plugin` from [Releases](https://github.com/danju4rizzl/kavara-brain-claude/releases) and install it. Skills, commands and the auditor agent work; guard hooks may only partly work in the desktop app, so the rules are also built into the skill and your `agents.md`.

**Do I also need to clone the engine?**
No. The plugin carries a pinned copy of the engine and copies it into your folder during `/brain-install`.

**How do I update?**
`/plugin marketplace update kavara-brain`, then reinstall or update the plugin. Your vault's own copy of the engine stays as it was; ask Claude to "update the engine files from the plugin" if you want the newer prompts and scripts.

## Commands

| Command | Use it when |
|---|---|
| `/brain-install` | Starting a new second brain in an empty or new folder |
| `/brain-compile` | You've added files to `raw/` |
| `/brain-import` | You have a Notion / Google Docs / other export |
| `/brain-ask` | You want an answer from your wiki |
| `/brain-file` | You want to keep an answer, decision or new fact |
| `/brain-check` | Weekly, or after a big compile |
| `/brain-research` | `wiki/gaps.md` has research questions |
| `/brain-publish` | You want to share your *engine* (never your notes) on GitHub |
| `/brain-weekly` | You want the check to run automatically |

You can also just ask in plain words ("compile my new notes"); the skill picks the mode.

## Guard hooks

**What do the hooks do?**
They only act inside a vault (a folder with `wiki/` plus `agents.md` or `raw/`):
- show a status line at session start
- block edits to existing `raw/` files
- block writing anything that looks like a password, key, token or login
- block committing or pushing private files or secrets (including private files in older commits)
- rebuild the index after wiki edits and report broken links
- remind Claude to log wiki changes before it finishes

**A hook blocked something I actually wanted.**
- *Editing a raw file:* by design. Raw sources are evidence. Put the correction in the wiki page and note it under `## Conflicts`, or save a corrected version as a **new** raw file.
- *Secret scan false alarm:* rephrase (e.g. "stored in password manager"), or use an obvious placeholder like `<api-key>`, `[CONFIRM]` or `********`, which the scanner ignores.
- *Git guard on a private notes repo:* add `{"privateRepo": true}` to `.kavara-brain.json` at that repo's root. Only do this if the repo is **private**.

**The hooks don't seem to run.**
1. Check Node.js 18+ is installed: `node --version`. The hooks run `node`; if it's missing they silently allow everything (they never lock you out).
2. Make sure you're inside a vault folder.
3. Check the plugin is enabled: `/plugin`.
4. Debug: `echo '{"cwd":"."}' | node <plugin>/hooks/guard.mjs session-start`. Set `KAVARA_BRAIN_DEBUG=1` to print internal errors.

**Will the hooks slow Claude down?**
Barely. Most checks take milliseconds; the post-edit index + lint runs only after edits to `wiki/` pages and takes about a second on a few-hundred-page wiki.

**Do the hooks affect my other projects?**
No. Outside a vault every hook exits immediately without doing anything.

## Other AI tools

Cursor, Codex, Antigravity and Grok Build users should use the [engine](https://github.com/danju4rizzl/second-brain) directly. Hard guards for those tools are planned in **Kavara Brain Guard**.

## Reporting problems

Bugs: open an issue. Security or privacy problems: see [SECURITY.md](../SECURITY.md).
