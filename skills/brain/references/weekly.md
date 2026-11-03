# Mode: weekly

Set up an automatic weekly health check for the vault. Two parts: a **script check** that needs no AI, and an **AI check** that does.

## 1. Agree the details

Ask: day and time (in the owner's timezone; avoid the top of the hour, e.g. Monday 07:40), and how to get the report (in the chat, a notification, or only `wiki/log.md`).

## 2. Script check (deterministic, always works)

The command, run from the vault: `node scripts/kb.mjs index && node scripts/kb.mjs lint --log`.

Offer to schedule it with the OS:
- **Windows (Task Scheduler):** `schtasks /Create /SC WEEKLY /D MON /ST 07:40 /TN "Kavara Brain lint" /TR "cmd /c cd /d \"<vault>\" && node scripts\kb.mjs index && node scripts\kb.mjs lint --log"`
- **macOS/Linux (cron):** `40 7 * * 1 cd "<vault>" && node scripts/kb.mjs index && node scripts/kb.mjs lint --log`

Show the exact command and run it only with the owner's approval.

## 3. AI check (the full health check)

If the host has a **scheduled-task** feature (e.g. the Claude app's scheduled tasks), create a weekly task that runs on the owner's computer with this prompt, filling in the vault path:

```
Weekly Kavara Brain check for the vault at <vault>.
1. Read agents.md. Run: node scripts/kb.mjs index, then node scripts/kb.mjs lint --json.
2. Fix only safe, mechanical problems yourself: broken links with an obvious target, missing reciprocal
   Related links, regenerated maps. Never change facts, prices or decisions; never touch raw/.
3. Run the semantic check from prompts/lint.md (contradictions, ungrounded claims, outdated facts,
   duplication, missing topics, research gaps). Use the brain-auditor agent if available.
4. Update wiki/gaps.md (research gaps, raw files to add). Append one line to wiki/log.md: "**lint**: <summary>".
5. Report to the owner in under 12 lines: errors fixed, issues needing their judgement (with page links),
   pages not updated in 30+ days, top 5 open questions, and anything urgent (deadlines).
```

If no scheduler is available, give the owner the script check (part 2) plus a one-line reminder to run `/kv-brain:check` weekly.

## 4. Confirm

Tell the owner what was scheduled, when it runs, where the report appears, and how to change or remove it.
