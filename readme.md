# Fahem Project

This repository/workspace is initialized as the workspace for the **Fahem** project.

## Directory Structure

Here is an overview of the initialized project structure:

* **[memory/](file:///C:/Users/hesh1/Desktop/fahem/memory)**: Space for project memories, persistent state, context summaries, and learned knowledge (holds plans, walkthroughs, tasks, progress, history, and revisions).
* **[log/](file:///C:/Users/hesh1/Desktop/fahem/log)**: Execution logs, run diaries, diagnostic dumps, and saved turn-by-turn prompts/responses.
* **[security/](file:///C:/Users/hesh1/Desktop/fahem/security)**: Security guardrails, guidelines, and access controls.
* **[doc/](file:///C:/Users/hesh1/Desktop/fahem/doc)**: Project scope, important documents, specifications, and reports.
* **[scratches/](file:///C:/Users/hesh1/Desktop/fahem/scratches)**: Temporary scratch files, raw data, and play areas.
* **[plan/](file:///C:/Users/hesh1/Desktop/fahem/plan)**: High-level roadmap, task lists, and tracking files.
* **[screenshots/](file:///C:/Users/hesh1/Desktop/fahem/screenshots)**: Visual assets, application screenshots, and design mockups.
* **[agents/](file:///C:/Users/hesh1/Desktop/fahem/agents)**: Subagent definitions, prompts, configurations, and playground workspace.
* **[web/](file:///C:/Users/hesh1/Desktop/fahem/web)**: Frontend assets and the Next.js web application.
* **[scripts/](file:///C:/Users/hesh1/Desktop/fahem/scripts)**: Reusable, maintainable, and scalable scripts to automate workflows, ensure standardization, and optimize performance.

## Project Rules & Guardrails
1. **Turn Logs**: Every interaction turn (prompts and responses) must be logged under the `log/` directory.
2. **Revisions over Deletion/Overwrites**: No files should be deleted or destructively overridden. Revisions, version control, or append-only logs must be used.
3. **Memory Integrity**: All plans, progress, history, tasks, and walkthroughs are kept up to date inside the `memory/` directory.
4. **Security Guardrails**: Always consult and respect rules defined in the `security/` directory.

## Project Executables

* **[agy.exe](file:///C:/Users/hesh1/Desktop/fahem/agy.exe)**: Antigravity CLI binary used to orchestrate agent sessions and tasks.

