#!/bin/sh
set -e

CERT_DIR=/etc/secrets
CERT_PATH="$CERT_DIR/supabase-ca.crt"

if [ -n "$SUPABASE_CA_CERT" ]; then
  mkdir -p "$CERT_DIR"
  echo "$SUPABASE_CA_CERT" | base64 -d > "$CERT_PATH"
fi

export DB_CA_PATH="$CERT_PATH"
export NODE_EXTRA_CA_CERTS="$CERT_PATH"

exec "$@"
