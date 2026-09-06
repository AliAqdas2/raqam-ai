# 05 — Budget progress bar

## Problem

Budget utilization in [`app/(app)/budgets/page.tsx`](../app/(app)/budgets/page.tsx) and dashboard widgets:

- Color alone (green→red) without plain Urdu story.
- Instant fill; no sense of “how full”.
- Small remaining amounts; icon-only edit/delete on desktop.

## Source components

1. **Motion** width/layout animation on the fill bar (framer-motion already installed)  
   https://motion.dev/
2. Optional visual cue: **Motion Primitives — Border Trail** only on the *warning* card, not every row  
   https://motion-primitives.com/docs (Border Trail)

Prefer a custom `BudgetProgressBar` built with Motion `animate={{ width: `${pct}%` }}` over flashy trails.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Traffic-light meaning + text (“80٪ ہو گیا — محتاط رہیں”) | Color-only status |
| Large “باقی: Rs. X” | Glowing borders on every row |
| Labeled Edit / Delete on mobile | 32px icon-only controls as sole affordance |

## Adaptation rules

1. Structure per category row: icon · Urdu name · **باقی Rs.** (dominant) · thin track · spent/limit in smaller type.
2. Animate fill from 0→pct on mount / when pct changes; `prefers-reduced-motion`: set width instantly.
3. Threshold copy (not just color):
   - &lt;60%: “ٹھیک جا رہے ہیں”
   - 60–79%: “نصف سے زیادہ”
   - 80–99%: “حد قریب”
   - ≥100%: “حد پار — اب محتاط”
4. At ≥80%, optional soft Border Trail or pulse once (not infinite) to draw eye — then stop.
5. Keep AGENTS.md thresholds (80% warn, 100% alert) aligned with `ProactiveAlerts`.

## Files to touch

- New: `components/budgets/BudgetProgressBar.tsx`
- `app/(app)/budgets/page.tsx`
- Dashboard budget widget section in `app/(app)/dashboard/page.tsx`
- `lib/i18n/ur.ts` — status phrases

## Motion

`transition={{ type: "spring", stiffness: 120, damping: 20 }}` on width. No shimmer loops.

## Success checks

- [x] User can answer “کتنا بچا ہے؟” without reading the percentage.
- [x] Colorblind-safe: text status still works if colors fail.
- [x] Animation does not misrepresent pct (ends on true value).

### Verification notes (2026-09-06)

| Check | Evidence |
| --- | --- |
| Remaining dominant | `BudgetProgressBar` shows `باقی` + `formatPKR(remaining)` as largest figure |
| Text status | `budgets.statusOk/Half/Near/Over` always rendered next to tone color |
| True fill | Motion animates to `Math.min(pct, 100)%`; reduced-motion sets width instantly to same value |

Files: `components/budgets/BudgetProgressBar.tsx`, budgets page list, dashboard widget. `tsc` passes.
