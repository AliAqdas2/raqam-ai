# 06 — Confirmation card (AI action gate)

## Problem

[`components/assistant/ConfirmationCard.tsx`](../components/assistant/ConfirmationCard.tsx):

- Param chips + Manrope tracking feel technical.
- Amount is not always the visual hero.
- Confirm / Cancel must stay unmistakable (P5 transparency).

## Source components

1. **Motion Primitives — Morphing Dialog** (enter/exit only)  
   https://motion-primitives.com/docs (Morphing Dialog)  
2. **Aceternity — Animated Modal**  
   https://ui.aceternity.com/components (Animated Modal)

Use motion for **appearance**, not for reinventing the gate. Content stays a card in the chat stream (do not force a full-screen modal that hides chat context unless on very small screens).

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Explicit Confirm + Cancel | Auto-confirm, swipe-to-accept, timed accept |
| Show what AI understood before write | Tiny badges as the only summary |
| Full-width buttons ≥48px | English-only status (`PENDING`) as primary chrome |

## Adaptation rules

1. Visual hierarchy: **Amount (huge)** → type (آمدن/خرچ) → category + date → description.
2. Replace English tracking labels with Urdu status: “تصدیق درکار”.
3. Confirm = green filled; Cancel = outline muted; equal width on mobile stacked vertically (Confirm on top).
4. Soft scale/fade entrance (150–250ms). Reduced-motion: instant.
5. On mobile &lt;640px, optionally present as bottom sheet (Morphing Dialog) still showing amount hero — chat remains in background dimmed.
6. Never animate away the card before mutation result; success → Stateful Button check (plan 07) then collapse to a short receipt line in chat.

## Files to touch

- `components/assistant/ConfirmationCard.tsx`
- `hooks/useAssistant.ts` (only if success UI needs a status prop)
- `lib/i18n/ur.ts`

## Motion

Enter/exit only. No continuous glow on the confirm button.

## Success checks

- [x] User can confirm a transaction using only the amount + two buttons.
- [x] Cancel never creates a Convex write.
- [x] Gate still matches AGENTS.md Phase 9 rules.
- [x] Works in RTL with Nastaliq amounts/labels.

### Verification notes (2026-09-06)

| Check | Evidence |
| --- | --- |
| Amount + buttons | Hero `formatPKR`; Confirm/Cancel `min-h-12` full width, Confirm first when stacked |
| Cancel = no write | `onReject` only; backdrop does not reject (avoids accidental dismiss) |
| Phase 9 gate | Still pending → confirm/reject mutations; no auto-execute |
| RTL / Nastaliq | `font-reading` on message/details; logical layout; Urdu status `تصدیق درکار` |

Mobile (&lt;640px): bottom sheet portal + in-stream amount chip. Desktop: in-stream card. `tsc` passes.
