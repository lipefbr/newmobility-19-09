#!/bin/bash
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_OPTIONS="--max-old-space-size=128"
export NODE_ENV="production"

while true; do
    echo "[$(date)] Starting server..." >> /tmp/server-restart.log
    node /home/z/my-project/.next/standalone/server.js 2>&1
    EXIT=$?
    echo "[$(date)] Server exited ($EXIT), restarting in 1s..." >> /tmp/server-restart.log
    sleep 1
done
