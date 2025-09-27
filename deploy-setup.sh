#!/bin/bash

# Deployment setup script for audit-platform MVP
# This script sets up Docker, uploads files, and deploys the application

echo "🚀 Setting up audit-platform MVP deployment..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get install -y curl git unzip

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/audit-platform
cd /opt/audit-platform

# Create uploads directory
mkdir -p uploads

# Set proper permissions
chown -R root:root /opt/audit-platform

echo "✅ Server setup completed!"
echo "Next steps:"
echo "1. Upload your project files to /opt/audit-platform/"
echo "2. Update environment variables in docker-compose.yml"
echo "3. Run: docker-compose up -d"