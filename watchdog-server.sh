#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export NEON_DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=512"

echo "[$(date)] Watchdog starting..." >> /home/z/my-project/watchdog.log

# Start server in background  
start_server() {
  node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1 &
  SERVER_PID=$!
  echo "[$(date)] Server started with PID $SERVER_PID" >> /home/z/my-project/watchdog.log
}

start_server

# Watchdog loop
while true; do
  sleep 3
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[$(date)] Server died, restarting..." >> /home/z/my-project/watchdog.log
    start_server
    sleep 2
  fi
done
