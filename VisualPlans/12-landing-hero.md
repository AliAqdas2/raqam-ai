# 12 — Landing hero

## Problem

[`components/landing/Landing.tsx`](../components/landing/Landing.tsx):

- Long multi-section first experience; feature grid + emoji clutter.
- Manrope uppercase kickers (`PROBLEM`) fight Urdu-first branding.
- Hero should pass the brand test: remove nav and still know it’s رقم.

## Source components

1. **KokonutUI — Hero Sections** (calm, marketing)  
   https://kokonutui.pro/  
2. **Aceternity — simple Hero / Spotlight (subtle)**  
   https://ui.aceternity.com/components  

Avoid Aceternity parallax / vortex / 3D marquee for the first viewport.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Brand `ر` + رقم as hero signal | Feature bento in the first viewport |
| One promise + one CTA (اکاؤنٹ بنائیں) | Stats strips, schedules, chip clouds |
| `LandingChatDemo` as the main visual | Shader backgrounds behind body text |

## Adaptation rules

1. First viewport only: brand, one Urdu headline, one short sentence, CTA group (signup + login text link), dominant chat demo or product still.
2. Pull hero structure from Kokonut/Aceternity but restyle to warm-ledger; Nastaliq headline.
3. Defer PROBLEM / features / safety to below fold; reduce feature cards to 3 max with plain Urdu.
4. Lang toggle stays, large enough; default Urdu.
5. Motion: gentle fade/slide of headline + demo (Motion `In View`). No continuous sparkles over text.
6. Honor frontend design rules already in user rules (no purple gradients, no card-in-hero for decoration).

## Files to touch

- `components/landing/Landing.tsx`
- `components/landing/LandingChatDemo.tsx`
- COPY maps inside Landing

## Motion

One-time entrance. Chat demo may keep its existing gentle message animation.

## Success checks

- [x] Brand test passes on mobile first screen. — Hero opens with large `ر` + **رقم** before the headline; nav no longer carries the only brand signal.
- [x] Primary CTA obvious without scrolling. — **اکاؤنٹ بنائیں** (`min-h-12`) + لاگ اِن text link in the first viewport beside/above the chat panel.
- [x] Still readable for someone who only reads Urdu. — Default `ur`; Nastaliq headline; no English kickers (`PROBLEM` / `FEATURES`); below-fold features cut to 3 plain Urdu lines.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Brand first | `Landing.tsx` hero mark + brand name; demo panel also shows `ر` |
| First viewport | `min-h-[100dvh]` split: copy + full-bleed dark chat demo |
| No hero clutter | Features/problem/safety deferred; emoji feature grid removed |
| Motion | One-time fade/slide; reduced-motion skips; demo keeps gentle message loop |

`tsc` passes.
