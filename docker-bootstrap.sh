#!/bin/sh
set -eu

echo "Bootstrapping muscle catalog, exercise catalog, and exercise images..."
node scripts/seed.cjs
node scripts/seed-exercises.cjs
node scripts/seed-exercise-images.cjs
echo "Catalog and exercise image bootstrap completed."
