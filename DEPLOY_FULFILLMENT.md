# Deploy RoofReady Fulfillment Service

## 🚀 Quick Deployment to Railway

### **Prerequisites:**
1. Railway account (free tier available)
2. Stripe API keys (from Step 1)
3. GitHub repository connected

### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

### **Step 2: Login to Railway**
```bash
railway login
```

### **Step 3: Create New Project**
```bash
railway init --name roofready-fulfillment
```

### **Step 4: Set Environment Variables**
```bash
# Set all required environment variables
railway variables set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
railway variables set STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxxxxxxxxxx
railway variables set STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxxxxxxxxxx
railway variables set STRIPE_PRICE_TEAM=price_xxxxxxxxxxxxxxxxxxxxxxxx
railway variables set APP_URL=https://roofready-seven.vercel.app
railway variables set SUPABASE_URL=https://wolnyokijwtrxkyluxrj.supabase.co
railway variables set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
railway variables set NODE_ENV=production
railway variables set PORT=3002
```

### **Step 5: Deploy**
```bash
railway up
```

## 🌐 Webhook Configuration

### **Get Your Railway URL:**
```bash
railway status
```
Look for: `https://roofready-fulfillment.up.railway.app`

### **Set Up Stripe Webhook:**
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://roofready-fulfillment.up.railway.app/webhooks/stripe`
4. **Select events:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret**

### **Update Railway with Webhook Secret:**
```bash
railway variables set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

## 🧪 Testing

### **Test Webhook Locally (Optional):**
```bash
# Install Stripe CLI
curl -s https://raw.githubusercontent.com/stripe/stripe-cli/master/install.sh | sh

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3002/webhooks/stripe
```

### **Test Checkout:**
1. Use test card: `4242 4242 4242 4242`
2. Any future date for expiry
3. Any 3 digits for CVC
4. Any ZIP code

## 📊 Monitoring

### **Check Logs:**
```bash
railway logs
```

### **Check Status:**
```bash
railway status
```

### **View Variables:**
```bash
railway variables
```

## 🔧 Troubleshooting

### **Common Issues:**

1. **"Webhook signature verification failed"**
   - Check STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
   - Restart service: `railway restart`

2. **"Stripe API error"**
   - Verify STRIPE_SECRET_KEY is correct
   - Check Stripe account is active

3. **"Database connection failed"**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check network connectivity

4. **"Service not starting"**
   - Check logs: `railway logs`
   - Verify PORT is set correctly

## 📁 Project Structure

```
roofready/
├── fulfillment-service.js    # Main webhook handler
├── stripe-checkout.js       # Checkout API
├── package.json            # Dependencies
├── .env                   # Environment variables
└── railway.toml          # Railway configuration
```

## 🎯 Endpoints

### **Fulfillment Service:**
- `POST /webhooks/stripe` - Stripe webhook handler

### **Checkout API:**
- `POST /api/checkout/session` - Create checkout session
- `POST /api/billing/portal` - Create billing portal session
- `GET /api/plans` - Get plan details
- `GET /api/tenant/:id/subscription` - Get subscription status
- `POST /api/subscription/change` - Upgrade/downgrade

## 🔄 Updates

### **Redeploy after changes:**
```bash
git push origin main
railway up
```

### **Update environment variables:**
```bash
railway variables set KEY=new_value
railway restart
```

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Stripe Docs:** https://stripe.com/docs
- **GitHub Issues:** https://github.com/JoeGeorge25/roofready/issues

## ✅ Deployment Checklist

- [ ] Railway CLI installed
- [ ] Logged in to Railway
- [ ] Project created
- [ ] Environment variables set
- [ ] Service deployed
- [ ] Webhook URL obtained
- [ ] Stripe webhook configured
- [ ] Test payment successful
- [ ] Database tables created
- [ ] Logs monitored

---

**Next:** Add Stripe checkout to your frontend!