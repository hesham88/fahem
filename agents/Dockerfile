FROM python:3.12-slim

# Ensure standard output and error streams are sent straight to terminal without buffering
ENV PYTHONUNBUFFERED=1

# Install Node.js and npm to make npx available for launching the MongoDB MCP server
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-install MongoDB MCP server to guarantee offline availability and eliminate cold-start download overhead
RUN npm install --no-package-lock --no-audit --no-fund @mongodb-js/mongodb-mcp-server

COPY . .

# Start the ADK API server with auto-create-session enabled. 
# We use the shell form of CMD to allow environment variable expansion of $PORT injected by Cloud Run.
CMD python -m google.adk.cli api_server --host 0.0.0.0 --port $PORT --auto_create_session .
