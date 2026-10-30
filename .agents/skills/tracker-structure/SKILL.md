---
name: tracker-structure
description: Keep file placement, feature boundaries, and minimal CSS consistent in the job-application-tracker React, Express, Tailwind, and MySQL project.
---

# Tracker structure

Apply only to this project. Inspect existing files first. Preserve established placement; change conventions only when requirements justify it. Do not scaffold empty folders or relocate unrelated code.

## Placement guide

```text
client/src/
  app/                 # routing, layout, providers
  features/            # profile, preparation, applications, documents,
                       # dashboard, settings; create as needed
  components/ui/       # shared controls
  lib/                 # API client and shared helpers
  styles.css           # Tailwind entry and shared tokens
server/src/
  app.js               # Express setup and route registration
  server.js            # startup
  features/            # domain folders; auth when needed
    applications/
      routes.js        # HTTP validation, authorization, responses
      service.js       # business rules and database operations
  middleware/          # shared auth and error handling
  lib/                 # MySQL pool, AI, file/PDF integrations
server/migrations/     # ordered SQL migrations
server/prompts/        # versioned AI instructions
storage/               # runtime files; exclude personal files from Git
```

This is a placement guide, not a scaffold. Keep the current language unless a language change is deliberately chosen.

## Boundaries

- Colocate feature components, hooks, API calls, and tests with their feature.
- App routing composes features. Shared code cannot import feature internals. Avoid cross-feature internal imports and cycles; extract only genuinely shared behavior or contracts.
- Keep routes small. Add service.js when business logic needs it, without empty controller/repository layers. Separate queries only when complexity warrants it.
- Browser code calls Express under /api, never MySQL or AI credentials directly.
- Use one MySQL pool, parameterized queries, migrations, server side secrets, and external input validation.
- Preserve original uploads and exact submitted document versions. Create new versions when editing submitted documents.
- Use React, Express, Tailwind, MySQL, a hosted AI API, and ordinary Node hosting. No Docker or local model setup unless requested.

## Minimal CSS

- Prefer Tailwind utilities and existing shared UI. Reuse centralized tokens for colors, typography, and spacing.
- Avoid per-component CSS, CSS-in-JS, and inline styles for ordinary layouts. Runtime styles are acceptable for genuinely dynamic values.
- Custom CSS is allowed when utilities are unsuitable, such as print pagination or third-party integrations. Keep it small and scoped; explain non-obvious reasons.
- Extract repeated controls into shared components when real reuse exists. Do not add styling libraries or abstractions solely to shorten class lists.
- Preserve labels, keyboard access, focus states, responsive layouts, and chart text alternatives. Dashboard charts use recorded data.

## Complete the change

- Check affected imports, callers, migrations, and behavior. Run relevant existing checks and add a small behavior test for non-trivial logic.
- No placeholder layers, unnecessary packages, or unrelated refactors.
- Keep user updates brief: outcome, essential changes, validation, and material limitations. Prefer short bullets when clearer.
