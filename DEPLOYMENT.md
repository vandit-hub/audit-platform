# Deployment Guide - Audit Platform on Google VM

## Prerequisites

- Google Cloud VM with Ubuntu 22.04 LTS
- At least 2 vCPUs and 4GB RAM
- Node.js 20+ installed
- PostgreSQL 15+ installed
- PM2 installed globally (`npm install -g pm2`)
- Git installed

## Quick Start Deployment

### 1. VM Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install tsx globally (for TypeScript execution)
sudo npm install -g tsx

# Create application directory
sudo mkdir -p /home/ubuntu/audit-platform
sudo chown ubuntu:ubuntu /home/ubuntu/audit-platform
```

### 2. PostgreSQL Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE audit_platform;
CREATE USER audit_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE audit_platform TO audit_user;
\q

# Enable PostgreSQL to accept connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo systemctl restart postgresql
```

### 3. Clone and Configure Application

```bash
cd /home/ubuntu
git clone YOUR_REPO_URL audit-platform
cd audit-platform

# Install dependencies
npm install

# Copy and configure environment
cp .env.production.template .env.production
nano .env.production  # Edit with your actual values:
           # - DATABASE_URL with your PostgreSQL credentials
           # - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
           # - Update YOUR_VM_IP with actual IP
           # - Configure S3 credentials if using file uploads

# Build the application
npm run build

# Setup database
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

### 4. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and application ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Next.js app
sudo ufw allow 3001/tcp  # WebSocket server
sudo ufw --force enable
```

### 5. Start with PM2

```bash
# Start both applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Follow the command it outputs

# Check status
pm2 status
pm2 logs
```

### Alternative: Systemd Services

If you prefer systemd over PM2:

```bash
# Copy service files
sudo cp deploy/audit-platform.service /etc/systemd/system/
sudo cp deploy/audit-websocket.service /etc/systemd/system/

# Create log directory
sudo mkdir -p /var/log/audit-platform
sudo chown ubuntu:ubuntu /var/log/audit-platform

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable audit-platform audit-websocket
sudo systemctl start audit-platform audit-websocket

# Check status
sudo systemctl status audit-platform
sudo systemctl status audit-websocket
```

## Nginx Setup (Recommended)

Install Nginx as reverse proxy:

```bash
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/audit-platform
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket server
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/audit-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoring & Maintenance

### View Logs

**PM2:**
```bash
pm2 logs audit-platform
pm2 logs audit-websocket
pm2 monit  # Real-time monitoring
```

**Systemd:**
```bash
sudo journalctl -u audit-platform -f
sudo journalctl -u audit-websocket -f
```

### Update Deployment

```bash
cd /home/ubuntu/audit-platform
git pull origin main
npm install
npm run build
npx prisma migrate deploy

# Restart services
pm2 restart all
# OR for systemd:
sudo systemctl restart audit-platform audit-websocket
```

### Backup Database

```bash
# Create backup
pg_dump -U audit_user -h localhost audit_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U audit_user -h localhost audit_platform < backup_20240101_120000.sql
```

## Troubleshooting

### Application won't start
- Check logs: `pm2 logs` or `journalctl -u audit-platform`
- Verify .env file exists and is configured correctly
- Ensure database is accessible: `psql -U audit_user -h localhost -d audit_platform`

### WebSocket connection fails
- Ensure port 3001 is open in firewall
- Check WebSocket logs: `pm2 logs audit-websocket`
- Verify NEXT_PUBLIC_WEBSOCKET_URL in .env matches your VM IP

### Database connection errors
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify DATABASE_URL in .env
- Test connection: `npx prisma db pull`

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Generate strong NEXTAUTH_SECRET
- [ ] Configure SSL/HTTPS with Let's Encrypt
- [ ] Set up regular database backups
- [ ] Configure fail2ban for SSH protection
- [ ] Keep system and dependencies updated
- [ ] Review and restrict firewall rules
- [ ] Enable Google Cloud firewall rules

## Performance Optimization

1. **Enable Node.js production mode:**
   - Ensure NODE_ENV=production in .env

2. **Configure PM2 cluster mode (if needed):**
   - Edit ecosystem.config.js: `instances: 'max'`

3. **Add swap space (for low memory VMs):**
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Support

For issues or questions:
1. Check application logs first
2. Review this deployment guide
3. Check the main README.md
4. Open an issue in the repository