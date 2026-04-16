// Fix CORS for RoofReady backend
const http = require('http');

const server = http.createServer((req, res) => {
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
  
  // Demo start endpoint
  if (req.url === '/api/demo/start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        // Generate demo session
        const demoId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const demoToken = `demo_${demoId}_${Date.now()}`;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          tenantId: demoId,
          token: demoToken,
          message: 'Demo session started',
          note: 'Frontend-only demo. Database integration pending.'
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }
  
  // Demo jobs endpoint
  if (req.url === '/api/demo/jobs' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          job: {
            id: 'demo_' + Date.now(),
            ...data.jobData,
            created_at: new Date().toISOString(),
            is_demo: true
          },
          message: 'Demo job created successfully',
          note: 'Frontend-only demo. Database integration pending.'
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }
  
  // Root endpoint
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to RoofReady SaaS API',
      endpoints: ['/api/health', '/api/test', '/api/jobs', '/api/demo/start', '/api/demo/jobs'],
      cors: 'enabled',
      frontend: 'https://roofready-seven.vercel.app',
      backend: 'https://roofready-production.up.railway.app'
    }));
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