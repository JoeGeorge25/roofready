require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    app: 'RoofReady SaaS',
    version: '1.0.0',
    message: 'Job readiness system for roofing companies'
  });
});

// API Routes (to be implemented)
app.get('/api/jobs', (req, res) => {
  // TODO: Get all jobs
  res.json({ message: 'Jobs endpoint - to be implemented' });
});

app.post('/api/jobs', (req, res) => {
  // TODO: Create new job
  res.json({ message: 'Create job - to be implemented' });
});

app.put('/api/jobs/:id/status', (req, res) => {
  // TODO: Update job status (ready/at risk/blocked)
  res.json({ message: 'Update job status - to be implemented' });
});

// Serve React app for any other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 RoofReady server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});