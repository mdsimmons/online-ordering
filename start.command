#!/bin/bash
cd "$(dirname "$0")"
echo "=== Online Ordering App ==="
echo "Killing any old servers..."
pkill -f "next dev" 2>/dev/null
sleep 1

echo "Starting server..."
npm run dev
