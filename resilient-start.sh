#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export HOSTNAME="0.0.0.0"
export PORT=3000
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  echo "[$(date)] Starting production server..." >> resilient.log
  node .next/standalone/server.js >> resilient.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> resilient.log
  sleep 1
done
