const express = require('express');
const app = express();
const PORT = 5001;

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    app: 'RoofReady SaaS',
    version: '1.0.0',
    message: 'Job readiness system for roofing companies'
  });
});

app.listen(PORT, () => {
  console.log(`✅ RoofReady test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});