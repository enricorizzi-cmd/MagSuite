#!/bin/sh
set -e

# Ensure we are in the backend directory regardless of where the script is called from
cd "$(dirname "$0")"

CERT_DIR=/etc/secrets
CERT_PATH="$CERT_DIR/supabase-ca.crt"

if [ -n "$SUPABASE_CA_CERT" ]; then
  mkdir -p "$CERT_DIR"
  echo "$SUPABASE_CA_CERT" | base64 -d > "$CERT_PATH"
fi

export DB_CA_PATH="$CERT_PATH"
export NODE_EXTRA_CA_CERTS="$CERT_PATH"

# Run database migrations before starting the server
npm run migrate

exec "$@"
