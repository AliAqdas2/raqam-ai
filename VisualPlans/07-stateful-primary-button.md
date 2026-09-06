# 07 — Stateful primary button

## Problem

Primary actions (save transaction, confirm AI action, finish onboarding) often stay visually static while Convex/AI work runs — users tap again or think nothing happened.

## Source component

**Aceternity UI — Stateful Button**  
https://ui.aceternity.com/components/stateful-button  

```bash
npx shadcn@latest add @aceternity/stateful-button
```

Shows idle → loading → success.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Clear loading spinner + Urdu label (“لکھ رہے ہیں…”) | Shimmer / magnetic / moving-border CTAs |
| Success checkmark then settle | Infinite success animation |
| Disable double-submit while pending | Hover-only feedback |

## Adaptation rules

1. Wrap Raqam primary green (`#0F5132`) — restyle Aceternity defaults; keep 48px min height; Nastaliq/UI font for label.
2. Wire to:
   - `TransactionFormDialog` submit
   - `ConfirmationCard` Confirm
   - Onboarding “اگلا / ختم”
   - Import “تصدیق”
3. Labels: idle action verb → loading “رہے ہیں…” → success “हो گیا / ہو گیا” (Urdu) then parent closes dialog.
4. Error path: revert to idle + Toast error (do not stick on success).
5. `prefers-reduced-motion`: spinner ok; skip elaborate morph.

## Files to touch

- New: `components/ui/stateful-button.tsx` (installed)
- `components/transactions/TransactionFormDialog.tsx`
- `components/assistant/ConfirmationCard.tsx`
- `app/onboarding/page.tsx`
- `app/(app)/import/page.tsx`

## Motion

Built into the Aceternity component; keep duration short.

## Success checks

- [x] Double-tap does not create duplicate transactions. — `StatefulButton` ignores clicks while `loading`/`success`; form submit early-returns on same statuses; import/onboarding await one promise.
- [x] Blind/low-literacy user gets non-color cue (text + icon) for success. — Spinner + Urdu loading label; check + “ہو گیا” / Done on settle (txn/import/onboarding); confirm uses loading label then ResolvedCard.
- [x] Failure restores a tappable button. — Catch paths set status idle / rethrow so controlled or internal state returns to idle (txn form, import `throw err`, onboarding throw after error text).
