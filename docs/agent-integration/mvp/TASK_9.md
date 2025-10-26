# Task 9: Deployment

**Duration:** 2-3 hours

## Overview

Deploy the AI Agent MVP to production environment.

## Prerequisites

- [ ] All previous tasks (1-8) completed
- [ ] All critical tests passed
- [ ] No console errors in development
- [ ] RBAC verified working correctly
- [ ] Environment variables configured

---

## Step 1: Pre-Deployment Checks

### Code Review Checklist

- [ ] All TypeScript errors resolved
- [ ] No console.log statements in production code (or only debug logs)
- [ ] Error handling implemented in all API routes
- [ ] RBAC functions tested with all roles
- [ ] No hardcoded API keys or secrets

### Environment Variables

Verify all required environment variables are set in production `.env`:

```bash
# Existing variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-production-domain.com

# New for agent
ANTHROPIC_API_KEY=sk-ant-your-production-key-here
```

### Build Test

Run production build locally first:

```bash
npm run build:prod
```

Expected output:
- ✓ No TypeScript errors
- ✓ No build errors
- ✓ Build completes successfully

---

## Step 2: Database Migration (if needed)

### Check for Schema Changes

```bash
# Check if any schema changes were made
npx prisma migrate status
```

If migrations are needed:

```bash
# Create migration (if schema changed)
npx prisma migrate dev --name add-agent-support

# Apply to production
npx prisma migrate deploy
```

**Note:** For this MVP, no schema changes are needed. Skip if no changes.

---

## Step 3: Deploy to Server

### Option A: PM2 Deployment (Recommended)

```bash
# 1. Stop existing processes
pm2 stop all

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Build production
npm run build:prod

# 5. Start processes
pm2 start ecosystem.config.js

# 6. Save PM2 configuration
pm2 save

# 7. Verify processes are running
pm2 status
pm2 logs
```

### Option B: Manual Deployment

```bash
# 1. Build
npm run build:prod

# 2. Start Next.js
npm run start &

# 3. Start WebSocket server
npm run ws:start &
```

---

## Step 4: Verify Deployment

### Health Checks

#### 1. Check Agent API Endpoint

```bash
# Test health endpoint
curl https://your-domain.com/api/v1/agent/chat

# Expected response:
# {"status":"ok","endpoint":"/api/v1/agent/chat","method":"POST"}
```

#### 2. Test Basic Functionality

```bash
# Login to production site
# Navigate to /agent-chat
# Send test message: "How many observations do I have?"
# Verify response appears
```

#### 3. Check Server Logs

```bash
# PM2 logs
pm2 logs --lines 100

# Look for:
# - No errors on startup
# - Agent requests being processed
# - No RBAC violations
```

#### 4. Monitor Database

```bash
# Connect to production database
psql $DATABASE_URL

# Check observation counts by user
SELECT
  u.email,
  u.role,
  COUNT(DISTINCT o.id) as observation_count
FROM "User" u
LEFT JOIN "AuditAssignment" aa ON aa."auditorId" = u.id
LEFT JOIN "Observation" o ON o."auditId" = aa."auditId"
WHERE u.role IN ('AUDITOR', 'AUDIT_HEAD')
GROUP BY u.id, u.email, u.role;
```

---

## Step 5: Production Testing

### Quick Smoke Tests

Run these tests on production:

#### Test 1: Login and Access
- [ ] Can login with test account
- [ ] Navigation shows "AI Assistant" link
- [ ] Can navigate to `/agent-chat`
- [ ] Page loads without errors

#### Test 2: Basic Question
- [ ] Ask: "How many observations do I have?"
- [ ] Response appears within 10 seconds
- [ ] Response is accurate
- [ ] No errors in browser console

#### Test 3: RBAC Verification
- [ ] Test with AUDITOR account
- [ ] Verify only sees assigned observations
- [ ] Test with CFO account
- [ ] Verify sees all observations

---

## Step 6: Monitor Initial Usage

### Set Up Monitoring

#### 1. API Usage Monitoring

Add logging to track agent usage:

```typescript
// In src/app/api/v1/agent/chat/route.ts
console.log(`[Agent] ${new Date().toISOString()} - User: ${userContext.email}, Role: ${userContext.role}, Query: "${message}"`);
```

#### 2. Cost Tracking

Monitor Anthropic API costs:

- Login to Anthropic Console
- Check usage dashboard
- Set up billing alerts (recommended: $50 threshold)

#### 3. Error Tracking

Monitor server logs for errors:

```bash
# Watch logs in real-time
pm2 logs --lines 50 --raw | grep -i error

# Or use PM2 monitoring
pm2 monit
```

---

## Step 7: Rollback Plan

If critical issues are found in production:

### Quick Rollback Steps

