import os
import subprocess

# Kill the old tunnel
os.system("pkill -f cloudflared")
os.system("pkill -f pinggy")

print("Killed old tunnels!")
