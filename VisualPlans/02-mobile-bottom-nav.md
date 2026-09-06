# 02 — Mobile bottom navigation

## Problem

[`components/layout/sidebar.tsx`](../components/layout/sidebar.tsx) `MobileBottomNav`:

- Labels at `text-[10px]` — hard to read for low-literacy users.
- Settings and Import are **missing** — dead ends for phone users.
- No obvious “add money / speak to assistant” action.
- Competes with assistant composer (`pb-16`).

## Source components

1. **Motion Primitives — Dock** (structure only)  
   https://motion-primitives.com/docs (Dock)  
2. **Aceternity — Floating Dock / Notch** (reference for active indicator)  
   https://ui.aceternity.com/components (Notch, Floating Dock)

Do **not** ship a Mac-style icon-only dock. Borrow **active-state animation** and spacing; keep **always-visible Urdu labels**.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Fixed bottom bar, 5 primary destinations | Icon-only dock; hover magnification |
| Center hero action: Assistant (or “جمع کریں”) | Tiny 10px captions |
| “مزید” (More) sheet for Import + Settings | Hiding critical money tools |

## Adaptation rules

1. Tab set (suggested): گھر · لین دین · **معاون** (center, raised) · بجٹ · مزید  
   - Goals live under More or under Budgets if we must stay at 5.
2. Labels ≥12–13px Nastaliq/UI font; icon ≥22px; min tap height 52px including label.
3. Active tab: filled pill + short Motion layout animation (spring soft, ≤200ms).
4. “More” opens a simple bottom sheet (shadcn Dialog/Sheet): Import, Goals, Settings — large rows, icons, Urdu only.
5. Safe-area padding for notched phones; bar must not cover ConfirmationCard buttons (assistant page adds extra bottom padding when confirm UI open).
6. Optional: long-press center = voice (only if discoverable with a one-time Urdu tip).

## Files to touch

- `components/layout/sidebar.tsx` (`MobileBottomNav`)
- New: `components/layout/MobileMoreSheet.tsx`
- `app/(app)/layout.tsx` — padding tokens if bar height changes
- `lib/i18n/ur.ts` / `en.ts`

## Motion

Active indicator `layoutId="mobile-tab"` via framer-motion. No continuous bounce.

## Success checks

- [x] A new user can open Settings on a phone without the desktop sidebar.
- [x] Assistant is the most obvious tab.
- [x] Labels readable at 320px width.
- [x] No overlap with toasts or confirm buttons.
- [x] One-thumb reachable primary actions.

### Verification notes (2026-09-06)

| Check | Evidence |
| --- | --- |
| Settings on phone | `MobileMoreSheet` → Settings row; More tab always in bar |
| Assistant obvious | Raised center FAB (`-top-5`), green/gold, largest control |
| Labels ≥12px | Side tabs `text-[12px]`, icons `22px`, min tap `52px` |
| No overlap | Main `pb-[calc(4.5rem+safe-area)]`; toasts sit above bar on mobile |
| Reachability | 5 thumb-zone tabs; Goals/Import/Settings one tap via More |

`npx tsc --noEmit` passes after changes.
