#!/bin/bash

# RBAC Task 3 - API Endpoint Testing Script
# This script tests all audit management endpoints using direct API calls

BASE_URL="http://localhost:3005"
COOKIE_FILE="/tmp/test-cookies.txt"

echo "==================================="
echo "RBAC Task 3 - API Endpoint Testing"
echo "==================================="
echo ""

# Clean up any existing cookie file
rm -f $COOKIE_FILE

# Function to get CSRF token
get_csrf_token() {
    curl -s -c $COOKIE_FILE "$BASE_URL/api/auth/csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4
}

# Function to login
login_user() {
    local email=$1
    local password=$2
    local csrf_token=$(get_csrf_token)

    echo "Logging in as $email..."

    # Perform login
    curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -b $COOKIE_FILE \
        -c $COOKIE_FILE \
        --data-urlencode "csrfToken=$csrf_token" \
        --data-urlencode "email=$email" \
        --data-urlencode "password=$password" \
        --data-urlencode "callbackUrl=$BASE_URL/" \
        --data-urlencode "json=true" \
        -L > /dev/null 2>&1

    # Verify login by checking session
    local session_check=$(curl -s -b $COOKIE_FILE "$BASE_URL/api/auth/session")
    if echo "$session_check" | grep -q "\"email\":\"$email\""; then
        echo "✓ Login successful for $email"
        return 0
    else
        echo "✗ Login failed for $email"
        echo "Session response: $session_check"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    local expected_status=$4
    local description=$5

    echo ""
    echo "Testing: $description"
    echo "Request: $method $path"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -b $COOKIE_FILE "$BASE_URL$path")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -b $COOKIE_FILE \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$path")
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PATCH -b $COOKIE_FILE \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$path")
    fi

    status=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    if [ "$status" = "$expected_status" ]; then
        echo "✓ Status: $status (Expected: $expected_status)"
        echo "Response preview: $(echo "$body" | head -c 200)"
    else
        echo "✗ Status: $status (Expected: $expected_status)"
        echo "Full response: $body"
    fi
}

# Test Case 1: CFO can view all audits
echo ""
echo "=========================================="
echo "Test Case 1: CFO Can View All Audits"
echo "=========================================="
login_user "cfo@example.com" "cfo123"
test_endpoint "GET" "/api/v1/audits" "" "200" "CFO lists all audits"

# Test Case 2: Audit Head sees only assigned audits
echo ""
echo "=========================================="
echo "Test Case 2: AUDIT_HEAD Sees Only Assigned Audits"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "audithead@example.com" "audithead123"
test_endpoint "GET" "/api/v1/audits" "" "200" "AUDIT_HEAD lists assigned audits"

# Test Case 3: Auditor sees only assigned audits
echo ""
echo "=========================================="
echo "Test Case 3: AUDITOR Sees Only Assigned Audits"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "auditor@example.com" "auditor123"
test_endpoint "GET" "/api/v1/audits" "" "200" "AUDITOR lists assigned audits"

# Test Case 4: CFO can create audit
echo ""
echo "=========================================="
echo "Test Case 4: CFO Can Create New Audit"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "cfo@example.com" "cfo123"
test_endpoint "POST" "/api/v1/audits" \
    '{"plantId":"test-plant-1","title":"API Test Audit","purpose":"Testing audit creation via API","startDate":"2025-10-22","endDate":"2025-10-30"}' \
    "201" "CFO creates new audit"

# Test Case 5: Auditor cannot create audit
echo ""
echo "=========================================="
echo "Test Case 5: AUDITOR Cannot Create Audit"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "auditor@example.com" "auditor123"
test_endpoint "POST" "/api/v1/audits" \
    '{"plantId":"test-plant-1","title":"Unauthorized Audit","purpose":"Should fail","startDate":"2025-10-22","endDate":"2025-10-30"}' \
    "403" "AUDITOR blocked from creating audit"

# Test Case 6: CFO can lock audit
echo ""
echo "=========================================="
echo "Test Case 6: CFO Can Lock Audit"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "cfo@example.com" "cfo123"
test_endpoint "POST" "/api/v1/audits/test-audit-1/lock" "" "200" "CFO locks audit"

# Test Case 7: CXO cannot edit locked audit
echo ""
echo "=========================================="
echo "Test Case 7: CXO Cannot Edit Locked Audit"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "cxo@example.com" "cxo123"
test_endpoint "PATCH" "/api/v1/audits/test-audit-1" \
    '{"title":"Updated by CXO"}' \
    "403" "CXO blocked from editing locked audit"

# Test Case 8: CFO can edit locked audit (override)
echo ""
echo "=========================================="
echo "Test Case 8: CFO Can Edit Locked Audit (Override)"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "cfo@example.com" "cfo123"
test_endpoint "PATCH" "/api/v1/audits/test-audit-1" \
    '{"title":"CFO Override Edit"}' \
    "200" "CFO edits locked audit"

# Test Case 9: CFO can unlock audit
echo ""
echo "=========================================="
echo "Test Case 9: CFO Can Unlock Audit"
echo "=========================================="
test_endpoint "POST" "/api/v1/audits/test-audit-1/unlock" "" "200" "CFO unlocks audit"

# Test Case 10: CFO can complete audit (auto-lock)
echo ""
echo "=========================================="
echo "Test Case 10: CFO Can Complete Audit"
echo "=========================================="
test_endpoint "POST" "/api/v1/audits/test-audit-1/complete" "" "200" "CFO completes audit (auto-lock)"

# Test Case 11: Cannot complete already-completed audit
echo ""
echo "=========================================="
echo "Test Case 11: Cannot Complete Already-Completed Audit"
echo "=========================================="
test_endpoint "POST" "/api/v1/audits/test-audit-1/complete" "" "400" "Prevent double completion"

# Test Case 12: Set visibility rules
echo ""
echo "=========================================="
echo "Test Case 12: Set Visibility Rule - last_12m"
echo "=========================================="
test_endpoint "POST" "/api/v1/audits/test-audit-1/visibility" \
    '{"rules":"last_12m"}' \
    "200" "CFO sets visibility to last_12m"

# Test Case 13: Audit Head can view assigned audit detail
echo ""
echo "=========================================="
echo "Test Case 13: AUDIT_HEAD Can View Assigned Audit"
echo "=========================================="
rm -f $COOKIE_FILE
login_user "audithead@example.com" "audithead123"
test_endpoint "GET" "/api/v1/audits/test-audit-1" "" "200" "AUDIT_HEAD views assigned audit detail"

# Test Case 14: Get visibility rules
echo ""
echo "=========================================="
echo "Test Case 14: Get Visibility Rules"
echo "=========================================="
test_endpoint "GET" "/api/v1/audits/test-audit-1/visibility" "" "200" "Anyone can read visibility rules"

echo ""
echo "==================================="
echo "Testing Complete!"
echo "==================================="
echo ""
echo "See detailed results above for each test case."
echo "Cookie file: $COOKIE_FILE"

# Clean up
rm -f $COOKIE_FILE
