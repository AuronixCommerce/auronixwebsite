# Auronix Commerce design system

## Product character

Auronix should feel precise, calm, trustworthy, and operational. The interface uses Apple-platform restraint without copying a device UI. Hierarchy comes from type, spacing, contrast, borders, and information density—not decorative glow.

## Foundation

The canonical tokens live in `app/modernization.css`.

| Area | Tokens | Rule |
| --- | --- | --- |
| Type | `--ac-font-sans`, `--ac-font-mono` | Use the system stack; mono is limited to IDs and technical references. |
| Spacing | `--ac-space-1` through `--ac-space-12` | Prefer the shared scale over isolated values. |
| Geometry | `--ac-radius-sm` through `--ac-radius-xl` | Controls use 8–12px; panels use 16px; major overlays cap at 20px. |
| Surfaces | `--ac-surface-1` through `--ac-surface-3` | Solid surfaces are the default. |
| Glass | `--ac-surface-glass` | Only navigation, overlays, selection actions, and AIO may diffuse the background. |
| Edges | `--ac-edge`, `--ac-edge-strong` | Borders define grouping before shadows do. |
| Depth | `--ac-shadow-1`, `--ac-shadow-2` | Use level 1 for panels and level 2 for floating hierarchy. |
| Motion | `--ac-duration-fast`, `--ac-duration`, `--ac-ease` | Motion explains state; it must not run continuously. |

## Layout families

- Public pages: maximum width 1320px, generous section rhythm, readable line length, floating global navigation.
- Seller application and tracking: focused two-column onboarding on desktop, single-column task flow on mobile.
- Seller workspace: compact navigation, clear status, documents, messages, commercial data, and mobile dock.
- Admin workspace: dense independent scroll surface with persistent sidebar, command search, tables, filters, and audit-oriented status treatment.
- AIO and Support: conversation-first layout with restrained material and explicit recovery paths.

## Component rules

- Buttons use 11px geometry and clear verb labels. Reserve round shapes for true circular icon controls.
- Inputs always keep visible labels. Focus uses the semantic accent ring; error messages are textual, not color-only.
- Cards are not a default layout primitive. Use borders or section rhythm when a container does not need independent grouping.
- Status indicators use a label plus color. Never depend on color alone.
- Tables remain tables on larger screens and use contained horizontal scrolling on narrow screens.
- Dialogs need a visible close action, Escape handling, focus management, and a bounded viewport.
- Empty, loading, offline, and error states must identify what happened and provide a next action.

## Responsive behavior

- 320–767px: mobile navigation sheet, single-column content, full-width primary actions, safe-area-aware AIO and workspace dock.
- 768–1023px: independent tablet layout, consolidated hero and workspace rail, no desktop-only assumptions.
- 1024–1439px: full navigation and multi-column operational layouts.
- 1440px and above: content width stays bounded; line lengths and table density do not expand indefinitely.

## Accessibility and performance

- Target WCAG 2.2 AA contrast and keyboard behavior.
- Preserve 44px minimum touch targets for primary controls.
- Respect `prefers-reduced-motion`; avoid continuous transforms and scroll-bound animation.
- AIO and global search stay lazy. Ordinary surfaces never use backdrop filters.
- Prefer server components for static content and client components only where interaction or live data requires them.
