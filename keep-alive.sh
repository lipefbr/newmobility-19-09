#!/bin/bash
while true; do
  cd /home/z/my-project
  PORT=3000 NODE_OPTIONS='--max-old-space-size=512' node .next/standalone/server.js
  echo "[$(date)] Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