```bash
# 1. Stop current processes
pm2 stop all

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild
npm install
npm run build:prod

# 4. Restart
pm2 start ecosystem.config.js
pm2 save

# 5. Verify rollback successful
curl https://your-domain.com/api/health
```

### Disable Agent Feature Only

If you want to keep other features but disable agent:

**Option 1: Remove navigation link**
```typescript
// In src/components/NavBar.tsx
// Comment out or remove the AI Assistant link
{/* Temporarily disabled
<Link href="/agent-chat" ...>AI Assistant</Link>
*/}
```

**Option 2: Add feature flag**
```typescript
// In .env
ENABLE_AI_AGENT=false

// In page.tsx
if (process.env.ENABLE_AI_AGENT !== 'true') {
  return <div>Feature temporarily unavailable</div>
}
```

---

## Step 8: Documentation

### Update Deployment Docs

Add agent deployment info to existing docs:

**File:** `DEPLOYMENT.md` (if exists)

```markdown
## AI Agent Feature

The AI Agent requires:
- ANTHROPIC_API_KEY environment variable
- Claude Agent SDK npm package
- Both Next.js and WebSocket servers running

### Cost Monitoring
- Estimated cost: ~$0.008 per query
- Set up billing alerts in Anthropic Console
- Monitor usage at https://console.anthropic.com
```

---

## Step 9: User Communication

### Announce Feature (Optional)

If announcing to users:

**Email Template:**

```
Subject: New Feature: AI Assistant for Audit Observations

Hello,

We've launched a new AI Assistant to help you quickly find and analyze your audit observations.

Key Features:
- Ask questions in natural language
- Get instant counts and statistics
- Filter by status, risk, or audit
- Respects your role and permissions

How to Use:
1. Login to the audit platform
2. Click "AI Assistant" in the navigation
3. Ask questions like "How many draft observations do I have?"

Questions or feedback? Contact [support email]

Best regards,
[Team]
```

---

## Step 10: Post-Deployment Monitoring

### First 24 Hours

Monitor these metrics:

- [ ] Number of users who tried the agent
- [ ] Number of queries sent
- [ ] Average response time
- [ ] Error rate
- [ ] Total cost (check Anthropic dashboard)

### First Week

- [ ] Collect user feedback
- [ ] Identify most common questions
- [ ] Note any questions the agent struggles with
- [ ] Check for RBAC violations (should be zero)
- [ ] Review total costs

---

## Troubleshooting Production Issues

### Issue: Agent not responding

**Check:**
1. Is ANTHROPIC_API_KEY set correctly?
   ```bash
   echo $ANTHROPIC_API_KEY
   ```

2. Is the API endpoint accessible?
   ```bash
   curl https://your-domain.com/api/v1/agent/chat
   ```

3. Check server logs:
   ```bash
   pm2 logs | grep agent
   ```

### Issue: RBAC violations

**Check:**
1. Verify userId and role are passed correctly
2. Check database for AuditAssignment records
3. Review RBAC query logs
4. Test locally with same user

### Issue: High costs

**Actions:**
1. Check usage in Anthropic Console
2. Verify rate limiting (if implemented)
3. Review query patterns
4. Consider reducing context size

### Issue: Slow responses

**Check:**
1. Database query performance
2. Network latency to Anthropic API
3. Server load (CPU, memory)
4. Consider caching frequently requested data

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passed
- [ ] Build succeeds locally
- [ ] Environment variables configured
- [ ] Rollback plan documented

### Deployment
- [ ] Code deployed to server
- [ ] Dependencies installed
- [ ] Production build completed
- [ ] Processes started and verified

### Post-Deployment
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

### First 24 Hours
- [ ] Monitor errors
- [ ] Monitor costs
- [ ] Check user adoption
- [ ] Collect initial feedback

---

## Success Criteria

MVP deployment is successful if:

✅ Agent responds to questions
✅ RBAC enforcement works (no violations)
✅ Response time < 10 seconds
✅ Error rate < 5%
✅ Cost within budget ($50/month target)
✅ No critical bugs reported
✅ At least 30% of users try the feature

---

## Next Steps After Deployment

### Immediate (Week 1)
- Monitor usage and costs daily
- Collect user feedback
- Fix any critical bugs
- Document common questions

### Short-term (Weeks 2-4)
- Analyze usage patterns
- Identify most requested features
- Plan enhancements (streaming, search, etc.)
- Optimize costs if needed

### Long-term (Month 2+)
- Decide on Phase 2 features
- Consider adding conversation history
- Add more tools (audit queries, reports)
- Improve agent prompts based on learnings

---

## Completion

Once deployment is verified successful:

- [ ] Mark all tasks (1-9) as complete
- [ ] Document any issues encountered
- [ ] Share metrics with team
- [ ] Plan retrospective meeting
- [ ] Celebrate the successful MVP launch! 🎉

**MVP is now live!**
