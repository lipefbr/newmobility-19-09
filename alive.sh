#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export NEON_DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
export HOSTNAME="0.0.0.0"
export PORT=3000
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  echo "[$(date)] Starting server..." >> alive.log
  node .next/standalone/server.js >> alive.log 2>&1
  echo "[$(date)] Server exited" >> alive.log
  sleep 2
done
