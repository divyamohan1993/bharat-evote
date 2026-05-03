#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-asia-east1}"
SERVICE="${SERVICE:-bharat-evote}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: no GCP project. Run: gcloud config set project <id>" >&2
  exit 1
fi

echo "Deploying $SERVICE to $REGION (project=$PROJECT_ID)"

gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 60s \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,LOG_LEVEL=info" \
  --allow-unauthenticated \
  --quiet

URL=$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')
echo
echo "✅ Deployed: $URL"
echo "   /pitch  → $URL/pitch/"
echo "   /report → $URL/report/"
echo "   /health → $URL/health"
