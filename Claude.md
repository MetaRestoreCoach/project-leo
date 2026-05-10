# Project instructions

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
