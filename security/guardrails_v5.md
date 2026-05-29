# Security Guardrails - Version 5

## Sensitive Data Masking Policy
All sensitive information must be masked in logs, source code, screenshots, and documentation. This includes:
* Usernames (e.g., local system usernames in file paths)
* API keys
* URLs (specifically internal or credential-carrying URLs)
* Passwords
* Access tokens
* Configurations containing credential details

## Secret Management Policy
* **Google Cloud Secret Manager**: All production and sensitive credentials, API keys, tokens, and configurations must be securely stored in Google Cloud Secrets.
* **Accessing Secrets**: The application and scripts should retrieve credentials at runtime using the GCP Secret Manager API or GCP environment bindings.
* **Local Development**: Never commit `.env` or local configuration files containing plain secrets. Use template files (e.g., `.env.example`) with dummy values or GCP environment mock bindings.

## Pre-Commit Verification Policy
* **Zero Commits of Sensitive Data**: No sensitive data must ever be committed to the Git repository.
* **Pre-commit Checks**: Prior to staging or committing any code, a strict scan of changed files must be performed to check for any credentials, keys, or unmasked system paths.
* **Masking Verification**: Verify all sensitive details are masked *after* they are successfully written and stored in Google Cloud Secret Manager.

## Git Committer Policy
* **Authorized Committer**: All git commits in this repository must be authored by:
  * **Git Name**: `hesham88`
  * **Git Email**: `hesham1988@gmail.com`
* **Local Enforcement**: Git configuration must be set locally (`git config user.name "hesham88"` and `git config user.email "hesham1988@gmail.com"`).

## Logging & Version Timestamp Policy
* **Timestamp Enforcement**: All turn logs, memory updates, versioned plans, walkthroughs, task lists, and revision blocks must contain explicit date and time timestamps (in ISO-8601 or similar localized format) for auditability and history tracking.

## SEO Enhancements & Checks Verification Policy
* **Semantic HTML**: Maintain appropriate semantic elements (e.g., `<main>`, `<nav>`, `<footer>`) with correct heading hierarchy (e.g., single `<h1>` per page).
* **Meta & Description Verification**: All pages must have descriptive localized titles and meta descriptions defined in `generateMetadata`.
* **Structured Data (JSON-LD)**: Inject dynamic structured schema markup on pages to support Google Rich Snippets.
* **Alternate Language Links**: Always provide canonical alternate language properties for multilingual locales (ar, en, es, fr, de, it, zh).
* **Robots Configuration**: Ensure search crawlers are allowed to index and follow the pages via correct robots rules.
* **Pre-deployment Verification**: Prior to deploying or compiling, verify that SEO metadata configurations compile correctly without breaking Next.js server component capabilities.
