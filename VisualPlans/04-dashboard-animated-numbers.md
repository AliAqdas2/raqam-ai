# 04 — Dashboard animated numbers

## Problem

[`app/(app)/dashboard/page.tsx`](../app/(app)/dashboard/page.tsx):

- Four stat cards at once overwhelm.
- Numbers appear instantly in Manrope; users don’t “feel” change after adding a transaction.
- Savings rate % is abstract without plain-language framing.

## Source component

**Motion Primitives — Animated Number**  
https://motion-primitives.com/docs/animated-number  

```bash
npx motion-primitives@latest add animated-number
```

Also useful: **Sliding Number** for large PKR if readability stays high.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Count-up when value changes / enters view | Scramble / flip-board / encrypted text |
| One **hero** figure (“اس مہینے کی بچت”) | Animating every tiny badge on the page |
| `formatPKR` after animation settles | Animating mid-string “Rs.” in a confusing way |

## Adaptation rules

1. Promote a single hero card: net savings or remaining budget — largest type on the page.
2. Use `AnimatedNumber` for the hero + at most 2 secondary stats (income, expense). Hide or demote savings-rate until user has data.
3. Wrap with `useInView` so animation runs once when scrolled into view (respect `prefers-reduced-motion`: show final number immediately).
4. Keep PKR formatting via `lib/i18n/format.ts`; animate the numeric value only.
5. Under each animated number, one Urdu plain line, e.g. “آپ نے جتنا کمایا اس سے کم خرچ ہوا.”
6. Do not animate category bar percentages on first paint of the whole dashboard (see plan 05).

## Files to touch

- `app/(app)/dashboard/page.tsx`
- New: `components/dashboard/HeroStat.tsx` (wraps AnimatedNumber)
- `components/ui/animated-number.tsx` (installed primitive)

## Motion

Spring options: soft stiffness; duration feel ~0.6–0.9s. Reduced-motion: skip.

## Success checks

- [x] After adding a transaction, hero number visibly updates (reassures persistence).
- [x] Reduced-motion users see static correct PKR.
- [x] Dashboard still has one clear primary CTA (“لین دین لکھیں”).
- [x] Animation never blocks interaction.

### Verification notes (2026-09-06)

| Check | Evidence |
| --- | --- |
| Updates on change | `AnimatedNumber` spring tracks `value`; Convex summary refresh re-animates hero/income/expense |
| Reduced motion | `HeroStat` uses `formatPKR` statically when `useReducedMotion()` |
| Primary CTA | Header still has add-transaction; empty state CTA unchanged |
| Non-blocking | CSS/transform only; no overlay; category bars not animated (plan 05) |

Files: `components/ui/animated-number.tsx`, `components/dashboard/HeroStat.tsx`, dashboard stats layout. `tsc` passes.
