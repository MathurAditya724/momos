#!/bin/bash

# Start your services in the background
google-chrome --headless --no-sandbox --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 &

# Must end with this command
exec bun /container-server/dist/index.js