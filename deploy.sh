#!/bin/bash

# Main deployment script
# Run this script to deploy to the DigitalOcean droplet

SERVER_IP="143.198.26.114"
SERVER_USER="root"
SERVER_PASSWORD="430628ab4f56c7b995d31f46e8"

echo "🚀 Deploying audit-platform MVP to DigitalOcean..."

# Function to run commands on remote server
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files to remote server
copy_to_server() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$1" $SERVER_USER@$SERVER_IP:"$2"
}

# Step 1: Setup server
echo "📦 Setting up server..."
copy_to_server "deploy-setup.sh" "/tmp/deploy-setup.sh"
run_remote "chmod +x /tmp/deploy-setup.sh && /tmp/deploy-setup.sh"

# Step 2: Upload project files
echo "📁 Uploading project files..."

# Create a deployment package (excluding node_modules and other unnecessary files)
echo "📦 Creating deployment package..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='tsconfig.tsbuildinfo' \
    -czf audit-platform.tar.gz \
    package.json \
    package-lock.json \
    next.config.js \
    Dockerfile \
    Dockerfile.websocket \
    docker-compose.production.yml \
    nginx.docker.conf \
    prisma/ \
    src/ \
    public/ \
    ws-server.ts \
    tailwind.config.ts \
    postcss.config.js \
    tsconfig.json \
    .env.production

# Upload and extract
copy_to_server "audit-platform.tar.gz" "/tmp/audit-platform.tar.gz"
run_remote "cd /opt/audit-platform && tar -xzf /tmp/audit-platform.tar.gz && rm /tmp/audit-platform.tar.gz"

# Step 3: Deploy application
echo "🚀 Deploying application..."
run_remote "cd /opt/audit-platform && cp docker-compose.production.yml docker-compose.yml"
run_remote "cd /opt/audit-platform && docker-compose down || true"
run_remote "cd /opt/audit-platform && docker-compose build"
run_remote "cd /opt/audit-platform && docker-compose up -d"

# Step 4: Show status
echo "📊 Checking deployment status..."
sleep 10
run_remote "cd /opt/audit-platform && docker-compose ps"

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your application should be available at: http://$SERVER_IP"
echo "👤 Admin login: admin@audit.com / Admin@123"
echo ""
echo "📊 To monitor the application:"
echo "ssh root@$SERVER_IP"
echo "cd /opt/audit-platform"
echo "docker-compose logs -f"

# Clean up local files
rm audit-platform.tar.gz