#!/bin/sh
set -eu

echo "Bootstrapping muscle and exercise catalog..."
node scripts/seed.cjs
node scripts/seed-exercises.cjs
echo "Catalog bootstrap completed."
