#!/bin/sh
set -e

# Ensure we are in the backend directory regardless of where the script is called from
cd "$(dirname "$0")"

# Prefer /etc/secrets, but fall back to /tmp if the filesystem is read-only
CERT_DIR=${CERT_DIR:-/etc/secrets}
CERT_PATH="$CERT_DIR/supabase-ca.crt"

# If a SUPABASE_CA_CERT is provided via env, persist it for Node to pick up
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

  # Sanitize the env value: trim whitespace and surrounding quotes
  RAW_CA=$(printf %s "$SUPABASE_CA_CERT")
  SAN_CA=$(printf %s "$RAW_CA" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

  # If the env already contains a PEM, write it as-is; otherwise treat as base64
  if printf %s "$SAN_CA" | grep -q "-----BEGIN CERTIFICATE-----"; then
    printf %s "$SAN_CA" > "$CERT_PATH" 2>/dev/null || true
  else
    # Strip whitespace before decoding to handle UI-inserted spaces/newlines and quotes
    printf %s "$SAN_CA" | tr -d '\r\n\t ' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" | base64 -d > "$CERT_PATH" 2>/dev/null || true
  fi

  if [ -s "$CERT_PATH" ]; then
    export DB_CA_PATH="$CERT_PATH"
    export NODE_EXTRA_CA_CERTS="$CERT_PATH"
  else
    echo "Warning: Could not decode/write SUPABASE_CA_CERT. Continuing without custom CA." >&2
  fi
fi

# If PGSSLMODE requests no-verify, normalize DATABASE_URL accordingly and
# ensure Node does not reject TLS during migrations.
if [ "${PGSSLMODE}" = "no-verify" ]; then
  if [ -n "$DATABASE_URL" ]; then
    # Swap any existing sslmode=... to no-verify, or append if missing
    case "$DATABASE_URL" in
      *"sslmode="*) DATABASE_URL="$(printf %s "$DATABASE_URL" | sed -E 's/(sslmode=)[^&]*/\1no-verify/')" ;;
      *"?"*) DATABASE_URL="${DATABASE_URL}&sslmode=no-verify" ;;
      *) DATABASE_URL="${DATABASE_URL}?sslmode=no-verify" ;;
    esac
    export DATABASE_URL
  fi
  export NODE_TLS_REJECT_UNAUTHORIZED=0
fi

# Run database migrations before starting the server
npm run migrate

exec "$@"
