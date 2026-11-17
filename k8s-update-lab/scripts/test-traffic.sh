#!/usr/bin/env bash

URL="${1:-http://localhost:8080/api/info}"
INTERVAL="${2:-0.4}"

echo "=========================================================="
echo " Kubernetes Live Traffic Tester (Bash Version)"
echo " Target URL: $URL"
echo " Press Ctrl+C to Stop"
echo "=========================================================="

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

success=0
fail=0

while true; do
  time_str=$(date +"%H:%M:%S")
  response=$(curl -s --connect-timeout 1 -m 2 "$URL")
  ret_code=$?

  if [ $ret_code -eq 0 ] && [ -n "$response" ]; then
    success=$((success + 1))
    # Extract version and podName using grep/sed
    ver=$(echo "$response" | grep -o '"version":"[^"]*' | cut -d'"' -f4)
    pod=$(echo "$response" | grep -o '"podName":"[^"]*' | cut -d'"' -f4)
    echo -e "${GRAY}[$time_str]${NC} ${GREEN}[200 OK]${NC} Ver: ${CYAN}${ver}${NC} | Pod: ${pod} ${GRAY}(OK: $success, Drop: $fail)${NC}"
  else
    fail=$((fail + 1))
    echo -e "${GRAY}[$time_str]${NC} ${RED}[DOWNTIME DROP] Failed to reach service! (Drop: $fail)${NC}"
  fi

  sleep "$INTERVAL"
done
