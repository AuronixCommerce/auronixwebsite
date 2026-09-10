# Support interface update

Adds dedicated public AI and team support pages, seller AI support, existing-ticket conversation UI, searchable notification inbox with unread counts, responsive layouts, on-demand Three.js scenes, and rounded radial loading indicators.

Existing API handlers, authentication and Firebase integration are unchanged. AI is identified as AI; team replies use the existing support system. Seller AI history stays in memory only.

Validation: production build (138 entries), typecheck, lint (five pre-existing warnings), and four AI unit tests pass. Build uses synthetic local Firebase configuration; no production credentials are stored. Live Firebase, provider responses, authenticated end-to-end forms, and cross-device browser testing remain outstanding. Existing lint warnings are outside this update. The temporary ChatGPT test site is a separate earlier snapshot.

## Mobile and chat correction

Restores the original floating Auronix AI popup, with visual-viewport sizing for phone keyboards, Escape dismissal, and compact small-phone header controls. Dedicated automated support stays on its own page with a compact conversation layout and isolated browser history. Its loading state reports actual module loading; it does not simulate human agents or a staffing queue. Response presentation is slower and reduced-motion aware.

Seller notifications and nested support routes no longer render public navigation over the dashboard. Shared route loading now places the rounded radial indicator in the screen center. Public API handlers, authentication, Firebase configuration, and ticket submission logic are unchanged.

Browser checks used the actual app in 320px/390px phone frames, a 320x400 short viewport, and a 768px tablet frame. Verified popup rendering, support startup, visible composer, and tablet contact layout. Measured no horizontal overflow in the checked support frames. These are browser viewport checks, not physical iPhone keyboard or authenticated seller/Firebase end-to-end tests; those remain outstanding.
