# AWS Lightsail Deployment Guide - Audit Platform

This guide walks you through deploying the Audit Platform to AWS Lightsail from your local CLI.

## Prerequisites

- AWS Account with credentials (Access Key ID and Secret Access Key)
- $1100 in AWS credits (you have this!)
- macOS terminal access
- Git repository access

## Cost Estimate

**Monthly Cost: ~$12-20 USD**
- Lightsail Instance (2 vCPU, 4GB RAM): $12/month
- Static IP: Free with Lightsail
- Data transfer: 3TB included, then $0.09/GB

Your $1100 credits will last **55+ months** at this rate!

---

## Step 1: Install and Configure AWS CLI

Run the installation script from your project root:

```bash
./deploy/install-aws-cli.sh
```

This will:
- Install AWS CLI v2 for macOS
- Prompt you for AWS credentials
- Configure default region

**You'll need:**
- AWS Access Key ID
- AWS Secret Access Key
- Default region (suggest: `us-east-1`)

To get your AWS credentials:
1. Log in to AWS Console
2. Go to IAM → Users → Your User → Security Credentials
3. Create Access Key → CLI access
4. Copy Access Key ID and Secret Access Key

---

## Step 2: Create Lightsail Instance

Run the provisioning script:

```bash
./deploy/provision-lightsail.sh
```

This will:
- Create Ubuntu 22.04 instance (4GB RAM, 2 vCPU, 80GB SSD)
- Configure firewall (ports 22, 80, 443, 3000, 3001)
- Allocate static IP
- Create SSH key pair
- Save connection details to `deploy/.lightsail-instance.env`

**Time: ~2 minutes**

---

## Step 3: Setup Server

Run the server setup script:

```bash
./deploy/setup-server.sh
```

This will SSH into your Lightsail instance and:
- Install Node.js 20
- Install PostgreSQL and create database
- Install PM2, tsx, Nginx
- Configure firewall
- Create application directory

**Time: ~5 minutes**

---

## Step 4: Deploy Application

Run the deployment script:

```bash
./deploy/deploy-app.sh
```

This will:
- Upload your code to the server
- Install dependencies
- Create `.env.production` file
- Build the application
- Run database migrations
- Seed initial data
- Start both servers with PM2
- Configure Nginx reverse proxy

**Time: ~8 minutes**

---

## Step 5: Access Your Application

After deployment completes, you'll see:

```
========================================
   DEPLOYMENT SUCCESSFUL!
========================================

Your application is now running at:

  Application URL: http://YOUR_STATIC_IP

Default Login Credentials:
  CFO:        cfo@example.com / cfo123
  CXO Team:   cxo@example.com / cxo123
  Audit Head: audithead@example.com / audithead123
  Auditor:    auditor@example.com / auditor123

IMPORTANT: Change these passwords after first login!

WebSocket: Connected automatically
========================================
```

---

## Updating Your Application

After making code changes locally:

```bash
./deploy/deploy-app.sh
```

This will:
- Upload latest code
- Rebuild application
- Run any new migrations
- Restart servers with zero downtime

---

## Useful Commands

### Check Application Status
```bash
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 status"
```

### View Logs
```bash
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 logs"
```

### Restart Application
```bash
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 restart all"
```

### SSH into Server
```bash
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP
```

### Database Backup
```bash
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pg_dump -U audit_user audit_platform > backup.sql"
```

---

## Troubleshooting

### Can't connect to application
```bash
# Check if servers are running
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 status"

# Check logs for errors
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 logs --lines 50"

# Restart services
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 restart all"
```

### WebSocket not connecting
```bash
# Check WebSocket server is running
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 status audit-websocket"

# Check firewall allows port 3001
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "sudo ufw status"
```

### Database connection errors
```bash
# Check PostgreSQL is running
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "sudo systemctl status postgresql"

# Test database connection
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "psql -U audit_user -d audit_platform -c 'SELECT 1;'"
```

---

## Security Best Practices

After deployment:

1. **Change default passwords** - Log in and update all seed user passwords
2. **Restrict SSH access** - Update Lightsail firewall to only allow your IP for SSH
3. **Enable HTTPS** - Use Let's Encrypt (see below)
4. **Regular updates** - Schedule weekly server updates
5. **Database backups** - Setup automated backups (script included)

### Enable HTTPS with Let's Encrypt (Optional)

If you have a domain:

```bash
# Point your domain to the Lightsail static IP in your DNS settings
# Then run:
ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP

# On the server:
sudo certbot --nginx -d yourdomain.com
```

---

## Cleanup / Destroy Resources

To delete everything and stop charges:

```bash
./deploy/destroy-lightsail.sh
```

This will:
- Stop and delete the Lightsail instance
- Release the static IP
- Delete SSH key pair
- Clean up local files

---

## Monitoring Costs

View your AWS costs:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Or check the AWS Console → Billing Dashboard

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review logs: `ssh -i deploy/.lightsail-key.pem ubuntu@YOUR_IP "pm2 logs"`
3. Check AWS Lightsail Console for instance health
4. Verify your security group/firewall settings

---

## Next Steps After MVP

When you're ready to scale:

1. **Add a domain** - Point a custom domain to your static IP
2. **Enable HTTPS** - Use Let's Encrypt for SSL
3. **Setup monitoring** - CloudWatch, Datadog, or similar
4. **Automated backups** - Database and file backups to S3
5. **Scale up** - Upgrade to larger Lightsail instance or migrate to EC2
6. **CDN** - Add CloudFront for faster global access
7. **Load balancer** - For high availability (if needed)

Your current setup is perfect for MVP and can handle 100s of concurrent users!
