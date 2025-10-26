#!/bin/bash

# RBAC Task 4: Live API Testing with actual HTTP calls

BASE_URL="http://localhost:3005"

echo "Testing Observation API Endpoints..."
echo ""

# Test 1: Health check
echo "1. Testing API health..."
HEALTH=$(curl -s "${BASE_URL}/api/health")
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "✓ API server is running"
else
    echo "✗ API server not responding"
    exit 1
fi

echo ""
echo "Note: Full API testing requires authentication cookies."
echo "The generated test report provides database-level validation."
echo ""
echo "For comprehensive HTTP testing, consider using:"
echo "- Playwright for browser-based testing"
echo "- Supertest for Node.js API testing"
echo "- Postman/Bruno for manual testing"
echo ""

