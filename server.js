// Fix CORS for RoofReady backend
const http = require('http');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper: read the full request body as a Buffer
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'RoofReady SaaS',
      version: '1.0.0',
      environment: 'production',
      cors: 'enabled',
      frontend: 'https://roofready-seven.vercel.app',
      timestamp: new Date().toISOString(),
      message: '✅ RoofReady API with CORS enabled!'
    }));
    return;
  }
  
  // Test endpoint
  if (req.url === '/api/test' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'RoofReady API is working with CORS!',
      cors: 'enabled',
      allowedOrigins: '*'
    }));
    return;
  }
  
  // Jobs endpoint
  if (req.url === '/api/jobs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      { id: '1', address: '123 Main St', customerName: 'John Smith', status: 'ready', installDate: '2024-04-15' },
      { id: '2', address: '456 Oak Ave', customerName: 'Sarah Johnson', status: 'at-risk', installDate: '2024-04-16' },
      { id: '3', address: '789 Pine Rd', customerName: 'Mike Wilson', status: 'blocked', installDate: '2024-04-17' },
      { id: '4', address: '321 Elm Blvd', customerName: 'Lisa Brown', status: 'completed', installDate: '2024-04-14' }
    ]));
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to RoofReady SaaS API',
      endpoints: ['/api/health', '/api/test', '/api/jobs', '/api/checkout/session', '/webhooks/stripe'],
      cors: 'enabled',
      frontend: 'https://roofready-seven.vercel.app',
      backend: 'https://roofready-production.up.railway.app'
    }));
    return;
  }
  
  // POST /api/checkout/session — create a Stripe checkout session
  if (req.url === '/api/checkout/session' && req.method === 'POST') {
    try {
      const rawBody = await readBody(req);
      const { priceId } = JSON.parse(rawBody.toString());

      if (!priceId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'priceId is required' }));
        return;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL || 'https://roofready-seven.vercel.app'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'https://roofready-seven.vercel.app'}/pricing`,
      });

      console.log(`✅ Checkout session created: ${session.id}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId: session.id, url: session.url }));
    } catch (err) {
      console.error('❌ Error creating checkout session:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create checkout session', details: err.message }));
    }
    return;
  }

  // POST /webhooks/stripe — handle Stripe webhook events
  if (req.url === '/webhooks/stripe' && req.method === 'POST') {
    try {
      const rawBody = await readBody(req);
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }));
        return;
      }

      console.log(`📦 Stripe webhook received: ${event.type} [${event.id}]`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          console.log(`✅ Checkout session completed: ${session.id} — customer: ${session.customer}`);
          // TODO: provision subscription, update database, send confirmation email
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          console.log(`✅ Payment succeeded: ${paymentIntent.id} — amount: ${paymentIntent.amount_received}`);
          // TODO: fulfil order, update payment record
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          const failureMessage = paymentIntent.last_payment_error?.message || 'unknown reason';
          console.warn(`⚠️  Payment failed: ${paymentIntent.id} — reason: ${failureMessage}`);
          // TODO: notify customer, retry logic
          break;
        }
        default:
          console.log(`ℹ️  Unhandled webhook event type: ${event.type}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      console.error('❌ Webhook handler error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook handler error', details: err.message }));
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', cors: 'enabled' }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RoofReady API with CORS on port ${PORT}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`🌐 Frontend: https://roofready-seven.vercel.app`);
});