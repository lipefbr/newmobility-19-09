#!/bin/bash
while true; do
  echo "[$(date)] Starting dev server..."
  NODE_OPTIONS='--max-old-space-size=2048' npx next dev -p 3000 --webpack >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server crashed, restarting in 3s..."
  sleep 3
done
