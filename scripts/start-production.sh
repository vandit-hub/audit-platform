#!/bin/bash

# Quick start script for production services

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting Audit Platform services...${NC}"

# Check if .env.production exists, create if needed
if [ ! -f .env.production ]; then
    if [ -f .env.production.template ]; then
        echo -e "${YELLOW}Creating .env.production from template...${NC}"
        cp .env.production.template .env.production
        echo -e "${RED}Please edit .env.production with your actual values and run again${NC}"
        exit 1
    else
        echo -e "${RED}Error: No .env.production.template found${NC}"
        exit 1
    fi
fi

# Ensure .env exists for the application
if [ ! -f .env ]; then
    cp .env.production .env
fi

# Check if build exists
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}No build found. Building application...${NC}"
    npm run build
fi

# Start with PM2 if available
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting with PM2...${NC}"
    pm2 start ecosystem.config.js --env production
    pm2 save
    echo -e "${GREEN}✓ Services started with PM2${NC}"
    pm2 status
else
    echo -e "${YELLOW}PM2 not found. Starting with npm...${NC}"
    echo -e "${YELLOW}Starting Next.js app on port 3000...${NC}"
    npm start &
    APP_PID=$!
    echo "Next.js PID: $APP_PID"

    echo -e "${YELLOW}Starting WebSocket server on port 3001...${NC}"
    npm run ws:start &
    WS_PID=$!
    echo "WebSocket PID: $WS_PID"

    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
    echo "To stop services:"
    echo "  kill $APP_PID $WS_PID"
    echo ""
    echo "Consider installing PM2 for better process management:"
    echo "  npm install -g pm2"

    # Keep script running
    wait
fi