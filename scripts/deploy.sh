#!/bin/bash

# Audit Platform Deployment Script
# This script automates the deployment process on Google VM

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   Audit Platform Deployment${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

if ! command_exists psql; then
    echo -e "${RED}Error: PostgreSQL client is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js version 20 or higher is required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Check environment file
if [ ! -f .env.production ]; then
    if [ -f .env.production.template ]; then
        echo -e "${YELLOW}Copying .env.production.template to .env.production...${NC}"
        cp .env.production.template .env.production
        echo -e "${YELLOW}⚠️  Please edit .env.production file with your actual values${NC}"
        echo "Press Enter to continue after editing .env.production file..."
        read
    else
        echo -e "${RED}Error: No .env.production file found${NC}"
        echo "Please create .env.production from .env.production.template"
        exit 1
    fi
fi

# Ensure .env exists for the application
if [ ! -f .env ]; then
    cp .env.production .env
fi

# Pull latest changes (optional)
if [ "$1" == "--pull" ]; then
    echo -e "${YELLOW}Pulling latest changes from git...${NC}"
    git pull origin main
    echo -e "${GREEN}✓ Git pull complete${NC}"
    echo ""
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build application
echo -e "${YELLOW}Building application...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Database setup
echo -e "${YELLOW}Setting up database...${NC}"
npx prisma generate
npx prisma migrate deploy

# Ask about seeding
echo -e "${YELLOW}Do you want to seed the database? (y/N)${NC}"
read -r SEED_CONFIRM
if [[ "$SEED_CONFIRM" == "y" || "$SEED_CONFIRM" == "Y" ]]; then
    npx prisma db seed
    echo -e "${GREEN}✓ Database seeded${NC}"
else
    echo "Skipping database seed"
fi
echo ""

# Create logs directory
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}Creating logs directory...${NC}"
    mkdir -p logs
    echo -e "${GREEN}✓ Logs directory created${NC}"
fi

# PM2 deployment
if command_exists pm2; then
    echo -e "${YELLOW}Starting services with PM2...${NC}"

    # Stop existing processes
    pm2 stop all 2>/dev/null || true

    # Start new processes
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    echo -e "${GREEN}✓ Services started with PM2${NC}"
    echo ""
    echo -e "${BLUE}Check service status with: pm2 status${NC}"
    echo -e "${BLUE}View logs with: pm2 logs${NC}"
else
    echo -e "${YELLOW}PM2 not found. Install with: npm install -g pm2${NC}"
    echo -e "${YELLOW}Alternatively, use systemd services:${NC}"
    echo "  sudo cp deploy/*.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable audit-platform audit-websocket"
    echo "  sudo systemctl start audit-platform audit-websocket"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}Application URLs:${NC}"
echo "  Main app: http://$(hostname -I | awk '{print $1}'):3000"
echo "  WebSocket: ws://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure Nginx reverse proxy (see DEPLOYMENT.md)"
echo "2. Setup SSL with Let's Encrypt"
echo "3. Configure firewall rules"
echo "4. Change admin password after first login"
echo ""