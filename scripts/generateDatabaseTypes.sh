#!/bin/bash
# Load environment variables from .env file in the same directory
source "$(dirname "$0")/.env"

if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "Error: SUPABASE_PROJECT_ID not found in .env file"
  exit 1
fi

npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > packages/common-dto/src/generated/models/Database.ts
