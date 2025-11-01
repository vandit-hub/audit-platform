# AWS Lightsail Deployment - Steps Completed

## Server Information
- **Instance Name**: audit-platform
- **Static IP**: 54.163.174.152
- **Region**: us-east-1
- **Instance Type**: medium_3_0 (4GB RAM, 2 vCPU, 80GB SSD)
- **OS**: Ubuntu 22.04
- **SSH Key**: lightsail-key.pem (saved in project root)

## What We've Completed

### 1. AWS CLI Configuration
```bash
# Verified AWS CLI installation
aws --version
# Output: aws-cli/2.31.27

# Configured AWS credentials
aws configure
# Entered: Access Key ID, Secret Access Key, Region (us-east-1)

# Verified credentials
aws sts get-caller-identity
# Output: Account ID: 406385271414
```

### 2. Created Lightsail Instance
```bash
# Created Ubuntu 22.04 instance
aws lightsail create-instances \
  --instance-names audit-platform \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id medium_3_0 \
  --tags key=Project,value=AuditPlatform

# Verified instance is running
aws lightsail get-instance --instance-name audit-platform --query 'instance.state.name' --output text
# Output: running
```

### 3. Configured Firewall Ports
```bash
# Opened HTTP port 80
aws lightsail open-instance-public-ports \
  --instance-name audit-platform \
  --port-info fromPort=80,toPort=80,protocol=TCP

# Opened HTTPS port 443
aws lightsail open-instance-public-ports \
  --instance-name audit-platform \
  --port-info fromPort=443,toPort=443,protocol=TCP

# Opened Next.js app port 3000
aws lightsail open-instance-public-ports \
  --instance-name audit-platform \
  --port-info fromPort=3000,toPort=3000,protocol=TCP

# Opened WebSocket port 3001
aws lightsail open-instance-public-ports \
  --instance-name audit-platform \
  --port-info fromPort=3001,toPort=3001,protocol=TCP
```

### 4. Allocated Static IP
```bash
# Created static IP
aws lightsail allocate-static-ip --static-ip-name audit-platform-ip

# Attached static IP to instance
aws lightsail attach-static-ip --static-ip-name audit-platform-ip --instance-name audit-platform

# Retrieved static IP address
aws lightsail get-static-ip --static-ip-name audit-platform-ip --query 'staticIp.ipAddress' --output text
# Output: 54.163.174.152
```

### 5. Downloaded SSH Key
```bash
# Downloaded default SSH key
aws lightsail download-default-key-pair --region us-east-1 --query 'privateKeyBase64' --output text > lightsail-key.pem

# Set correct permissions
chmod 400 lightsail-key.pem

# Tested SSH connection
ssh -i lightsail-key.pem -o StrictHostKeyChecking=no ubuntu@54.163.174.152 'echo "Connected successfully!"'
# Output: Connected successfully!
```

### 6. Updated System and Installed Node.js 20
```bash
# Updated system packages
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo apt update && sudo apt upgrade -y'

# Added Node.js 20 repository
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -'

# Installed Node.js
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo apt install -y nodejs'

# Verified installation
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'node --version && npm --version'
# Output: v20.19.5, 10.8.2
```

### 7. Installed PostgreSQL
```bash
# Installed PostgreSQL 14
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo apt install -y postgresql postgresql-contrib'

# Created database
ssh -i lightsail-key.pem ubuntu@54.163.174.152 "sudo -u postgres psql -c \"CREATE DATABASE audit_platform;\""

# Created user with password
ssh -i lightsail-key.pem ubuntu@54.163.174.152 "sudo -u postgres psql -c \"CREATE USER audit_user WITH ENCRYPTED PASSWORD 'audit_secure_pass_2024';\""

# Granted privileges
ssh -i lightsail-key.pem ubuntu@54.163.174.152 "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE audit_platform TO audit_user;\""

# Granted schema privileges
ssh -i lightsail-key.pem ubuntu@54.163.174.152 "sudo -u postgres psql -d audit_platform -c \"GRANT ALL ON SCHEMA public TO audit_user;\""
```

### 8. Installed PM2 and tsx
```bash
# Installed PM2 and tsx globally
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo npm install -g pm2 tsx'
```

### 9. Cloned Application Code
```bash
# Created app directory
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'mkdir -p ~/audit-platform'

# Cloned from GitHub
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~ && git clone https://github.com/vandit-hub/audit-platform.git'

# Switched to feature/ai-sdk branch
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && git checkout feature/ai-sdk'

# Pulled latest changes
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && git pull origin feature/ai-sdk'

# Installed dependencies
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && npm install'
```

### 10. Environment Configuration (Attempted)
**Note**: SSH connection became unresponsive during .env.production creation. Need to restart instance.

