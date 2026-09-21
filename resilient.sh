#!/bin/bash
# Resilient server script - auto-restarts on crash
cd /home/z/my-project
while true; do
  NODE_OPTIONS='--max-old-space-size=2048' npx next dev -p 3000 --webpack >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server died, restarting in 2s..." >> /home/z/my-project/dev.log
  sleep 2
done
