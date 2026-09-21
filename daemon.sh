#!/bin/bash
cd /home/z/my-project
export PORT=3000
export NODE_OPTIONS='--max-old-space-size=128'
while true; do
  node .next/standalone/server.js 2>&1 | tee -a /home/z/my-project/dev.log
  echo "[$(date)] RESTARTING..." >> /home/z/my-project/dev.log
  sleep 3
done
