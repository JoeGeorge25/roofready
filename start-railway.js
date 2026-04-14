// Railway start script - guaranteed public access
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'RoofReady SaaS',
      version: '1.0.0',
      environment: 'production',
      public: true,
      timestamp: new Date().toISOString(),
      message: '✅ RoofReady API is publicly accessible!'
    }));
    return;
  }
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to RoofReady SaaS API',
      endpoints: ['/api/health'],
      public: true,
      ready: true
    }));
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', public: true }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RoofReady PUBLIC API on port ${PORT}`);
  console.log(`✅ Public URL should be available`);
  console.log(`📡 Listening on 0.0.0.0 (all interfaces)`);
});