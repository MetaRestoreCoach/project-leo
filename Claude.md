# Project instructions

## STEP 0 — Plan & Design Review (MUST DO BEFORE ANYTHING ELSE)

- **Plan completely before writing any code.** Confidence must be 90%+ or stop and ask.
- Write out the full plan: files affected, exact changes, dependencies, risks.
- Run `/design:design-critique` on the plan/design and review all recommendations.
- Incorporate critique feedback before execution — do not skip or dismiss it.
- Only proceed to execution after plan is solid and critique is considered.
- If confidence drops below 90% at any point during planning, ask clarifying questions first.

## Goal

Work on this app with minimal token usage, minimal code churn, and no hallucinations.

## Core rules

- Do not invent files, APIs, env vars, database tables, routes, or libraries.
- Follow the existing architecture and naming patterns.
- Make the smallest correct change.
- Do not rewrite unrelated code.
- Reuse existing utilities and components first.
- If something is missing, say exactly what file or information is needed.
- If confidence is low, say what is unverified.

## Output rules

- Start with a short plan, 3-5 bullets max.
- Then give assumptions/unknowns.
- Then give only changed code or diff-style edits.
- End with a short verification checklist.
- Keep responses concise.

## Security rules

- Never expose secrets, keys, tokens, passwords, or private URLs.
- Do not hardcode credentials.
- Validate inputs at trust boundaries.
- Flag auth, payment, file upload, admin, and PII risks.
- Prefer server-side enforcement over client-side trust.
- Ask before making breaking or security-sensitive changes.

## Token-saving rules

- Prefer patching over rewriting.
- Do not print unchanged code.
- Do not add dependencies unless necessary.
- For large tasks, do phase 1 first.
- If the thread gets long, provide a compact carry-forward summary.

## Code quality

- Preserve backward compatibility unless approved.
- Add only necessary comments.
- Update only relevant tests.
- If no tests exist, provide one minimal high-value test.

## Bug-prevention process (MANDATORY — follow every time)

- **Always read the file before changing it.** No exceptions. Confirm what you see before writing any code.
- **Approve the plan first.** Give a 3-5 bullet plan + every file that will change. Wait for explicit approval before writing a single line.
- **Patch only.** Show only the exact lines changing. If the change cannot be expressed as a small patch, the scope is wrong — stop and re-plan.
- **One file at a time.** Wait for confirmation that each file looks correct before moving to the next.
- **Verify after.** Re-read the changed section after editing and check for regressions before calling it done.

## Confidence rule (CRITICAL)

- If confidence in the correct fix is below 90%, do NOT change any code.
- Instead, ask clarifying questions: what file is involved, what the expected behavior is, what the current behavior is, or request to read additional files.
- Never guess at a fix. A wrong change costs more tokens than a question.

## Sequential change rule (CRITICAL)

- Even if multiple changes are requested at once, work on ONE change at a time.
- Fix it, then wait for explicit confirmation it works before moving to the next.
- Never batch multiple changes unless the user explicitly approves doing them together.
- If a change depends on another, state the dependency and ask which to do first.

## Debugging limit rule (CRITICAL)

- If a bug fix attempt fails twice, STOP immediately.
- Do not attempt a third fix.
- Ask clarifying questions: what exact behavior is observed, what was expected, what changed recently, and request to read any additional files needed.
- Only resume making changes after receiving answers and reaching 90%+ confidence.
