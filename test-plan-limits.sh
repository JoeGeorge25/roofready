#!/bin/bash
echo "Testing RoofReady Plan Limits..."
echo "================================="

# Test 1: Create first demo job
echo -e "\n1. Creating first demo job..."
curl -X POST "https://roofready-production.up.railway.app/api/jobs/create" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo_qa_test",
    "mode": "demo",
    "address": "QA Test 1",
    "customer_name": "Test 1",
    "install_date": "2026-04-20",
    "crew_assignment": "Crew A"
  }' 2>/dev/null | jq -r '.message + " | Usage: " + (.usage.activeJobs|tostring) + "/" + (.plan.activeJobsLimit|tostring)'

# Test 2: Try to exceed demo limit (should still work since demo ignores limits)
echo -e "\n2. Creating 6th demo job (demo ignores limits)..."
for i in {2..6}; do
  curl -X POST "https://roofready-production.up.railway.app/api/jobs/create" \
    -H "Content-Type: application/json" \
    -d "{
      \"tenantId\": \"demo_qa_test_$i\",
      \"mode\": \"demo\",
      \"address\": \"QA Test $i\",
      \"customer_name\": \"Test $i\",
      \"install_date\": \"2026-04-2$i\",
      \"crew_assignment\": \"Crew $i\"
    }" 2>/dev/null | jq -r '"Job '$i': " + .message' &
done
wait

# Test 3: Test error handling
echo -e "\n3. Testing error handling..."
echo "   a) Missing required field:"
curl -X POST "https://roofready-production.up.railway.app/api/jobs/create" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo_test",
    "mode": "demo"
    // Missing address, customer_name, install_date
  }' 2>/dev/null | jq -r '.error // "No error (unexpected)"'

echo -e "\n   b) Invalid tenant (should work for demo):"
curl -X POST "https://roofready-production.up.railway.app/api/jobs/create" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "invalid_tenant_123",
    "mode": "demo",
    "address": "Test",
    "customer_name": "Test",
    "install_date": "2026-04-20"
  }' 2>/dev/null | jq -r '.message // .error'

echo -e "\n✅ Plan limit tests completed!"