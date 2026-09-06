# 01 — Sidebar (desktop navigation)

## Problem

[`components/layout/sidebar.tsx`](../components/layout/sidebar.tsx) `Sidebar`:

- Icons exist in data but are **not rendered** in `NavItem` — users get text-only dense rows.
- Dual labels (Urdu + tiny English caps like `HOME`, `TXNS`) look technical.
- Seven links + section headers + landing link inside the authenticated app confuse “where am I?”
- Active state is subtle for low-literacy scanning.

## Source component

**Aceternity UI — Sidebar**  
https://ui.aceternity.com/components/sidebar  
Install pattern: `npx shadcn@latest add @aceternity/sidebar`

Uses `SidebarLink` with **icon + label**, open/close animation, mobile drawer support.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Large icon + Urdu label on every row | Do **not** use hover-only collapse that hides labels by default |
| Clear active highlight (filled gold/green pill) | Drop English `HOME` / `TXNS` chips (or hide behind long-press for power users) |
| Brand mark `ر` + `رقم` in Nastaliq | Remove “Landing” from authenticated sidebar; Settings stays last |
| Always-open labels on desktop (≥1024px) | `animate={false}` or default `open={true}` so labels never disappear on first paint |

## Adaptation rules

1. Map existing routes to `Links[]`: `{ label, href, icon }` with Lucide icons already imported in the file.
2. Promote **معاون (Assistant)** visually (slightly larger row or gold accent) — it is the product’s literacy bridge.
3. Group: primary (Dashboard, Assistant, Transactions) → money (Budgets, Goals) → tools (Import, Settings). Max 2 section labels in Urdu only.
4. Preserve Clerk user block + sign-out at bottom; increase hit target ≥44px.
5. Keep existing warm-ledger colors (`#0B3B26` sidebar); restyle Aceternity defaults to match tokens in `app/globals.css`.
6. RTL: icons on the start side; use logical properties (`ps`/`pe`), not hardcoded `left`.

## Files to touch

- `components/layout/sidebar.tsx` (primary)
- Optional extract: `components/layout/AppSidebar.tsx` if Aceternity primitives land under `components/ui/sidebar-aceternity.tsx`
- `lib/i18n/ur.ts` / `en.ts` — nav labels only if keys change

## Motion

Subtle `layout` / opacity on open (framer-motion already in repo). No magnetic / glow borders.

## Success checks

- [x] Every nav row shows icon + Urdu label without hovering.
- [x] Active route is obvious at arm’s length on a laptop.
- [x] English chips gone from default view.
- [x] RTL layout intact; no clipped Nastaliq descenders.
- [x] Keyboard focus ring visible on each link.
- [x] Does not increase clicks to reach Assistant or Dashboard.

### Verification notes (2026-08-31)

| Check | Evidence |
| --- | --- |
| Icon + label | `NavItem` always renders Lucide `Icon` + `label`; no hover/collapse gate; desktop `lg:flex` always-open |
| Active obvious | Gold `#E8B931` fill + `font-semibold` + `aria-current="page"` + spring `layoutId="sidebar-active-pill"` |
| No English chips | No `en` prop / `HOME`/`TXNS`/etc.; landing/`Rocket` removed from authenticated sidebar |
| RTL / Nastaliq | `ps`/`pe` logical padding; `leading-[1.7]` on labels; brand uses Nastaliq; `overflow-x-visible` on nav |
| Focus ring | Per-link `focus-visible:ring-2 focus-visible:ring-[#E8B931] ring-offset-[#0B3B26]` (visible on dark chrome) |
| Click count | Dashboard + Assistant still one click from sidebar; Assistant promoted, not buried |

`npx tsc --noEmit` passes after changes.
