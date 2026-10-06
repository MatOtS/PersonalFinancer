# Design

Last updated: 2026-10-05

Visual system only. Each feature's screens are defined in its spec's plan.

**Phases**: phase 1 implements and verifies desktop only (≥ 1024 px). Everything marked *(phase 2)* is defined here so the system is complete, but it is not implemented or verified until the mobile phase.

**Reference**: four dark fintech dashboard mockups provided by the owner (not stored in the repo). Only the style is taken from them (colors, typography, surfaces, components); none of their charts or features are in scope.

## Visual principles
1. **Numbers first**: amounts are the protagonists. Large, tabular, aligned; labels are small and quiet.
2. **Color means something**: the accent marks the main action, the active item or a positive figure. Never decoration. Negative figures use the negative color; everything else is neutral.
3. **Dark first, light equal in quality**: designed in dark, with an equivalent light theme. Every screen works in both.
4. **Calm density**: dashboards show a lot, but grouped in cards with generous spacing and one clear hierarchy per card.
5. **Same task, right device**: desktop for management, mobile for quick entry and lookups. *(phase 2: until then, desktop only)*

## Theme
- Default theme follows the system (`prefers-color-scheme`). A manual toggle overrides it and is remembered.
- Tokens are defined once per theme; components only use tokens, never raw colors.

## Design tokens

### Colors
All text pairs meet WCAG AA (4.5:1 normal text, 3:1 large text and UI parts) against `bg`, `surface` and `raised`, checked with the WCAG 2 formula.

| Token | Use | Dark | Light |
|---|---|---|---|
| `bg` | Page background | `#0E1113` | `#F5F6F7` |
| `surface` | Cards, sidebar | `#161A1D` | `#FFFFFF` |
| `raised` | Popovers, menus, modals | `#1D2226` | `#FFFFFF` |
| `border` | Card and divider lines (decorative) | `#2A3035` | `#DDE2E6` |
| `control-border` | Input and button outlines (3:1 min) | `#66717A` | `#7A858D` |
| `text` | Main text | `#ECEFF1` | `#11161A` |
| `text-muted` | Labels, secondary text | `#8B959C` | `#5B6670` |
| `accent` | Primary action, active item, focus ring | `#2EE6A0` | `#087F5B` |
| `on-accent` | Text on an accent fill | `#06281B` | `#FFFFFF` |
| `accent-soft` | Badge and selected backgrounds | `accent` at 12% | `accent` at 10% |
| `positive` | Income, positive deltas | `#2EE6A0` | `#087F5B` |
| `negative` | Expenses, negative deltas, destructive actions | `#F87171` | `#C2362F` |
| `info` | Second data series, neutral highlights | `#5CC8F2` | `#1A6FA0` |
| `warning` | Pending, attention | `#F5B544` | `#8A5A00` |

- `positive` starts with the same value as `accent` but is a separate token, so they can diverge without touching components.
- Surfaces in dark may carry a very subtle top-to-bottom gradient (`surface` to `bg`, under 4% lightness change). Never behind text that would lose contrast.
- **Chart categorical palette**: pending. It is defined and validated for color-vision deficiency, against these surfaces, in the first spec that needs a chart. The legacy palette was validated against other surfaces and is not reused as is.

### Typography
- Family: **Manrope** (geometric sans, close to the reference), with `tabular-nums` on every amount, table and series of figures. Fallback: system sans. Final loading strategy is decided in architecture.
- Amounts: integer part in the size of its level, decimals and currency one step smaller and `text-muted` (`1.234` **,56 €**). Spanish format always: `1.234,56 €`, `dd/mm/yyyy`.

| Level | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 40 / 44 px (32 on mobile) | 700 | The main figure of a screen |
| `h1` | 28 / 34 px (24 on mobile) | 700 | Page title |
| `h2` | 20 / 28 px | 600 | Card or section title |
| `figure` | 24 / 30 px | 700 | KPI amounts in cards |
| `body` | 15 / 22 px | 400 | Default text |
| `small` | 13 / 18 px | 400 | Secondary text, table meta |
| `label` | 11 / 16 px, uppercase, +0.08em tracking | 600 | Micro labels above figures |

