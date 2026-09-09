# Support interface update

Adds dedicated public AI and team support pages, seller AI support, existing-ticket conversation UI, searchable notification inbox with unread counts, responsive layouts, on-demand Three.js scenes, and rounded radial loading indicators.

Existing API handlers, authentication and Firebase integration are unchanged. AI is identified as AI; team replies use the existing support system. Seller AI history stays in memory only.

Validation: production build (138 entries), typecheck, lint (five pre-existing warnings), and four AI unit tests pass. Build uses synthetic local Firebase configuration; no production credentials are stored. Live Firebase, provider responses, authenticated end-to-end forms, and cross-device browser testing remain outstanding. Existing lint warnings are outside this update. The temporary ChatGPT test site is a separate earlier snapshot.
