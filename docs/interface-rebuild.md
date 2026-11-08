# Auronix interface rebuild

The public site, administrator workspace, and seller workspace use the palette, surfaces, control geometry, and responsive rules in `app/auronix-system.css`. The older modernization, rebuild, wholesale, and next-generation stylesheets are no longer loaded. `interface.css` retains specialized page layouts; obsolete atmosphere and optical-glass override blocks were removed.

## Public experience

- New homepage with a commerce ecosystem diagram, capabilities, partnership process, and contact actions.
- One shared header, with keyboard-accessible menus, search, theme selection, and mobile navigation. `SiteLayout` no longer injects another header or a custom cursor.
- Updated page headers, calls to action, brand mark, forms, dialogs, cookie panel, and footer styling.
- Shared light and dark color tokens; reduced-motion support.

## Administration and partner accounts

- A common workspace frame with grouped navigation, an independently scrolling sidebar, optional compact navigation, search, account controls, and a mobile navigation dialog.
- Added sidebar access to existing Pages Manager, Newsletter, Announcements, and Changelog routes.
- Rebuilt admin overview shows existing application, supplier, ticket, contact, content, and community counts. It does not invent sales, trends, or performance data.
- Count subscriptions and availability reads wait for authentication. The support status remains unknown until a successful service response.
- Rebuilt seller dashboard includes real product/catalog/ticket counts, account readiness, business details, refresh status, and conditional Deal Room access.
- Redesigned administrator and seller sign-in pages preserve the existing authentication and MFA flows.
- Shared table, input, tab, badge, panel, and button styles apply across existing workflow pages.

## Visual review

`/ui-preview` is development-only and returns not found in production. It renders the shared workspace and overview with explicitly labeled sample records, plus a table/form specimen. It does not grant access to private routes, connect sample records to production data, or bypass account permissions.

Production admin and seller actions require configured Firebase services and an authorized account. Visual review of the workspace uses the development specimen; live account actions are not exercised by that review.

## Brand and motion refinement

The original black-and-white ring artwork is bundled locally and used by the shared brand component. Self-hosted Manrope replaces the system-font fallback. `auronix-motion.css` adds the floating, scroll-compressing public header; selective glass surfaces; and button, menu, and card motion. `MotionRuntime` progressively adds staggered blur/fade reveals using IntersectionObserver and the Web Animations API. Content remains visible without JavaScript. Reduced-motion preferences disable the decorative transitions, and observers/animations are cleaned up on navigation.
