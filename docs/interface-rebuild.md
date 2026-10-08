# Auronix interface modernization

The production interface is organized as four related experiences: public commerce, seller onboarding, seller operations, and administration. They share typography, color, spacing, controls, accessibility behavior, and recovery states while keeping different information density and navigation patterns.

## Architecture

- `app/globals.css` contains the Tailwind-compatible semantic color baseline.
- `app/interface.css` retains route-specific layouts and legacy compatibility rules.
- `app/modernization.css` is the final visual authority for tokens, hierarchy, material, density, responsive behavior, workspaces, and reduced motion.
- `components/site/public-site-chrome.tsx` owns public navigation, global search, main content, and footer.
- `components/design/workspace-frame.tsx` owns seller/admin navigation and the independent admin scroll root.
- Auronix Intelligence One is dynamically loaded only when opened.

Ordinary cards, forms, tables, and reading surfaces are solid. Backdrop diffusion is reserved for navigation, command/search overlays, mobile sheets, the contextual selection toolbar, and the AIO window. Animated atmosphere, cursor effects, global motion configuration, unused WebGL, old home experiments, and tracked source backups were removed.

## Functional preservation

Routes, structured metadata, seller applications, email verification, tracking IDs, correction requests, account access, data reads/writes, admin tools, Deal Room, notification preferences, support, newsletter, and AIO endpoints remain on their existing contracts. WhatsApp remains optional for one-way status notifications only; it is not an authentication or application gate.

## Validation

Before release, run type checking, lint, unit tests, production build, and browser verification at desktop, tablet, and mobile widths. Test public navigation/search, seller application/tracking, seller authentication/password reset, admin route position and command search, AIO launch/close, theme switching, offline messaging, and keyboard focus.
