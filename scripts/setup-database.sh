#!/bin/bash

# Database Setup Script for Audit Platform
# Run this after setting up PostgreSQL on your VM

set -e

echo "=== Audit Platform Database Setup ==="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production from .env.production.template first."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${YELLOW}1. Testing database connection...${NC}"
npx prisma db pull --schema=./prisma/schema.prisma > /dev/null 2>&1 || {
    echo -e "${RED}Failed to connect to database!${NC}"
    echo "Please check your DATABASE_URL in .env.production"
    echo "Current DATABASE_URL: ${DATABASE_URL}"
    exit 1
}
echo -e "${GREEN}✓ Database connection successful${NC}"

echo ""
echo -e "${YELLOW}2. Running Prisma migrations...${NC}"
npx prisma migrate deploy

echo ""
echo -e "${YELLOW}3. Generating Prisma client...${NC}"
npx prisma generate

echo ""
echo -e "${YELLOW}4. Seeding database with initial admin user...${NC}"
npx prisma db seed

echo ""
echo -e "${GREEN}=== Database setup complete! ===${NC}"
echo ""
echo "Admin credentials (from .env.production):"
echo "Email: ${ADMIN_EMAIL}"
echo "Password: ${ADMIN_PASSWORD}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the admin password after first login!${NC}"