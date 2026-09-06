# 11 — Assistant composer (text + voice + receipt)

## Problem

[`components/assistant/ChatComposer.tsx`](../components/assistant/ChatComposer.tsx) + related:

- Mic and receipt are **icon-only** — easy to miss meaning.
- History panel hidden on mobile.
- Empty state suggestions help, but composer doesn’t teach “آپ بول بھی سکتے ہیں”.

## Source components

1. **Aceternity — Placeholders And Vanish Input** (placeholder rotation only)  
   https://ui.aceternity.com/components (Placeholders And Vanish Input)  
2. **Motion Primitives — Morphing Popover** for attachment menu  
   https://motion-primitives.com/docs (Morphing Popover)

**Forbid** vanish-on-submit that clears text before the user sees what was sent if it conflicts with review-first voice flow. Prefer rotating **placeholders** only.

## Fit for low-literacy Urdu users

| Keep | Change / forbid |
| --- | --- |
| Labeled actions: لکھیں · بولیں · رسید | Icon-only mic/receipt |
| Show transcription before send (Phase 11) | Auto-send voice without review |
| Big send button | Gooey / magnetic inputs |

## Adaptation rules

1. Composer layout (RTL): [مزید ⋮] [textarea] [بھیجیں].  
   “مزید” opens Morphing Popover: بولیں / رسید with icons **and** Urdu labels.
2. Rotating placeholders in Urdu examples only, e.g. “آج ۵۰۰ روپے پیٹرول…” — slow interval ≥4s; pause on focus.
3. When recording, replace composer with `VoiceRecorder` full-width labeled controls (plan stays in VoiceRecorder).
4. Mobile: history via a top “پچھلی باتیں” button opening a sheet (reuse ChatHistoryPanel content).
5. Send = Stateful Button optional; disable while `isSending`.
6. No English receipt payload strings in the user-visible bubble (build Urdu summary in `assistant/page.tsx`).

## Files to touch

- `components/assistant/ChatComposer.tsx`
- `components/assistant/VoiceRecorder.tsx`
- `components/assistant/ChatHistoryPanel.tsx`
- `app/(app)/assistant/page.tsx`
- `lib/i18n/ur.ts`

## Motion

Placeholder cross-fade; popover scale. Reduced-motion: static single placeholder.

## Success checks

- [x] User finds voice without tooltip tribal knowledge. — **مزید** menu lists **بولیں** / **رسید** with icons + Urdu labels; composer hint teaches speaking.
- [x] Voice text is editable before it hits the AI pipeline. — Recorder → transcript lands in composer with review chip; send only on explicit بھیجیں (unchanged flow).
- [x] Mobile users can open history. — Header **پچھلی باتیں** opens `ChatHistorySheet` (`md:hidden`); desktop sidebar unchanged.

### Verification notes (2026-09-07)

| Check | Evidence |
| --- | --- |
| Labeled voice/receipt | `ChatComposer` morphing menu; no icon-only mic row |
| Review before send | `voiceProvider` chip + editable textarea; `VoiceRecorder` full-width stop |
| Mobile history | `ChatHistorySheet` + header button |
| Placeholders | Urdu rotate ≥4.5s; pause on focus; reduced-motion static |
| Receipt bubble | Urdu summary keys in `handleSendReceipt` |

`tsc` passes.
