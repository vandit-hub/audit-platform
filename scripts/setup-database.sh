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

# Ensure .env exists for Prisma (it reads from .env by default)
if [ ! -f .env ] || [ .env.production -nt .env ]; then
    echo -e "${YELLOW}Copying .env.production to .env for Prisma...${NC}"
    cp .env.production .env
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${YELLOW}1. Testing database connection...${NC}"

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"

    # Test connection with psql (more reliable than prisma db pull for empty databases)
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1 || {
        echo -e "${RED}Failed to connect to database!${NC}"
        echo "Please check your DATABASE_URL in .env.production"
        echo "Current DATABASE_URL: ${DATABASE_URL}"
        echo ""
        echo "Troubleshooting tips:"
        echo "1. Ensure PostgreSQL is running: sudo systemctl status postgresql"
        echo "2. Check if database exists: sudo -u postgres psql -c '\\l'"
        echo "3. Verify user/password: psql \"$DATABASE_URL\""
        echo "4. Check pg_hba.conf allows connections"
        exit 1
    }
else
    echo -e "${RED}Invalid DATABASE_URL format!${NC}"
    echo "Expected format: postgresql://user:password@host:port/database"
    echo "Current DATABASE_URL: ${DATABASE_URL}"
    exit 1
fi

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