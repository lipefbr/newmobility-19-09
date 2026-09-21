#!/bin/bash
cd /home/z/my-project
while true; do
  PORT=3000 NODE_OPTIONS='--max-old-space-size=512' node .next/standalone/server.js
  echo "[$(date)] Server crashed, restarting in 3s..."
  sleep 3
done
