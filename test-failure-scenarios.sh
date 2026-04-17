#!/bin/bash
echo "Testing RoofReady Failure Scenarios..."
echo "======================================"

API="https://roofready-production.up.railway.app"

test_case() {
  local name=$1
  local data=$2
  local expected_field=$3
  local expected_value=$4
  
  echo -e "\n📋 $name"
  response=$(curl -s -X POST "$API/api/jobs/create" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  if echo "$response" | jq -e ".$expected_field == \"$expected_value\"" >/dev/null 2>&1; then
    echo "✅ PASS: Got expected $expected_field='$expected_value'"
  elif echo "$response" | jq -e ".$expected_field" >/dev/null 2>&1; then
    local actual=$(echo "$response" | jq -r ".$expected_field")
    echo "❌ FAIL: Expected $expected_field='$expected_value', got '$actual'"
  else
    echo "⚠️  UNEXPECTED: Response: $response"
  fi
}

# Test 1: Missing required fields
test_case "Missing required fields" \
  '{"tenantId":"test","mode":"demo"}' \
  "success" "false"

# Test 2: Invalid JSON
echo -e "\n📋 Invalid JSON"
curl -s -X POST "$API/api/jobs/create" \
  -H "Content-Type: application/json" \
  -d '{invalid json}' | jq -r '.error // "No error field"'

# Test 3: Wrong method (GET instead of POST)
echo -e "\n📋 Wrong HTTP method (GET)"
curl -s "$API/api/jobs/create" | jq -r '.error // "No error (might be 404)"'

# Test 4: Non-existent endpoint
echo -e "\n📋 Non-existent endpoint"
curl -s "$API/api/nonexistent" | jq -r '.error // "Response"'

# Test 5: Large payload (should handle gracefully)
echo -e "\n📋 Large payload"
large_payload=$(printf '{"tenantId":"test","mode":"demo","address":"%s","customer_name":"Test","install_date":"2026-04-20"}' "$(head -c 10000 /dev/urandom | base64 | tr -d '\n')")
curl -s -X POST "$API/api/jobs/create" \
  -H "Content-Type: application/json" \
  -d "$large_payload" | jq -r '.error // .message // "No response"'

echo -e "\n✅ Failure scenario tests completed!"