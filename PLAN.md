# Accepted project scope

React + Express + Tailwind + MySQL. One self-hosted user. Hosted AI API configurable later. No Docker, inbox, mailbox sync, email import, or email drafting.

- Profile: contact details, summary, links, experience, education, skills, certifications, projects, import review.
- Preparation: job description -> resume (upload/select/AI/manual editing) -> compare and ATS guidance -> optional cover letter -> export (template, paper, font, margins). Autosave drafts; preserve originals. Export is not submission.
- Applications: direct entry without tailoring, or preparation package. Board/table/filter, stages, submission dates, contacts, notes, interviews, follow-ups, history, document attachments and viewers.
- Library: view/edit resume/CV and cover letters, original files, immutable versions and exported PDFs, application usage.
- Dashboard: real application charts for activity, stage distribution, conversion, outcomes; date filters and next actions. No fabricated data.
- AI: grounded writing, editable suggestions, schema validation, failure recovery, server-side encrypted key. Manual work stays available without AI.
- Export: local Puppeteer, A4/Letter, two resume templates and a cover letter, selectable text. PDF/DOCX import is content extraction, not faithful layout reconstruction. No OCR.
- Settings: hosted provider connection, backup/restore and portable resume data.
- Architecture: follow .agents/skills/tracker-structure/SKILL.md; feature folders, shared controls, minimal custom CSS.

Writing references (review licensing before copying code or prompts):
- https://github.com/jezweb/claude-skills/blob/main/plugins/writing/skills/resume-cover-letter/SKILL.md
- https://github.com/mzupan/tech-resume/blob/main/SKILL.md

Development references:
- https://github.com/PyModel/react-frontend-skills
- https://github.com/ajyadav013/claude-kit/blob/main/providers/codex/claude-kit/skills/express/SKILL.md
- https://github.com/planetscale/database-skills
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

These are researched references, not installed third-party skills. Generation instructions are maintained locally in server/prompts/.
