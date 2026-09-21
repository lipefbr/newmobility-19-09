#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
  echo "[$(date)] Starting production server..."
  DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  NEON_DATABASE_URL="postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  node --max-old-space-size=512 server.js >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 2s..."
  sleep 2
done
