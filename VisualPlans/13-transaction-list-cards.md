# 13 — Transaction list cards

## Problem

[`app/(app)/transactions/page.tsx`](../app/(app)/transactions/page.tsx):

- Desktop table (`min-width: 800`) and dense filters intimidate.
- Mobile edit/delete are tiny text links.
- Source badges (`manual`, `conversational`) are jargon.

## Source components

1. **Aceternity — Expandable Cards** (progressive disclosure)  
   https://ui.aceternity.com/components (Expandable Cards)  
2. **21st.dev / shadcn Item / Empty patterns** for list rows  

Use expandable cards so the default view is **amount + category + date**; details on tap.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Card-first list (especially mobile) | Power-user filter bar always open |
| Amount as the largest text | Source jargon badges |
| One primary per row (edit) ; delete behind confirm | Equal-weight edit/delete |

## Adaptation rules

1. Default UI: simple list of cards. Filters collapsed behind “فلٹر” button (sheet).
2. Card content: category icon · Urdu description · **Rs. amount** · relative/simple date.
3. Expandable Cards: tap reveals notes, source (mapped to Urdu: “خود لکھا”, “معاون”, “آواز”, “درآمد”), edit + delete.
4. Header CTA opens `TransactionFormDialog` directly (not merely `/transactions`).
5. Friendlier empty state wired (plan 03).
6. Soft list stagger on load (Motion `Animated Group`) — max ~50ms delay; reduced-motion off.

## Files to touch

- `app/(app)/transactions/page.tsx`
- New: `components/transactions/TransactionCard.tsx`
- `components/transactions/TransactionFormDialog.tsx` (amount-first field order if needed)
- `lib/i18n/ur.ts` — source labels, filter

## Motion

Expand/collapse height animation only. No 3D tilt.

## Success checks

- [x] User finds a transaction’s amount without horizontal scroll on 320px. — Card list only; amount is largest text (`text-[18px]`), no `min-w-[800px]` table.
- [x] Filters optional — zero-filter path works. — Default shows all cards; **فلٹر** opens sheet; empty path still add via header CTA.
- [x] Delete still requires confirmation dialog. — Expand → Delete → existing `DeleteConfirmDialog` unchanged.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Amount-first cards | `TransactionCard.tsx` — icon · desc · amount · date; expand for source/notes/actions |
| Filters collapsed | `FilterSheet` behind toolbar button |
| Friendly sources | خود لکھا / معاون / آواز / رسید / درآمد |
| Edit primary | Green full-width Edit; Delete secondary outline |
| Form | Amount field before type toggle |

`tsc` passes.