Minimum size 13 px except `label`. Body text never below 15 px on mobile.

### Spacing
Base 4 px. Scale: `4, 8, 12, 16, 24, 32, 48, 64`.
- Inside cards: 24 px desktop, 16 px mobile.
- Between cards: 16 px desktop, 12 px mobile.
- Page gutter: 32 px desktop, 16 px mobile.

### Radii
- `sm` 8 px: inputs, small buttons, badges inside tables.
- `md` 12 px: buttons, icon tiles, menus.
- `lg` 16 px: cards, modals.
- `full`: pills (segmented controls, badges, avatars).

### Shadows
- Dark: no shadows on cards; separation comes from `surface` vs `bg` and `border`. `raised` elements get `0 8px 24px rgb(0 0 0 / 40%)`.
- Light: cards `0 1px 2px rgb(16 24 32 / 6%)`; `raised` elements `0 8px 24px rgb(16 24 32 / 12%)`.

## Base components
- **Buttons**: `primary` (accent fill, `on-accent` text), `secondary` (transparent, `control-border`), `ghost` (text only, for tertiary actions), `destructive` (`negative`). Sizes 36 px desktop and 44 px on touch. One primary button per view.
- **Inputs**: `surface` background, `control-border`, `sm` radius, visible label above (never placeholder as label), help or error text below. Amount inputs right aligned with tabular figures. Error state: `negative` border and message.
- **Segmented control**: pill container in `raised`; active option in `accent` fill. For switching views or periods, never for actions.
- **Cards**: `surface`, `lg` radius, `border`. Structure: `label` + optional icon tile at the top, main figure, supporting line. A card answers one question.
- **Icon tile**: icon inside a 36 px `md` square with `accent-soft` or neutral background.
- **Badges**: pill, `accent-soft` / `negative` / `warning` tinted backgrounds with the matching text color. Short text, often with a leading dot.
- **Progress bar**: 8 px pill track in `border`, fill in `accent` (or `info` / `warning` when it means something else).
- **Tables**: no vertical lines, row dividers in `border`, amounts right aligned. Below 640 px they become stacked cards.
- **Navigation**: see below.
- **Modals and sheets**: `raised`, `lg` radius; on mobile they open as bottom sheets. Close with Esc, the close button and the backdrop; focus is trapped inside.
- **Feedback**: toasts for the result of an action (bottom on mobile, bottom right on desktop, 5 s, pausable). Inline messages for validation. Destructive actions ask for confirmation in a modal.
- **Icons**: one outline icon set, 20 px (16 px in dense rows). The set is chosen in architecture.

## Navigation and layout
- **Desktop (≥ 1024 px)**: fixed left sidebar (240 px) with icon + text items, active item with `accent-soft` background and `accent` text; user and theme toggle at the bottom. Top bar with page title area and the screen's primary action. Content max width 1280 px.
- **Tablet (640 to 1023 px)** *(phase 2)*: collapsible sidebar (icons only).
- **Mobile (< 640 px)** *(phase 2)*: bottom tab bar with up to 4 destinations and a central primary button for quick entry. Top bar shows only the page title and at most one action.
- Grids: 12 columns desktop, 1 column mobile. KPI cards in rows of 2 to 4 on desktop, stacked on mobile.

## Required states
Every screen and every data component defines these four:
- **Empty**: what is missing and the action that fills it (for example, "Importá tu primer extracto"). Never a blank card.
- **Loading**: skeletons with the shape of the final content; no spinners for whole sections. Over 10 s, explain what is happening.
- **Error**: what failed, in plain words, and a way to retry. Data typed by the user is never lost on error.
- **Success**: confirmation of the action (toast) and the updated data visible without reloading.

## Minimum accessibility
- WCAG AA contrast for text and UI parts in both themes (see Colors).
- Visible focus on every interactive element: 2 px `accent` ring with 2 px offset. Never removed.
- Touch targets of at least 44 × 44 px on mobile *(phase 2)*.
- Color is never the only signal: amounts carry their sign (`−120,00 €`), statuses carry text.
- Full keyboard navigation; logical tab order; modals trap and return focus.
- Respect `prefers-reduced-motion`: no animation beyond simple fades.
- Labels on every input and accessible names on icon-only buttons.
