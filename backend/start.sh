#!/bin/sh
set -e

# Ensure we are in the backend directory regardless of where the script is called from
cd "$(dirname "$0")"

# Prefer /etc/secrets, but fall back to /tmp if the filesystem is read-only
CERT_DIR=${CERT_DIR:-/etc/secrets}
CERT_PATH="$CERT_DIR/supabase-ca.crt"

if [ -n "$SUPABASE_CA_CERT" ]; then
  # Try /etc/secrets first; if not writable, fall back to /tmp/secrets
  for d in "$CERT_DIR" "/tmp/secrets"; do
    mkdir -p "$d" 2>/dev/null || true
    if ( : >"$d/.writetest" ) 2>/dev/null; then
      rm -f "$d/.writetest" 2>/dev/null || true
      CERT_DIR="$d"
      CERT_PATH="$CERT_DIR/supabase-ca.crt"
      break
    fi
  done

  # If the env already contains a PEM, write it as-is; otherwise treat as base64
  if printf %s "$SUPABASE_CA_CERT" | grep -q "-----BEGIN CERTIFICATE-----"; then
    printf %s "$SUPABASE_CA_CERT" > "$CERT_PATH" 2>/dev/null || true
  else
    # Strip whitespace before decoding to handle UI-inserted spaces/newlines
    printf %s "$SUPABASE_CA_CERT" | tr -d '\r\n\t ' | base64 -d > "$CERT_PATH" 2>/dev/null || true
  fi

  if [ -s "$CERT_PATH" ]; then
    export DB_CA_PATH="$CERT_PATH"
    export NODE_EXTRA_CA_CERTS="$CERT_PATH"
  else
    echo "Warning: Could not decode/write SUPABASE_CA_CERT. Continuing without custom CA." >&2
  fi
fi

# Run database migrations before starting the server
npm run migrate

exec "$@"
