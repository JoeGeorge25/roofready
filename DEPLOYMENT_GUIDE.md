# RoofReady Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Create new project

### 2. Deploy Database
```bash
# In Railway dashboard:
1. Click "New" → "Database" → "PostgreSQL"
2. Wait for provisioning
3. Copy connection string
```

### 3. Deploy Backend API
```bash
# In Railway dashboard:
1. Click "New" → "GitHub Repo"
2. Select your roofready repository
3. Set root directory to "/"
4. Add environment variables (see below)
5. Deploy
```

### 4. Deploy Frontend
```bash
# In Railway dashboard:
1. Click "New" → "Static Site"
2. Select your roofready repository
3. Set root directory to "/client"
4. Build command: "npm run build"
5. Output directory: "build"
6. Deploy
```

## Option 2: Vercel + Supabase

### 1. Set up Supabase (Database)
- Go to https://supabase.com
- Create new project
- Run SQL from `database/schema.sql`
- Copy connection details

### 2. Deploy Frontend to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd roofready/client
vercel
```

### 3. Deploy Backend to Railway/Render
- Follow Railway steps above for backend only
- Or use Render.com for backend hosting

## Environment Variables

Create `.env` file with:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Frontend API URL
REACT_APP_API_URL=https://your-backend.railway.app
```

## Quick Deploy Script

Run this for Railway deployment:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

## Domain Setup

### 1. Get Domain
- Purchase from Namecheap, Google Domains, etc.

### 2. Configure DNS
```
A record: @ → Railway IP
CNAME: www → Railway URL
```

### 3. SSL Certificate
- Automatic with Railway/Vercel
- Force HTTPS in settings

## Testing Deployment

### 1. Health Check
```bash
curl https://your-backend.railway.app/api/health
```

### 2. Database Connection
```bash
# Test with psql
psql $DATABASE_URL -c "SELECT 1"
```

### 3. Frontend Load
- Visit your domain
- Check console for errors

## Monitoring

### Railway Dashboard
- View logs
- Monitor resources
- Set up alerts

### Error Tracking
- Consider Sentry.io
- Or Railway's built-in logging

## Backup Strategy

### 1. Database Backups
- Railway: Automatic daily backups
- Supabase: Automatic backups

### 2. Code Backups
- GitHub repository
- Regular commits

## Scaling

### When to Scale
- > 100 concurrent users
- Database CPU > 70%
- Response time > 500ms

### Scaling Steps
1. Upgrade database plan
2. Add more backend instances
3. Implement caching (Redis)
4. CDN for static assets

## Cost Estimation

### Free Tier
- Railway: $5 credit/month
- Supabase: Free up to 500MB
- Vercel: Free for personal use

### Growth (10 customers)
- Railway: ~$10/month
- Supabase: Still free
- Domain: $15/year

### Scale (100 customers)
- Railway: ~$50/month
- Supabase Pro: $25/month
- Total: ~$75/month

## Support

### Common Issues
1. Database connection failed
   - Check DATABASE_URL
   - Verify network access

2. Frontend can't reach API
   - Check CORS settings
   - Verify API_URL

3. Stripe payments failing
   - Check webhook URLs
   - Verify API keys

### Getting Help
- Railway Discord
- Supabase Discord
- GitHub Issues