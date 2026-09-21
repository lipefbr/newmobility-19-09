#!/bin/bash
while true; do
  npx next dev -p 3000
  echo "Server crashed, restarting in 5s..."
  sleep 5
done
