#!/usr/bin/env sh
echo "Running Download Worker..."
nodejs workers/download-worker.js $1 &
echo "Running Scale Worker..."
nodejs workers/scale-worker.js $1 &
echo "Running Color Worker..."
nodejs workers/color-worker.js $1 &
echo "Running Web..."
nodejs web.js $1
