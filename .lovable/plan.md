

# Fix: Escaped Backticks in PortalInbox.tsx

The build error is caused by escaped backticks (`\``) on lines 161, 171, and 181 in `PortalInbox.tsx`. These should be actual template literal backticks (`` ` ``), not escaped ones.

## Change

In `src/pages/PortalInbox.tsx`, replace the three `className` callback expressions (lines 160-162, 170-172, 180-182) to use proper template literals instead of `\`...\``.

Lines affected: 161, 171, 181 — each has `\`` that needs to become a plain backtick character.

This is a single-file fix with no logic changes.

