# Mode: publish

Make a clean, **engine-only** copy of the vault's tooling that is safe to push to a public GitHub repo. It must never contain the owner's notes.

## Rules

- **Never** publish from the vault folder itself: its git history may contain private files. Always build a **new folder with a fresh git history**.
- Only engine files go in: `README.md`, `LICENSE`, `.gitignore` (allowlist), `package.json`, `docs/`, `prompts/`, `scripts/`, `templates/`, optionally a **fictional** `example/` vault and `.github/workflows/`.
- Never copy: `raw/`, `wiki/`, `agents.md`, `CLAUDE.md`, `.obsidian/`, `.kb/`, exports, or anything in `.gitignore`'s private list.

## Steps

1. **Ask:** target folder (sibling of the vault, e.g. `../<name>`), GitHub account and repo name, license (MIT default) and copyright holder. Make sure the target folder doesn't exist or is empty.
2. **Copy** the engine files from the vault, or from this skill's `engine/` if the vault's copies are missing. Rename `gitignore.template` to `.gitignore`.
3. **Genericise.** Replace owner-specific text in prompts, scripts and docs with neutral wording ("the owner"). Replace real paths (e.g. `C:\Users\<name>\…`) with placeholders. Owner credit is allowed only in the README credits and the LICENSE line.
4. **Personal-data scan** across the new folder. Search for the owner's name, company, emails, phone numbers, addresses, client names, registration numbers, local paths and any `[[wiki/` links to real pages. Take terms from `agents.md` and `wiki/01-identity/`. Also run the secret scan. Report every hit; fix or justify each one.
5. **Example vault (optional).** A small fictional vault (made-up person and business) that passes `node scripts/kb.mjs lint --root example` with 0 errors.
6. **Simulated user test.** Copy the folder to a temp dir, `git init`, create fake private files (`raw/x.md`, `wiki/y.md`, `agents.md`, `.kb/wiki-bundle.md`, `scripts/.env`), run `git add -A`, and confirm none of them are staged.
7. **Commit.** `git init -b main`; author = the owner's name + their GitHub noreply email (`<user>@users.noreply.github.com`), never a private email. One commit: "Initial release".
8. **Hand over the push steps:** create an empty **public** repo on GitHub (no README/license), then `git remote add origin https://github.com/<user>/<repo>.git` and `git push -u origin main`. Suggest enabling GitHub secret scanning and push protection.