The .env.production file should contain:
```env
# --- Core ---
DATABASE_URL="postgresql://audit_user:audit_secure_pass_2024@localhost:5432/audit_platform"
NEXTAUTH_SECRET="15f5a6a3b8cc051164adcdf52851a5c3f7285309c2d71110eb0fbb90c4c57f36"
NEXTAUTH_URL="http://54.163.174.152"
AUTH_TRUST_HOST=true

# Session timeouts
IDLE_TIMEOUT_MINUTES="30"
ABSOLUTE_SESSION_HOURS="24"

# Node Environment
NODE_ENV=production

# --- RBAC v2 Seed Users ---

# CFO - Organization-level superuser with full access
CFO_EMAIL="cfo@example.com"
CFO_PASSWORD="cfo123"
CFO_NAME="Chief Financial Officer"

# CXO Team - Manages plants, audits, and assignments
CXO_EMAIL="cxo@example.com"
CXO_PASSWORD="cxo123"
CXO_NAME="CXO Team Member"

CXO2_EMAIL="cxo2@example.com"
CXO2_PASSWORD="cxo123"
CXO2_NAME="CXO Team Member 2"

# Audit Head - Approves/rejects observations and leads audits
AUDIT_HEAD_EMAIL="audithead@example.com"
AUDIT_HEAD_PASSWORD="audithead123"
AUDIT_HEAD_NAME="Audit Head"

# Auditors - Create and edit draft observations
AUDITOR_EMAIL="auditor@example.com"
AUDITOR_PASSWORD="auditor123"
AUDITOR_NAME="Auditor 1"

AUDITOR2_EMAIL="auditor2@example.com"
AUDITOR2_PASSWORD="auditor123"
AUDITOR2_NAME="Auditor 2"

AUDITOR3_EMAIL="auditor3@example.com"
AUDITOR3_PASSWORD="auditor123"
AUDITOR3_NAME="Auditor 3"

# Auditees - Respond to assigned observations
AUDITEE_EMAIL="auditee@example.com"
AUDITEE_PASSWORD="auditee123"
AUDITEE_NAME="Auditee 1"

AUDITEE2_EMAIL="auditee2@example.com"
AUDITEE2_PASSWORD="auditee123"
AUDITEE2_NAME="Auditee 2"

# Guest - Read-only access with scope restrictions
GUEST_EMAIL="guest@example.com"
GUEST_PASSWORD="guest123"
GUEST_NAME="Default Guest"

# --- WebSocket Configuration ---
WEBSOCKET_PORT="3001"
NEXT_PUBLIC_WEBSOCKET_URL="ws://54.163.174.152:3001"

# --- AI SDK Configuration ---
CEREBRAS_API_KEY=csk-t6chpykrepcwh9pv339fddwt2hm56njtvjjftd38t2vryyj3

# Logging configuration
LOG_LEVEL="info"
```

## Next Steps (After Restart)

1. **Restart Lightsail Instance**
```bash
aws lightsail reboot-instance --instance-name audit-platform
```

2. **Wait for instance to come back online** (30-60 seconds)

3. **Create .env.production file** (use simpler method)
```bash
# Copy from local and upload
scp -i lightsail-key.pem .env.production ubuntu@54.163.174.152:~/audit-platform/
```

4. **Build the application**
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && npm run build'
```

5. **Run database migrations**
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && npx prisma migrate deploy'
```

6. **Seed the database**
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && npm run db:seed'
```

7. **Start the application with PM2**
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && pm2 start ecosystem.config.js'
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'pm2 save'
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'pm2 startup systemd'
```

8. **Access the application**
- URL: http://54.163.174.152
- Login with CFO credentials: cfo@example.com / cfo123

## Useful Commands

### Check Application Status
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'pm2 status'
```

### View Logs
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'pm2 logs'
```

### Restart Application
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'pm2 restart all'
```

### Update Application
```bash
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'cd ~/audit-platform && git pull && npm install && npm run build && pm2 restart all'
```

### Check Instance Status
```bash
aws lightsail get-instance-state --instance-name audit-platform
```

### Stop Instance (to save costs when not in use)
```bash
aws lightsail stop-instance --instance-name audit-platform
```

### Start Instance
```bash
aws lightsail start-instance --instance-name audit-platform
```

### Delete Everything (cleanup)
```bash
# Stop instance
aws lightsail stop-instance --instance-name audit-platform

# Delete instance
aws lightsail delete-instance --instance-name audit-platform

# Release static IP
aws lightsail release-static-ip --static-ip-name audit-platform-ip
```

## Cost Information
- **Monthly Cost**: ~$12 USD for medium_3_0 instance
- **Your Credits**: $1100
- **Duration**: 90+ months of free hosting!

## Troubleshooting

### SSH Connection Issues
If SSH hangs or times out:
1. Restart the instance: `aws lightsail reboot-instance --instance-name audit-platform`
2. Wait 30-60 seconds
3. Try connecting again

### Database Connection Issues
```bash
# Check PostgreSQL status
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo systemctl status postgresql'

# Restart PostgreSQL
ssh -i lightsail-key.pem ubuntu@54.163.174.152 'sudo systemctl restart postgresql'
```

### Port Issues
```bash
# Check open ports
aws lightsail get-instance-port-states --instance-name audit-platform
```
