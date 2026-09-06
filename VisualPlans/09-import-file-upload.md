# 09 — Import file upload

## Problem

[`app/(app)/import/page.tsx`](../app/(app)/import/page.tsx) + [`ImportPreviewTable.tsx`](../components/import/ImportPreviewTable.tsx):

- Spreadsheet metaphor is high-literacy.
- Upload affordance is easy to miss; preview grid overwhelms phones.
- Status badges are small.

## Source component

**Aceternity UI — File Upload**  
https://ui.aceternity.com/components (File Upload)

Minimal drag-and-drop with clear empty affordance and micro-interaction on drop.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Huge drop zone + “فائل چنیں” button (works without drag) | Drag-only upload |
| 3-step mental model: Upload → Review → Confirm | Instant commit |
| Summary “۱۲ قطاریں، ۲ دہرائی” before table | Dense editable grid as step 1 |

## Adaptation rules

1. Stepper chrome (reuse plan 08 patterns): اپ لوڈ → جانچیں → محفوظ.
2. File Upload zone: Urdu title “بینک یا CSV فائل”, accept CSV primarily; show max size in plain words.
3. After parse: show summary cards first (count, duplicates, errors); table/cards second.
4. Mobile: each row as a card (amount hero, description, toggle include) — not horizontal scroll table.
5. Confirm uses Stateful Button (plan 07); atomic import rules unchanged (AGENTS.md Phase 12).
6. Restyle Aceternity grid background to warm-ledger (`#F7F4EC`), not tech-dark.

## Files to touch

- `app/(app)/import/page.tsx`
- `components/import/ImportPreviewTable.tsx`
- New: `components/import/ImportUploader.tsx`
- `lib/i18n/ur.ts`

## Motion

Drop success pulse once; no continuous meteor/beam backgrounds.

## Success checks

- [x] Upload works with tap-to-browse only (no drag skill required). — `ImportUploader` primary CTA **فائل چنیں** opens file picker; drag is optional hint only.
- [x] User sees counts before any write. — Summary cards (rows / duplicates / skipped / selected) render above the row list; confirm still atomic via existing mutation.
- [x] Phone review does not require sideways scrolling. — `<md` uses amount-hero cards with include toggle; table only from `md:` up.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Tap upload | `components/import/ImportUploader.tsx` — large zone + `min-h-12` choose button |
| Counts first | `SummaryCard` grid in `ImportPreviewTable` before cards/table |
| No sideways scroll | Mobile card stack `md:hidden`; desktop table `hidden md:block` |
| Stepper | Reuses `StepHeader`: اپ لوڈ → جانچیں → محفوظ (`busy === "confirming"`) |
| Confirm | Existing `StatefulButton` + Phase 12 atomic `confirm` unchanged |

Warm-ledger drop zone (`#F7F4EC` + soft grid). `tsc` passes.
