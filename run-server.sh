#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=512"
exec node .next/standalone/server.js
