# Job Application Tracker

Self-hosted React, Express, Tailwind, and MySQL workspace. No Docker, inbox, email integration, or automatic submissions.

## Setup

Requires Node.js 24+, MySQL 8+, and a Chromium browser for PDF export. No Docker required.

After cloning the repository, open its folder and install the locked dependencies:

```sh
npm ci
```

Create the database and a dedicated user from a MySQL administrator session. Replace the example password before executing:

```sql
CREATE DATABASE job_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'job_tracker'@'localhost' IDENTIFIED BY 'replace-with-your-database-password';
GRANT ALL PRIVILEGES ON job_tracker.* TO 'job_tracker'@'localhost';
```

Copy `.env.example` to `.env`. Set the database connection and replace both secret placeholders with separate random values. Generate one value at a time with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private. Then initialize the tables and start development:

```sh
npm run db:migrate
npm run dev
```

Open http://127.0.0.1:5173 (or the Vite URL shown in the terminal). Create your owner name and password on first launch. There are no default credentials or seeded records.

For the built app:

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. Restart the server after building if it was already running.

`npm run db:local` is only a helper for an already initialized Windows development database in `.local/mysql`; a fresh clone should use a normally configured MySQL installation. The repository does not include a database or uploaded documents.

## AI

Configure an OpenAI-compatible API base URL, model, and API key in Settings. Keys are encrypted on the server with `ENCRYPTION_KEY`. Do not change that secret without re-entering your API key. Back up the secret separately. Leaving the key field blank keeps the saved key.

Only selected request content is sent to the provider. API charges and provider retention policies apply. No API is required for manual editing, tracking, and document export. AI requests are grounded in supplied facts, but outputs still require review.

## Workflow

- **Profile:** career details, experience, skills, education, certifications, links, and projects.
- **Prepare:** job description → resume selection/upload/drafting and editing → comparison → optional cover letter → export formatting and PDF.
- **Applications:** add directly or from preparation; track stages, contacts, interviews, notes, tasks, and submitted documents.
- **Documents:** resume/CV and cover letter viewers, draft editing, immutable versions, original downloads, and PDF exports.
- **Dashboard:** charts from recorded applications with date filtering and next actions.

Importing a PDF, DOCX, or TXT resume on Career profile uses your configured AI provider to fill the individual fields. Review the result and click Save profile. Missing values keep existing fields unchanged; provider failures preserve your draft and original upload. JSON Resume imports populate fields directly without an AI call.

Template selection belongs to export. Exporting does not submit an application. Original uploads and earlier document versions are preserved.

## Documents

PDF, DOCX, TXT, and JSON Resume uploads are limited to 5 MB. PDF extraction is limited to 50 pages. Uploaded PDFs display their original pages in preparation. Extracted text is kept separately for review and AI, never inserted as a professional summary. Unchanged uploaded PDFs are reused without reformatting when saving the package. Edited text or AI-generated content creates a separate document. Extracted text requires review; it does not reconstruct the original layout. Scanned PDFs require manual entry (OCR is not included).

Puppeteer generates PDFs locally. Its package normally downloads a browser during installation. To use an installed Chromium browser, set `PUPPETEER_EXECUTABLE_PATH`. On Windows, an installed Microsoft Edge browser can also be used. No paid PDF service is required.

## Backup and hosting

Settings exports a JSON backup containing profile, preparation, applications, documents, and file contents. Restore replaces workspace records after validation; download a backup before restoring. Owner credentials, sessions, API credentials, and server secrets are deliberately excluded. Keep `.env`, MySQL credentials, and `ENCRYPTION_KEY` separately backed up.

For another server, install Node and MySQL, configure `.env`, run migration and build, then run `npm start` under your service manager. Default binding is localhost. Put HTTPS in front of the app before exposing personal data; set `APP_ORIGIN` to the public HTTPS URL and `COOKIE_SECURE=true`. Set `HOST` and `TRUST_PROXY` only to match your deployment. No Docker is required.

## Checks

```sh
npm test
npm run test:db
npm run build
npm run test:e2e
```

Browser tests require a separate empty database configured by `TEST_DB_NAME` (default `job_tracker_test`). They erase only that test database's app tables. Never point it at real data. They run the built frontend on port 3101. Grant the database user access to the separate test database before running these checks. The tests use Edge on Windows by default or `TEST_BROWSER_PATH` when supplied; on other systems, install the Playwright browser with `npx playwright install chromium`. Plain `npm test` runs unit checks without a database or browser.

Project conventions live in `AGENTS.md`. Local `.agents/` skills are excluded from Git.

## GitHub and local data

Commit source code, migrations, `package-lock.json`, and `.env.example`. The ignore rules exclude credentials, local MySQL files, uploads, generated documents, backups, dependencies, builds, logs, and test artifacts. GitHub contains the app source; use Settings backups to move your workspace data separately.

No project license has been selected. The package is marked `UNLICENSED` until the owner chooses one. No third-party skill code was copied into this project; research links are recorded in `PLAN.md`.
