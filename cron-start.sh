#!/bin/bash
# Start/restart the NewMobility server
# This script is called by cron to keep the server alive

# Kill any existing server processes
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "node.*server.js" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Start production server
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export NEON_DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=256"

# Start in background with nohup
nohup node .next/standalone/server.js > /home/z/my-project/dev.log 2>&1 &
disown

echo "[$(date)] Server started with PID $!" >> /tmp/cron-server.log
