#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> dev.log
  NODE_ENV=production DATABASE_URL="file:/home/z/my-project/db/custom.db" NODE_OPTIONS="--max-old-space-size=768" node .next/standalone/server.js >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE" >> dev.log
  sleep 2
done
