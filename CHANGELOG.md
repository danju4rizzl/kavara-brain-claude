# Changelog

All notable changes to Kavara Brain for Claude. Format: [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

## [0.1.0] - 2026-11-01

### Added
- **Skill `kavara-brain`** with 9 modes: install, compile, import, ask, file-back, check, research, publish, weekly.
- **Slash commands:** `/brain-install`, `/brain-compile`, `/brain-import`, `/brain-ask`, `/brain-file`, `/brain-check`, `/brain-research`, `/brain-publish`, `/brain-weekly`.
- **Agent `brain-auditor`:** independent, read-only semantic review with grounding spot-checks.
- **Guard hooks:** session status; `raw/` append-only; secret scan on writes; git guard for private files and secrets (checks the full outgoing history on push); auto index + lint after wiki edits; log reminder on stop. All fail open.
- **Vendored engine:** Kavara Brain Engine 1.0.0 (`second-brain@e3a6e56`) in `skills/kavara-brain/engine/`.
- 32 automated guard tests (`node test/run.mjs`) and a GitHub check.
- Docs: README, FAQ & troubleshooting, SECURITY, release notes.
