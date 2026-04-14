// Test Stripe Setup for RoofReady
const stripe = require('stripe');
require('dotenv').config();

async function testStripeSetup() {
  console.log('🔧 Testing Stripe Setup for RoofReady');
  console.log('=====================================\n');
  
  // Check environment variables
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_PRICE_STARTER',
    'STRIPE_PRICE_PRO',
    'STRIPE_PRICE_TEAM'
  ];
  
  console.log('📋 Checking environment variables...');
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.log(`❌ Missing: ${varName}`);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName].substring(0, 20)}...`);
    }
  }
  
  // Initialize Stripe
  const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
  
  try {
    console.log('\n🔑 Testing Stripe API connection...');
    
    // Test 1: List products
    const products = await stripeClient.products.list({ limit: 10 });
    console.log(`✅ Connected to Stripe. Found ${products.data.length} products.`);
    
    // Test 2: Verify our prices exist
    console.log('\n💰 Verifying price IDs...');
    const priceIds = [
      process.env.STRIPE_PRICE_STARTER,
      process.env.STRIPE_PRICE_PRO,
      process.env.STRIPE_PRICE_TEAM
    ];
    
    for (const priceId of priceIds) {
      try {
        const price = await stripeClient.prices.retrieve(priceId);
        console.log(`✅ Price ${priceId.substring(0, 20)}...: $${price.unit_amount / 100}/${price.recurring.interval}`);
      } catch (error) {
        console.log(`❌ Price ${priceId.substring(0, 20)}...: ${error.message}`);
      }
    }
    
    // Test 3: Create a test checkout session
    console.log('\n🛒 Testing checkout session creation...');
    try {
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_STARTER,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://roofready-seven.vercel.app/success',
        cancel_url: 'https://roofready-seven.vercel.app/pricing',
      });
      
      console.log(`✅ Checkout session created: ${session.id}`);
      console.log(`   URL: ${session.url}`);
    } catch (error) {
      console.log(`❌ Checkout session failed: ${error.message}`);
    }
    
    // Test 4: Create a test customer
    console.log('\n👤 Testing customer creation...');
    try {
      const customer = await stripeClient.customers.create({
        email: 'test@roofready.com',
        name: 'Test Roofing Company',
        metadata: {
          test: 'true',
          app: 'roofready'
        }
      });
      
      console.log(`✅ Test customer created: ${customer.id}`);
      console.log(`   Email: ${customer.email}`);
      
      // Clean up test customer
      await stripeClient.customers.del(customer.id);
      console.log(`   Test customer cleaned up.`);
    } catch (error) {
      console.log(`❌ Customer creation failed: ${error.message}`);
    }
    
    console.log('\n🎉 Stripe Setup Test Complete!');
    console.log('=============================');
    console.log('\nNext steps:');
    console.log('1. Add Stripe checkout button to your frontend');
    console.log('2. Deploy fulfillment service to Railway');
    console.log('3. Test complete payment flow');
    console.log('\nFor frontend integration, use:');
    console.log(`STRIPE_PUBLISHABLE_KEY: ${process.env.STRIPE_PUBLISHABLE_KEY}`);
    
  } catch (error) {
    console.log(`❌ Stripe API error: ${error.message}`);
    console.log('\nTroubleshooting:');
    console.log('1. Check your STRIPE_SECRET_KEY is correct');
    console.log('2. Make sure you have internet connection');
    console.log('3. Verify Stripe account is active');
  }
}

// Run the test
testStripeSetup().catch(console.error);