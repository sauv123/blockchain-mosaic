#!/bin/bash
while true; do
  echo "Starting localtunnel..."
  npx --yes localtunnel --port 3000 --local-host 127.0.0.1 --subdomain easy-xr
  echo "Localtunnel crashed. Restarting in 2 seconds..."
  sleep 2
done
