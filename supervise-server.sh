#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"

# Clean up old PID files
rm -f /home/z/my-project/dev-server.pid

# Start server
node .next/standalone/server.js &
SERVER_PID=$!
echo $SERVER_PID > /home/z/my-project/dev-server.pid
echo "Server started with PID $SERVER_PID"

# Keep checking and restarting
while true; do
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "[$(date)] Server died, restarting..." >> /home/z/my-project/supervise.log
    node .next/standalone/server.js &
    SERVER_PID=$!
    echo $SERVER_PID > /home/z/my-project/dev-server.pid
    echo "[$(date)] Restarted with PID $SERVER_PID" >> /home/z/my-project/supervise.log
  fi
  sleep 1
done
