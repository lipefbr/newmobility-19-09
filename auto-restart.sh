#!/bin/bash
while true; do
  cd /home/z/my-project
  NODE_OPTIONS='--max-old-space-size=2048' npx next dev -p 3000 --webpack >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
