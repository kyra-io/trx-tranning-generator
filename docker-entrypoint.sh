#!/bin/sh
set -eu

node scripts/migrate.cjs

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Starting application..."
exec node server.js
