# Security Guardrails - Version 2

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

## Git Committer Policy
* **Authorized Committer**: All git commits in this repository must be authored by:
  * **Git Name**: `hesham88`
  * **Git Email**: `hesham1988@gmail.com`
* **Local Enforcement**: Git configuration must be set locally (`git config user.name "hesham88"` and `git config user.email "hesham1988@gmail.com"`).
