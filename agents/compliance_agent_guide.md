# Fahem Compliance & Review Agent Guide

**Last Updated**: `2026-05-29T01:32:25+03:00`

This guide explains how to use the automated compliance evaluation agent inside the **[scripts/evaluate_compliance.py](file:///C:/Users/hesh1/Desktop/fahem/scripts/evaluate_compliance.py)** script.

## Core Capabilities
The scripted compliance agent performs the following automated audits:
1. **Official Rules & FAQ Verification**: Evaluates implementation parameters against [rules_text.md](file:///C:/Users/hesh1/Desktop/fahem/doc/rules_text.md) and [faq_text.md](file:///C:/Users/hesh1/Desktop/fahem/doc/faq_text.md) requirements.
2. **Exclusivity Enforcement**: Checks source files for restricted third-party AI orchestrators or tool dependencies (unapproved third-party assistants).

3. **Sensitive Leakage Scans**: Inspects all code, configurations, and plans to prevent committing unmasked local usernames (such as `hesh1`), passwords, or exposed API keys.
4. **Local Configuration Verification**: Checks that user Git identities match authorized committers (`hesham88` / `hesham1988@gmail.com`).
5. **Memory Consistency Audit**: Evaluates the integrity of versioned memory plans and progress tasks.

## How to Execute the Compliance Agent
In the terminal, run the scripted agent using Python:
```bash
python scripts/evaluate_compliance.py
```

## Review Output & Proposals
* The script automatically generates a dated Markdown compliance audit report saved to the `doc/` directory:
  * E.g., `doc/compliance_report_YYYYMMDD_HHMMSS.md`
* Each report details pass/fail checks, scanned files findings, and concrete **Proposals** with their engineering **Rationales** to resolve any identified vulnerabilities.

## Secret Management Workflow (with `ignore/`)
To prevent logging or committing sensitive credentials:
1. Save temporary raw credentials or unmasked configuration files in the root **[ignore/](file:///C:/Users/hesh1/Desktop/fahem/ignore)** folder.
2. The `ignore/` folder is blocked in the root **[.gitignore](file:///C:/Users/hesh1/Desktop/fahem/.gitignore)** file and will never be staged or committed.
3. Migrate the credentials from `ignore/` into Google Cloud Secret Manager.
4. Replace raw values in the codebase with masked placeholders (e.g. `[MASKED_API_KEY]`) or GCP Secret Manager fetch calls.
5. Safely commit your masked code.
