# Project conventions

Use React, Express, Tailwind, and MySQL with a hosted AI API. No Docker or email integration.

- Keep frontend domains in `client/src/features/` and backend domains in `server/src/features/`.
- Reuse shared UI controls and prefer Tailwind with minimal custom CSS.
- Keep database access and AI credentials on the server.
- Preserve original uploads and submitted document versions.
- Create only files needed for the requested work and keep explanations concise.

If `.agents/skills/tracker-structure/SKILL.md` exists locally, read it for additional project guidance. Local agent skills are excluded from Git.
