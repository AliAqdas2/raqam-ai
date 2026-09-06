# 14 — Goals contribute card

## Problem

[`app/(app)/goals/page.tsx`](../app/(app)/goals/page.tsx):

- Contribute / Edit / Delete share equal visual weight — delete as loud as save.
- Contribute button is muted beige, not primary green.
- What-if block is a dead placeholder.
- Progress lacks plain Urdu (“آدھا ہو گیا”).

## Source components

1. **Aceternity — Expandable Cards / Cards**  
   https://ui.aceternity.com/components  
2. **Motion Primitives — Animated Number** for `currentAmount`  
   https://motion-primitives.com/docs/animated-number  
3. Progress fill — same pattern as plan 05

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| One primary: **رقم شامل کریں** (contribute) | Three equal footer buttons |
| Plain progress language | Dead what-if UI |
| Overflow menu for edit/delete | Always-visible delete |

## Adaptation rules

1. Card hierarchy: goal name (Nastaliq) → animated current / target PKR → progress bar → one green Contribute CTA.
2. Edit + Delete in a “⋯” menu (Morphing Popover or shadcn Dropdown) with Urdu items; delete still opens AlertDialog.
3. Progress caption examples: “آدھا راستہ”, “تقریباً مکمل”, “شروع ہی ہوا” based on pct bands.
4. Remove or hide what-if until implemented (dead UI violates trust).
5. Empty state: illustrated + CTA create goal (plan 03).
6. Contribute dialog: amount-first, Stateful Button submit (plan 07).

## Files to touch

- `app/(app)/goals/page.tsx`
- New: `components/goals/GoalCard.tsx` (if extracting)
- `lib/i18n/ur.ts`

## Motion

Number + bar animation on contribute success. Celebrate lightly (checkmark), not confetti explosions.

## Success checks

- [x] Primary action on every card is contribute. — Green full-width **رقم شامل کریں**; edit/delete only in ⋯ menu.
- [x] Accidental delete requires two steps (menu + dialog). — Overflow → حذف → existing `AlertDialog`.
- [x] No non-functional placeholders visible. — WHAT-IF block removed.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Hierarchy | `GoalCard`: Nastaliq name → animated current/target → spring bar + plain Urdu caption → contribute CTA |
| Progress language | `goals.progress.*` bands (شروع ہی ہوا … تقریباً مکمل) |
| Contribute dialog | Amount-first + `StatefulButton`; light check flash on card after success |
| Empty | Plan-03 `EmptyState` with create CTA |

`tsc` passes.
