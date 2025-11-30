#!/bin/bash

# Simple script to start the Stellar x402 example
# This starts both the facilitator and the example server

set -e

echo "🚀 Starting Stellar x402 Example..."
echo ""

# Check if facilitator is already running
if curl -s http://localhost:4022/health > /dev/null 2>&1; then
  echo "✅ Facilitator already running on port 4022"
else
  echo "📡 Starting facilitator..."
  cd ../packages/facilitator
  pnpm dev &
  FACILITATOR_PID=$!
  echo "   Facilitator PID: $FACILITATOR_PID"
  
  # Wait for facilitator to be ready
  echo "   Waiting for facilitator to start..."
  for i in {1..30}; do
    if curl -s http://localhost:4022/health > /dev/null 2>&1; then
      echo "✅ Facilitator ready!"
      break
    fi
    sleep 1
  done
fi

echo ""
echo "🌐 Starting example server..."
cd ../examples/server-example

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "   Installing dependencies..."
  pnpm install
fi

echo ""
echo "✅ Starting server on http://localhost:3000"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Click any protected endpoint"
echo "   3. Connect Freighter wallet and pay!"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start the server
pnpm start

