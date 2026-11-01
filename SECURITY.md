# Security & Privacy Policy

Kavara Brain for Claude helps manage people's private notes, so privacy bugs are treated as security bugs.

## What counts

- Anything that could cause **private vault files** (`raw/`, `wiki/`, `agents.md`, `CLAUDE.md`, `.kb/`, `.obsidian/`) to be committed or pushed to a public repository.
- Prompts or scripts that copy **passwords, API keys, tokens or logins** into the wiki, or fail to flag them.
- Scripts that send vault content anywhere over the network (the engine scripts never should).
- **Guard bypasses:** any way a hook in `hooks/` fails to block what this README says it blocks.

## How to report

Please **don't open a public issue** for these. Use GitHub's private reporting instead: **Security → Report a vulnerability** on this repository. Include what you did, what happened, and what you expected. Don't include real secrets or personal data; use fake ones.

You'll get an acknowledgement within 7 days. Fixes for confirmed issues are released as soon as practical and credited in the [CHANGELOG](CHANGELOG.md) unless you prefer otherwise.

## Supported versions

Only the latest release of each product receives fixes.

## If you leaked something yourself

1. **Rotate** any exposed password or key immediately. Removing it from git isn't enough once it has been pushed.
2. Remove the file from the repo and rewrite history (e.g. `git filter-repo`), or delete and recreate the repo.
3. Turn on GitHub **secret scanning** and **push protection** for your repositories.
