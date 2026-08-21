---
name: secret-sanitizer
description: >-
  Detects, audits, and sanitizes hardcoded secrets, credentials, API keys, session tokens,
  and sensitive runtime files before committing or publishing a project to public repositories like GitHub.
---

# Secret Sanitizer & Secret Leak Prevention Skill

## Purpose
Scans codebases, configuration files, and data directories for accidental exposure of secrets, tokens, API keys, passwords, session strings, and personal identifiable information (PII) before publishing to public VCS (GitHub, GitLab, etc.).

## Workflow & Checklist
1. **Repository Secret Search**:
   - Telegram `apiId`, `apiHash`, bot tokens, string sessions.
   - Database credentials, JWT secrets, encryption keys, master passwords.
   - Cloud keys (AWS, Google, Supabase, Netlify, OpenAI).
2. **Environment & Ignore Isolation**:
   - Ensure `.env` and sensitive config files are ignored in `.gitignore`.
   - Ensure `data/`, `uploads/`, `dist/`, and local sqlite/json storage are ignored in `.gitignore`.
   - Provide clean `.env.example` templates with placeholders.
3. **Runtime Data Sanitization**:
   - Ensure default database seeding does not commit user session data or private local file paths.
