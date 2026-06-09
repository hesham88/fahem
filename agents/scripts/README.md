# Scripts Directory

This directory contains reusable, maintainable, and scalable scripts to automate project tasks, standardizing quality and optimizing performance.

## Deployment Automation (`scripts/deploy/`)

We have automated various deployment scenarios into separate, single-trigger scripts located in the `scripts/deploy/` directory:

1. **`deploy_local.ps1`**: Sets up and configures the local development environment. It checks system prerequisites (Node.js, Python), builds the virtual environment for agents, installs Node packages for the web, verifies configurations, and outputs exact commands to run the application locally.
2. **`deploy_agent.ps1`**: Deploys the Python ADK Agents microservice directly to Google Cloud Run under us-east4, configuring VPC connectors and Secret Manager credentials.
3. **`deploy_web.ps1`**: Configures safe Git author identity (`hesham88 <hesham1988@gmail.com>`), commits pending changes, and pushes to GitHub `main` to trigger automated Next.js building on Firebase App Hosting.
4. **`deploy_all.ps1`**: A single master script that deploys both the backend agent and triggers the web frontend build sequentially.

### Usage

To execute any script from the project root:
```powershell
# For local environment setup
.\scripts\deploy\deploy_local.ps1

# For deploying Cloud Run agent
.\scripts\deploy\deploy_agent.ps1

# For pushing updates and triggering web deployment
.\scripts\deploy\deploy_web.ps1 -CommitMessage "chore: update environment configurations"

# For full deployment in one go
.\scripts\deploy\deploy_all.ps1 -CommitMessage "fix: update db-metadata fetching URL"
```

## Design Goals

1. **High Reusability**: Parameterize scripts so they can be run under different configurations.
2. **Maintainability & Scalability**: Write clear, modular, and self-documenting scripts.
3. **Standardization**: Ensure scripts enforce code quality, formatting, and performance checks.
