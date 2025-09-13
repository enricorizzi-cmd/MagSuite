#!/bin/sh
set -e

# Ensure we are in the backend directory regardless of where the script is called from
cd "$(dirname "$0")"

# Prefer /etc/secrets, but fall back to /tmp if the filesystem is read-only
CERT_DIR=${CERT_DIR:-/etc/secrets}
CERT_PATH="$CERT_DIR/supabase-ca.crt"

if [ -n "$SUPABASE_CA_CERT" ]; then
  if ! mkdir -p "$CERT_DIR" 2>/dev/null; then
    # Read-only root FS (e.g., Render); use a writable temp directory instead
    CERT_DIR=/tmp/secrets
    CERT_PATH="$CERT_DIR/supabase-ca.crt"
    mkdir -p "$CERT_DIR"
  fi

  if echo "$SUPABASE_CA_CERT" | base64 -d > "$CERT_PATH" 2>/dev/null; then
    export DB_CA_PATH="$CERT_PATH"
    export NODE_EXTRA_CA_CERTS="$CERT_PATH"
  else
    echo "Warning: Could not decode/write SUPABASE_CA_CERT. Continuing without custom CA." >&2
  fi
fi

# Run database migrations before starting the server
npm run migrate

exec "$@"
