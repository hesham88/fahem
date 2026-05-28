# Security Guardrails

This directory contains the security guidelines, access controls, verification policies, and security guardrails for the project.

## General Guardrails

1. **No Destructive Actions**: No files in this project should be deleted or overwritten without maintaining history/revisions.
2. **Access Control**: Keep credentials, API keys, and environment configuration strictly out of version control and user folders (use environment variables or `.env` templates).
3. **Validation**: All code changes, dependencies, and script runs must be checked against security best practices.
