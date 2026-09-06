# 10 — Proactive alert banner

## Problem

[`components/dashboard/ProactiveAlerts.tsx`](../components/dashboard/ProactiveAlerts.tsx):

- Multiple alert types can stack and overwhelm.
- Dismiss control is small (≈28px).
- Tone can feel like system logs rather than a friend warning you.

## Source component

**Aceternity UI — Sticky Banner**  
https://ui.aceternity.com/components (Sticky Banner)

Sticky, dismissible, high-visibility strip. Adapt to **in-page** dashboard alerts (not necessarily viewport-top chrome forever).

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| One alert at a time (queue the rest) | Stack of 4 cards on first login |
| Plain Urdu + one CTA | Jargon category IDs |
| Large dismiss (“سمجھ گیا”) | Tiny X only |

## Adaptation rules

1. Priority queue: budget 100% → budget 80% → unusual spend → bill due. Show top 1; “اگلی خبر” if more.
2. Layout: icon · short title · one sentence · primary link (e.g. Budgets) · dismiss.
3. Sticky Banner motion: slide in once; hide on dismiss; do not re-show same id this session (already dismissible — keep).
4. Touch: dismiss and CTA ≥44px.
5. Colors: warn = existing `#FDF3D8` / danger soft red — match tokens; no neon glow.
6. Settings toggles remain the kill switch (Phase 13).

## Files to touch

- `components/dashboard/ProactiveAlerts.tsx`
- Optional: `components/ui/sticky-banner.tsx`
- `app/(app)/dashboard/page.tsx` placement (top of main, below header)

## Motion

Enter/exit only. Respect reduced-motion.

## Success checks

- [x] First login never floods more than one alert. — Priority queue shows a single `StickyBanner`; remaining via **اگلی خبر**.
- [x] Illiterate-leaning user can dismiss without hunting a 12px icon. — Full-label dismiss **سمجھ گیا** / Got it, `min-h-11` (≥44px).
- [x] CTA navigates to the relevant fix screen. — Budget → `/budgets`, unusual → `/transactions`, bill → mark paid + budgets link.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| One at a time | `ProactiveAlerts` queue: over → warn → unusual → bill → summary |
| Large dismiss | `StickyBanner` text button, not tiny X |
| CTA | Green `min-h-11` links/buttons per alert kind |
| Motion | Enter/exit via framer-motion; `useReducedMotion` respected |
| Session dismiss | Existing `dismissAlert` + local `hiddenKeys` unchanged |

Dashboard placement unchanged (top of main, below header). `tsc` passes.
