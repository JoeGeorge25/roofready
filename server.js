// Main server file - uses server-prod.js for production
if (process.env.NODE_ENV === 'production') {
  require('./server-prod.js');
} else {
  // Development server
  require('dotenv').config();
  const express = require('express');
  const cors = require('cors');
  
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  app.use(cors());
  app.use(express.json());
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      app: 'RoofReady SaaS (Dev)',
      version: '1.0.0',
      environment: 'development'
    });
  });
  
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Development server running' });
  });
  
  app.listen(PORT, () => {
    console.log(`🚀 RoofReady development server on port ${PORT}`);
  });
}