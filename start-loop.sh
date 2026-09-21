#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"
while true; do
  node .next/standalone/server.js 2>>/home/z/my-project/server-stderr.log &
  SERVER_PID=$!
  # Wait for server to exit
  wait $SERVER_PID 2>/dev/null
  sleep 1
done
