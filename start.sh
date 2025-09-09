#!/bin/bash
set -e

# start backend with migrations
./backend/start.sh node server.js &
BACK_PID=$!

# start frontend
npm run dev --prefix frontend &
FRONT_PID=$!

# terminate both on exit
trap "kill $BACK_PID $FRONT_PID" EXIT

wait $BACK_PID $FRONT_PID
