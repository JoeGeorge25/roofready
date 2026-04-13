#!/bin/bash

# RoofReady Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="roofready"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Deploying RoofReady SaaS ($ENVIRONMENT environment)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the roofready directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build React app
echo "🔨 Building React app..."
cd client
npm install
npm run build
cd ..

# Create deployment directory
DEPLOY_DIR="../deployments/${APP_NAME}_${TIMESTAMP}"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
mkdir -p $DEPLOY_DIR

# Copy files
echo "📋 Copying files..."
cp -r package.json server.js database .env.example $DEPLOY_DIR/
cp -r client/build $DEPLOY_DIR/client-build

# Create production .env if it doesn't exist
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from example..."
    cp .env.example $DEPLOY_DIR/.env
    echo "📝 Please update $DEPLOY_DIR/.env with your production values"
fi

# Create PM2 ecosystem file
cat > $DEPLOY_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '${ENVIRONMENT}',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Create nginx config
cat > $DEPLOY_DIR/nginx.conf << EOF
server {
    listen 80;
    server_name roofready.yourdomain.com;
    
    # React app
    location / {
        root /path/to/${DEPLOY_DIR}/client-build;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files
    location /static {
        root /path/to/${DEPLOY_DIR}/client-build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo "✅ Deployment package created at: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Update $DEPLOY_DIR/.env with production values"
echo "2. Set up PostgreSQL database using database/schema.sql"
echo "3. Install PM2: npm install -g pm2"
echo "4. Start the app: cd $DEPLOY_DIR && pm2 start ecosystem.config.js --env production"
echo "5. Set up nginx with $DEPLOY_DIR/nginx.conf"
echo ""
echo "🌐 Your app will be available at: http://roofready.yourdomain.com"