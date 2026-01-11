#!/bin/bash
set -e

echo "🐳 Starting Docker containers for vision-site..."
echo ""

# Kill any existing local processes
echo "Cleaning up existing processes..."
pkill -f "Microsoft Edge.*remote-debugging-port" || true
lsof -ti:3001 | xargs kill -9 || true
lsof -ti:9222 | xargs kill -9 || true

echo ""
echo "Building and starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 2

# Check bridge health
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ CDP Bridge is healthy"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ CDP Bridge failed to start"
  docker-compose logs cdp-bridge
  exit 1
fi

# Check edge health
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:9222/json > /dev/null 2>&1; then
    Edge browser is healthy"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Edge browser failed to start"
  docker-compose logs edge
  exit 1
fi

echo ""
echo "🎉 All services are running!"
echo ""
echo "📋 Available commands:"
echo "   docker-compose logs -f          Show logs"
echo "   docker-compose ps               Show status"
echo "   ./docker-down.sh                Stop containers"
echo "   node cdp-cli.js navigate <url>  Navigate b"
