#!/bin/bash
while true; do
    if ! curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
        echo "[$(date)] Server down, restarting..." >> /home/z/my-project/watchdog.log
        cd /home/z/my-project
        kill $(lsof -t -i:3000) 2>/dev/null
        sleep 1
        setsid bun run dev > /home/z/my-project/dev.log 2>&1 &
        sleep 10
    fi
    sleep 5
done
