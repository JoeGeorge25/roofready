# RoofReady Stripe Setup Guide

## 🎯 Step-by-Step Implementation

### **STEP 1: Create Stripe Account**
1. Go to [stripe.com/register](https://stripe.com/register)
2. Sign up for a free account
3. Verify your email
4. Complete business details (test mode doesn't require full verification)

### **STEP 2: Get API Keys**
1. Login to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers → API keys**
3. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### **STEP 3: Create Products & Prices**
Create these 3 products in Stripe:

#### **Product 1: RoofReady Starter**
- **Name:** RoofReady Starter
- **Description:** Small owner-operator teams
- **Pricing:** Recurring, $99/month
- **Price ID:** Note the `price_xxxxxxxxxxxxxxxxxxxxxxxx`

#### **Product 2: RoofReady Pro**
- **Name:** RoofReady Pro  
- **Description:** Growing production teams
- **Pricing:** Recurring, $199/month
- **Price ID:** Note the `price_xxxxxxxxxxxxxxxxxxxxxxxx`

#### **Product 3: RoofReady Team**
- **Name:** RoofReady Team
- **Description:** Multi-crew or multi-location roofers
- **Pricing:** Recurring, $349/month
- **Price ID:** Note the `price_xxxxxxxxxxxxxxxxxxxxxxxx`

### **STEP 4: Set Up Webhooks**
1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://roofready-fulfillment.up.railway.app/webhooks/stripe`
4. **Select events:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

### **STEP 5: Update Environment Variables**
Create/update `.env` file with:

```env
# Stripe Keys
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_TEAM=price_xxxxxxxxxxxxxxxxxxxxxxxx

# App Configuration
APP_URL=https://roofready-seven.vercel.app
SUPABASE_URL=https://wolnyokijwtrxkyluxrj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **STEP 6: Test the Setup**
```bash
# Install dependencies
npm install

# Test Stripe connection
npm run test-stripe
```

## 🚀 Deployment

### **Option A: Railway (Recommended)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init --name roofready-fulfillment

# Set environment variables
railway variables set STRIPE_SECRET_KEY=xxx
railway variables set STRIPE_WEBHOOK_SECRET=xxx
# ... set all other variables

# Deploy
railway up
```

### **Option B: Manual Deployment**
1. Install dependencies: `npm install`
2. Set environment variables
3. Start services:
   ```bash
   # Fulfillment service (webhooks)
   npm run fulfillment
   
   # Checkout API
   npm run checkout
   ```

## 🔧 Frontend Integration

Add this to your frontend HTML:

```html
<!-- Load Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>

<!-- Checkout button -->
<button id="checkout-button-starter" data-plan="starter">
  Get Started - $99/month
</button>

<script>
const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');

document.querySelectorAll('[data-plan]').forEach(button => {
  button.addEventListener('click', async () => {
    const plan = button.dataset.plan;
    
    // Call your backend to create checkout session
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: plan })
    });
    
    const { sessionId } = await response.json();
    
    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({ sessionId });
    
    if (result.error) {
      alert(result.error.message);
    }
  });
});
</script>
```

## 📋 Testing Flow

1. **Test checkout:** Use test card `4242 4242 4242 4242`
2. **Test webhooks:** Use Stripe CLI for local testing
3. **Verify fulfillment:** Check database for tenant creation
4. **Test limits:** Try to exceed plan limits

## 🛠️ Troubleshooting

### **Common Issues:**

1. **"Invalid API Key"**
   - Check STRIPE_SECRET_KEY is correct
   - Ensure no extra spaces in .env file

2. **Webhook errors**
   - Verify STRIPE_WEBHOOK_SECRET matches Stripe Dashboard
   - Check endpoint URL is accessible

3. **Price not found**
   - Verify STRIPE_PRICE_* IDs are correct
   - Check prices exist in Stripe Dashboard

4. **Database connection**
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY
   - Check network connectivity

## 📞 Support

- **Stripe Docs:** https://stripe.com/docs
- **RoofReady Issues:** GitHub repository
- **Community:** Discord/Telegram group

## ✅ Completion Checklist

- [ ] Stripe account created
- [ ] API keys obtained
- [ ] Products & prices created
- [ ] Webhook endpoint configured
- [ ] Environment variables set
- [ ] Test payment successful
- [ ] Tenant created in database
- [ ] Welcome email sent
- [ ] Frontend checkout working

---

**Next:** Deploy fulfillment service and add checkout to frontend!