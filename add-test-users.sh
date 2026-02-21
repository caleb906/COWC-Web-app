#!/bin/bash

# Add Test Users to Airtable
# Run this once to create test login accounts

API_KEY="${VITE_AIRTABLE_API_KEY}"
BASE_ID="${VITE_AIRTABLE_BASE_ID}"

echo "Adding test users to Airtable..."
echo ""

# Admin User
echo "Creating Admin user..."
curl -X POST "https://api.airtable.com/v0/${BASE_ID}/Users" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "fields": {
      "Full Name": "Amanda Hoffmann",
      "Email": "amanda@cowc.com",
      "Role": "admin",
      "Status": "Active"
    }
  }'
echo ""

# Coordinator User
echo "Creating Coordinator user..."
curl -X POST "https://api.airtable.com/v0/${BASE_ID}/Users" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "fields": {
      "Full Name": "Sarah Johnson",
      "Email": "coordinator@cowc.com",
      "Role": "coordinator",
      "Status": "Active"
    }
  }'
echo ""

# Couple User
echo "Creating Couple user..."
curl -X POST "https://api.airtable.com/v0/${BASE_ID}/Users" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "fields": {
      "Full Name": "Jessica Miller",
      "Email": "couple@cowc.com",
      "Role": "couple",
      "Status": "Active"
    }
  }'
echo ""

echo "✅ Test users created!"
echo ""
echo "Login credentials:"
echo "  Admin:       amanda@cowc.com / admin123"
echo "  Coordinator: coordinator@cowc.com / coord123"
echo "  Couple:      couple@cowc.com / couple123"
