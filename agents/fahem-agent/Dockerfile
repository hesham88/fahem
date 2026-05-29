FROM python:3.12-slim

# Ensure standard output and error streams are sent straight to terminal without buffering
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Start the ADK API server with auto-create-session enabled. 
# We use the shell form of CMD to allow environment variable expansion of $PORT injected by Cloud Run.
CMD python -m google.adk.cli api_server --host 0.0.0.0 --port $PORT --auto_create_session .
