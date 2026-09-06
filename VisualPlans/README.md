# Visual Plans — Raqam-AI

Per-component UI improvement plans for low-literacy, low-internet Urdu users.

**Rule above all:** visual polish must never reduce usability. Prefer clarity, big targets, one primary action, and Urdu-first chrome over “wow” effects.

## Audience constraints

- Many users rarely use apps; they will not discover hover-only, icon-only, or gesture-only UI.
- Urdu is the primary language; English chips and Manrope uppercase kickers feel “admin”.
- Money actions need transparency (confirm before write) — never hide confirm/cancel behind fancy chrome.
- Prefer **Motion** (`framer-motion` already in repo) over Anime.js unless a plan explicitly needs it.

## Library shortlist (approved patterns)

| Library | Use for |
| --- | --- |
| [Aceternity UI](https://ui.aceternity.com/) | Sidebar shell, empty states, stateful button, file upload, sticky banner, multi-step loader, animated modal |
| [Motion Primitives](https://motion-primitives.com/) | Animated number, morphing dialog, text fade (not scramble), dock (adapted carefully) |
| [21st.dev](https://21st.dev/) | shadcn Empty / community empty blocks, steppers |
| [KokonutUI](https://kokonutui.pro/) | Calm card / hero sections for landing only |
| [Motion](https://motion.dev/) / framer-motion | Spring, layout, in-view — already installed |

## Rejected / high-risk patterns (do not use in-app)

These confuse or distract people who need to trust money UI:

- Magnetic / wobble / tilt / 3D cards
- Text scramble, encrypted text, typewriter as the only way to read amounts
- Shader / aurora / vortex / meteor backgrounds inside the authenticated app
- Floating Mac-style docks that hide labels
- Hover-only expansion with no visible labels on first paint
- Infinite marquees, parallax hero scroll inside dashboard

Landing may use *one* subtle motion hero; the app shell stays calm.

## Plan index (one file = one component)

| # | Plan | Target surface |
| --- | --- | --- |
| 01 | [Sidebar](./01-sidebar.md) | Desktop nav |
| 02 | [Mobile bottom nav](./02-mobile-bottom-nav.md) | Phone chrome |
| 03 | [Empty states](./03-empty-states.md) | All list screens |
| 04 | [Dashboard animated numbers](./04-dashboard-animated-numbers.md) | Dashboard hero stats |
| 05 | [Budget progress bar](./05-budget-progress.md) | Budgets + dashboard bars |
| 06 | [Confirmation card](./06-confirmation-card.md) | AI action gate |
| 07 | [Stateful primary button](./07-stateful-primary-button.md) | Save / confirm CTAs |
| 08 | [Onboarding stepper](./08-onboarding-stepper.md) | First-run flow |
| 09 | [Import file upload](./09-import-file-upload.md) | CSV import |
| 10 | [Proactive alert banner](./10-proactive-alert-banner.md) | Budget / bill warnings |
| 11 | [Assistant composer](./11-assistant-composer.md) | Chat input + voice/receipt |
| 12 | [Landing hero](./12-landing-hero.md) | Marketing first viewport |
| 13 | [Transaction list cards](./13-transaction-list-cards.md) | Transactions mobile/desktop |
| 14 | [Goals contribute card](./14-goals-contribute.md) | Savings goals |

## Implementation order (suggested)

1. Empty states + Stateful button (immediate clarity wins)
2. Sidebar + Mobile bottom nav (wayfinding)
3. Confirmation card + Alert banner (trust)
4. Animated numbers + Budget progress (literacy of figures)
5. Onboarding stepper + Import upload (guided flows)
6. Composer + Transaction cards + Goals
7. Landing hero last (judging polish)

Each plan file is self-contained: problem, source component, adapt rules, files to touch, success checks.
