# Mode: import

Bring an export (Notion, Google Docs, Evernote, Apple Notes, a folder of files) into `raw/`, then compile it.

1. **Unpack into `raw/<source>-<YYYY-MM-DD>/`**, unchanged.
   - Notion `.zip` on Windows: `python <skill>/engine/scripts/notion_extract.py "<zip>" "<vault>/raw/notion-<date>"`. It shortens Notion's long IDs and fixes links, avoiding "path too long".
   - Otherwise unzip normally. Never edit the extracted files afterwards.
2. **Credential sweep (before compiling).** Scan the import for passwords, API keys, logins, PINs and connection strings, e.g. `grep -rniE "password|passwd|api[_ -]?key|secret|token|login|pin:" raw/<import>`. Then:
   - Don't copy any of them into the wiki (the secret-scan hook blocks it in Claude Code).
   - Tell the owner exactly which files contain credentials, and recommend moving them to a password manager, rotating them, and deleting them from the source app.
   - Make sure the vault's `.gitignore` still blocks `raw/` and `*.zip`.
3. **Skip noise.** Empty pages, template stubs ("Untitled", "Getting Started") and duplicated database rows can be left uncited. List them under "Unplaced raw files" in `wiki/gaps.md`, or ask before deleting them from `raw/`. Deleting is the owner's call.
4. **Database exports (CSV):** compile one summary page per database (counts, statuses, key fields), plus one page per important record when it deserves one (e.g. each active client).
5. **Compile** with `engine/prompts/compile.md`. A whole import folder can be cited as one source (`[[raw/notion-<date>/Clients]]`); lint treats a cited folder as covering everything inside it.
6. `kb index` → `kb lint` → log `**compile**: <import> → <pages>`.
