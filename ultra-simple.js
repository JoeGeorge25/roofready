// Ultra-simple RoofReady API - guaranteed to deploy
const http = require('http');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Simple routing
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      app: 'RoofReady SaaS',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  if (req.url === '/api/test' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'RoofReady API is working!'
    }));
    return;
  }
  
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Welcome to RoofReady API',
      endpoints: ['/api/health', '/api/test'],
      docs: 'https://github.com/JoeGeorge25/roofready'
    }));
    return;
  }
  
  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 RoofReady API running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});