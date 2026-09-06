# 08 — Onboarding stepper

## Problem

[`app/onboarding/page.tsx`](../app/onboarding/page.tsx):

- Progress is dots only — no “قدم ۱ از ۳”.
- English placeholders (`85,000`).
- Skip vs Next compete; step 3 has two finish paths.

## Source components

1. **Aceternity — Multi Step Loader** (progress metaphor)  
   https://ui.aceternity.com/components (Multi Step Loader)  
2. **21st.dev / shadcn stepper blocks** (bottom bar mobile stepper)  
   https://www.shadcn.io/blocks/stepper-bottom-bar-mobile  

Use a **numbered Urdu stepper** + fixed bottom Next/Back — not a flashy loader that blocks the form.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| 3 short steps with one question each | Multi-branch wizards |
| Large numeric inputs | English-only placeholders |
| One primary CTA (“اگلا”) | Equal-weight Skip + Next + Finish |

## Adaptation rules

1. Header always shows: `قدم ۱ از ۳ — آمدنی` (etc.) in Urdu.
2. Visual stepper: 3 large circles with numbers; completed = check; active = filled green.
3. Placeholders: Urdu hints (“مثال: ۵۰،۰۰۰”) or empty with helper text under the field — not Latin-only examples.
4. Primary: اگلا / ختم کریں (Stateful Button). Secondary: بعد میں (text button, not competing green).
5. Step 3: one finish path that lands on Assistant with a pre-filled suggestion chip.
6. Optional: Multi Step Loader **only** on the brief “saving…” moment after final submit — then redirect.

## Files to touch

- `app/onboarding/page.tsx`
- New: `components/onboarding/StepHeader.tsx`
- `lib/i18n/ur.ts`

## Motion

Step cross-fade / slide with RTL awareness (`x` direction flips). Reduced-motion: hard cut.

## Success checks

- [x] User always knows which step and how many remain. — `StepHeader` shows `قدم N از ۳ — …` plus 3 numbered circles (check when done, green ring when active).
- [x] Can complete without reading English. — Urdu placeholders/hints (`مثال: ۵۰،۰۰۰`); labels use روپے; primary اگلا / ختم کریں.
- [x] Skip does not feel like the main button. — `بعد میں` is underline text only on step 1; step 3 has one primary finish → Assistant with `?draft=` prefilled + matching suggestion chip highlight.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Step awareness | `components/onboarding/StepHeader.tsx` + `onboarding.step.1/2/3` keys |
| No English required | Placeholders/hints in `ur.ts`; Latin `85,000` / `Rs. —` removed |
| Skip vs primary | Ghost underline secondary; green `StatefulButton` only for Next/Finish |
| Finish path | `finishToAssistant` → `/assistant?draft=…`; composer + `ChatEmptyState` highlight |

RTL step slide flips with `dir`; `prefers-reduced-motion` hard-cuts. `tsc` passes.
