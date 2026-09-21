#!/bin/bash
while true; do
  cd /home/z/my-project
  PORT=3000 NODE_OPTIONS='--max-old-space-size=512' node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server crashed, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
