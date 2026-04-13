// Minimal RoofReady API - guaranteed to work on Railway
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Health check - ALWAYS works
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    app: 'RoofReady SaaS',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    message: 'API is running successfully'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'RoofReady API is working!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple jobs endpoint (mock data)
app.get('/api/jobs', (req, res) => {
  res.json([
    { id: 1, address: '123 Main St', status: 'ready', installDate: '2024-04-15' },
    { id: 2, address: '456 Oak Ave', status: 'at-risk', installDate: '2024-04-16' },
    { id: 3, address: '789 Pine Rd', status: 'blocked', installDate: '2024-04-17' }
  ]);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RoofReady API',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      jobs: '/api/jobs'
    },
    docs: 'https://github.com/JoeGeorge25/roofready'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RoofReady API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});