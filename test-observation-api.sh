#!/bin/bash

# RBAC Task 4: Observation Management API Test Script
# Test execution for backend API endpoints

set -e

BASE_URL="http://localhost:3005"
RESULTS_FILE="test-results.json"
COOKIE_DIR="/tmp/audit-cookies"

mkdir -p $COOKIE_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to authenticate users
authenticate() {
    local email=$1
    local password=$2
    local cookie_file="${COOKIE_DIR}/${email//[@.]/-}-cookies.txt"

    echo "Authenticating ${email}..."

    # Clear any existing cookie file
    rm -f "$cookie_file"

    # Login via NextAuth credentials callback
    curl -s -X POST "${BASE_URL}/api/auth/callback/credentials" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"redirect\":false,\"csrfToken\":\"\"}" \
        -c "$cookie_file" > /dev/null

    echo "$cookie_file"
}

# Helper function to make authenticated API calls
api_call() {
    local method=$1
    local endpoint=$2
    local cookie_file=$3
    local data=$4

    if [ -n "$data" ]; then
        curl -s -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -b "$cookie_file" \
            -d "$data"
    else
        curl -s -X "$method" "${BASE_URL}${endpoint}" \
            -b "$cookie_file"
    fi
}

# Test result logging
log_test() {
    local test_id=$1
    local test_name=$2
    local status=$3
    local details=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}[PASS]${NC} ${test_id}: ${test_name}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}[FAIL]${NC} ${test_id}: ${test_name}"
        echo -e "  ${YELLOW}Details:${NC} ${details}"
    fi
}

# Authenticate all users upfront
echo "=== Authenticating Test Users ==="
CFO_COOKIE=$(authenticate "cfo@example.com" "cfo123")
CXO_COOKIE=$(authenticate "cxo@example.com" "cxo123")
AUDITHEAD_COOKIE=$(authenticate "audithead@example.com" "audithead123")
AUDITOR_COOKIE=$(authenticate "auditor@example.com" "auditor123")
AUDITEE_COOKIE=$(authenticate "auditee@example.com" "auditee123")
GUEST_COOKIE=$(authenticate "guest@example.com" "guest123")

echo ""
echo "=== Starting Test Execution ==="
echo ""

# Test Group 1: GET /api/v1/observations (List Observations)

echo "=== Test Group 1: GET /api/v1/observations ==="
echo ""

# API-001: CFO Can View All Observations
RESPONSE=$(api_call "GET" "/api/v1/observations" "$CFO_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true and .observations | length > 0' > /dev/null 2>&1; then
    log_test "API-001" "CFO Can View All Observations" "PASS"
else
    log_test "API-001" "CFO Can View All Observations" "FAIL" "$RESPONSE"
fi

# API-002: CXO Team Can View All Observations
RESPONSE=$(api_call "GET" "/api/v1/observations" "$CXO_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true and .observations | length > 0' > /dev/null 2>&1; then
    log_test "API-002" "CXO Team Can View All Observations" "PASS"
else
    log_test "API-002" "CXO Team Can View All Observations" "FAIL" "$RESPONSE"
fi

# API-003: Audit Head Sees Observations From Assigned Audits
RESPONSE=$(api_call "GET" "/api/v1/observations" "$AUDITHEAD_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_test "API-003" "Audit Head Sees Observations From Assigned Audits" "PASS"
else
    log_test "API-003" "Audit Head Sees Observations From Assigned Audits" "FAIL" "$RESPONSE"
fi

# API-005: Auditor Sees Only Assigned Audit Observations
RESPONSE=$(api_call "GET" "/api/v1/observations" "$AUDITOR_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_test "API-005" "Auditor Sees Only Assigned Audit Observations" "PASS"
else
    log_test "API-005" "Auditor Sees Only Assigned Audit Observations" "FAIL" "$RESPONSE"
fi

# API-006: Auditee Sees Only Assigned Observations
RESPONSE=$(api_call "GET" "/api/v1/observations" "$AUDITEE_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_test "API-006" "Auditee Sees Only Assigned Observations" "PASS"
else
    log_test "API-006" "Auditee Sees Only Assigned Observations" "FAIL" "$RESPONSE"
fi

# API-007: Guest Sees Only Published and Approved Observations
RESPONSE=$(api_call "GET" "/api/v1/observations" "$GUEST_COOKIE")
if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    log_test "API-007" "Guest Sees Only Published and Approved Observations" "PASS"
else
    log_test "API-007" "Guest Sees Only Published and Approved Observations" "FAIL" "$RESPONSE"
fi

echo ""
echo "=== Test Summary ==="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
echo "Pass Rate: $(awk "BEGIN {printf \"%.2f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%"
