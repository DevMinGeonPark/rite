# Open Questions: Rite Loop

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q1 | Default runner command/flags for headless Claude Code (`claude -p ... --output-format json`)? Version-dependent. | architect | open | Make it a config string (`loop.runner`); verify flags against the installed CLI during task-004, do not hardcode assumptions. |
| Q2 | Where do loop reports notify the user (terminal only vs Telegram hook)? | product_analyst | open | v0.2 ships file + stdout report; add optional `loop.on_report` shell hook so any notifier can be wired without coupling. |
| Q3 | ROLLBACK semantics (auto git revert on hard failure)? | architect | resolved → deferred | Out of v0.2 (ADR 002); HOLD + preserved diff is safer until promote/hold behavior is proven. |
| Q4 | Should the verifier be a *separate* runner invocation (true actor split)? | adversarial_reviewer | open | v0.2: separate verify step in a fresh runner session (weak split); same-binary limitation documented honestly. True cross-model verify is future work. |

> Open questions must not be silently converted into assumptions. Q1/Q2 are
> wired as config seams precisely so the loop does not depend on their answers.
