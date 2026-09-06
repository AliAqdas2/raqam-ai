# 03 — Empty states

## Problem

[`components/shared/DataStates.tsx`](../components/shared/DataStates.tsx) `EmptyState`:

- Emoji-only “illustration”; dashed card feels unfinished.
- Dashboard empty CTA sometimes **not wired** (`onAction` missing) → dead button.
- Copy can be abstract; primary action not always the create flow.

## Source components

1. **Aceternity UI — Empty States** (blocks)  
   https://ui.aceternity.com/components (Empty States)  
2. **21st.dev / shadcn Empty**  
   https://21st.dev/@shadcn/components/empty  

Compose: `Empty` + `EmptyMedia` + `EmptyTitle` + `EmptyDescription` + `EmptyContent` (one big Button).

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| One sentence “what’s missing” + one green CTA | Multiple competing buttons |
| Simple icon or soft illustration | Busy illustrations, tabs inside empty states |
| CTA opens the real create dialog / route | Links that only navigate to an empty list |

## Adaptation rules

1. Replace emoji with a large Lucide icon in a soft green circle (or one static SVG per domain: wallet, target, chat).
2. Title in Urdu, ≤8 words; description ≤2 short lines explaining the next step.
3. **Require** `onAction` + `actionLabel` in the TypeScript props (or make them non-optional for app empties).
4. Per-screen wiring:
   - Dashboard / Transactions → open `TransactionFormDialog`
   - Budgets → open create budget dialog
   - Goals → open create goal dialog
   - Assistant → focus composer / insert suggestion chip
5. Loading skeletons stay; do not show Empty + Skeleton together.
6. ErrorState: larger “دوبارہ کوشش” button; avoid ⚠️-only messaging.

## Files to touch

- `components/shared/DataStates.tsx`
- Call sites: `app/(app)/dashboard/page.tsx`, `transactions/page.tsx`, `budgets/page.tsx`, `goals/page.tsx`, assistant empty via `ChatEmptyState.tsx`
- Optional: `components/ui/empty.tsx` if installing shadcn Empty

## Motion

Optional soft fade-in (`In View` from Motion Primitives). No looping attention-grabbers.

## Success checks

- [x] Empty CTA always performs a real action.
- [x] No English-only empty titles when language is Urdu.
- [x] Touch target ≥48px on the CTA.
- [x] First-time user understands “اب کیا کریں؟” in under 3 seconds.

### Verification notes (2026-09-06)

| Check | Evidence |
| --- | --- |
| Real action | `actionLabel` + `onAction` required; dashboard opens `TransactionFormDialog`; budgets/goals/recurring open create dialogs; import triggers file picker; transactions add or clear filters |
| Urdu titles | All empty copy via `t(...)` keys in `ur.ts` |
| Touch ≥48px | CTA `min-h-12` (48px); ChatEmptyState suggestion chips also `min-h-12` |
| Clear next step | One icon + short title + one green button; no Empty+Skeleton together on dashboard |

`npx tsc --noEmit` passes after changes.
