#!/bin/bash
#
# E2E Test Runner Script
# 
# Automatically starts dev server, waits for it, runs tests, and shows report
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WEB_DIR"

echo "=========================================="
echo "EzDoc E2E Test Runner"
echo "=========================================="
echo ""

# Check if credentials are set
if [ -z "$TEST_USER_EMAIL" ] && [ -z "$TEST_USER_PASSWORD" ]; then
    echo "⚠️  WARNING: TEST_USER_EMAIL and TEST_USER_PASSWORD not set"
    echo "   Tests may fail if authentication is required"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if dev server is already running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Dev server already running on port 3000"
    SERVER_RUNNING=true
else
    echo "🚀 Starting dev server..."
    SERVER_RUNNING=false
    
    # Start dev server in background
    npm run dev > /tmp/ezdoc-dev-server.log 2>&1 &
    DEV_SERVER_PID=$!
    
    echo "   PID: $DEV_SERVER_PID"
    echo "   Waiting for server to be ready..."
    
    # Wait for server to be ready (max 2 minutes)
    MAX_WAIT=120
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Dev server is ready!"
            break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        echo "   Waiting... (${ELAPSED}s/${MAX_WAIT}s)"
    done
    
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo "❌ Dev server failed to start after ${MAX_WAIT} seconds"
        echo "   Check logs: /tmp/ezdoc-dev-server.log"
        kill $DEV_SERVER_PID 2>/dev/null || true
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Running Playwright Tests"
echo "=========================================="
echo ""

# Run tests (use repo config to enable globalSetup + storageState)
npx playwright test --config tests/playwright.config.ts "$@"
TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests PASSED!"
else
    echo "❌ Some tests FAILED (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "View detailed report:"
echo "  npx playwright show-report"
echo ""

# Cleanup: Kill dev server if we started it
if [ "$SERVER_RUNNING" = false ] && [ -n "$DEV_SERVER_PID" ]; then
    echo "Stopping dev server (PID: $DEV_SERVER_PID)..."
    kill $DEV_SERVER_PID 2>/dev/null || true
    wait $DEV_SERVER_PID 2>/dev/null || true
fi

exit $TEST_EXIT_CODE





