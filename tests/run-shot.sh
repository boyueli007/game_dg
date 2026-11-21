#!/bin/bash
cd /root/eu-war-mobile || exit 1
pkill -f "http.server 8123" 2>/dev/null
pkill -f "remote-debugging-port=9222" 2>/dev/null
sleep 1
setsid nohup python3 -m http.server 8123 --bind 127.0.0.1 > /tmp/httpd.log 2>&1 < /dev/null &
setsid nohup /usr/bin/chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --window-size=430,900 --remote-debugging-port=9222 about:blank > /tmp/chrome3.log 2>&1 < /dev/null &
sleep 4
node tests/shot.cjs
CODE=$?
pkill -f "remote-debugging-port=9222" 2>/dev/null
ls -l /tmp/shot-*.png
exit $CODE