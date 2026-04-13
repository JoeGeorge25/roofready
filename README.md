# RoofReady SaaS

**Job Readiness System for Roofing Companies**

## 🎯 Overview
RoofReady is a mobile-first SaaS application that helps roofing companies track job readiness with clear "Ready / At Risk / Blocked" statuses before install day. Never have a crew show up to an unready job again.

## ✨ Features

### Core MVP Features
- **Job Board** with clear status indicators
- **Material Status** tracking
- **Crew Assignment** management
- **Weather Delay** flags
- **Homeowner Confirmation** system
- **Closeout Photos** upload

### User Roles
- **Owners** - Dashboard overview, reporting
- **Production Managers** - Job scheduling, crew assignment
- **Salespeople** - Job creation, customer communication
- **Crew Members** - Field updates, photo uploads

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and setup**
```bash
git clone <repository-url>
cd roofready
npm install
cd client
npm install
```

2. **Database setup**
```bash
# Create PostgreSQL database
createdb roofready

# Import schema
psql -d roofready -f database/schema.sql
```

3. **Environment configuration**
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. **Run development servers**

**Backend (API):**
```bash
npm run dev
# Server runs on http://localhost:5000
```

**Frontend (React app):**
```bash
cd client
npm start
# App runs on http://localhost:3000
```

## 📱 Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | $99/month | Up to 10 active jobs, basic job board |
| **Pro** | $199/month | Unlimited jobs, crew scheduling, weather alerts |
| **Team** | $349/month | All features + AI call notes, supplier integrations |

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Payments**: Stripe integration
- **Hosting**: Vercel/Railway (frontend), Railway/Render (backend)

### Database Schema
See `database/schema.sql` for complete PostgreSQL schema including:
- Users with role-based permissions
- Jobs with status tracking
- Material inventory
- Crew assignments
- Weather alerts
- Subscription management

## 🚢 Deployment

### Option 1: One-click Deploy
[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

### Option 2: Manual Deployment
```bash
# Use the deployment script
./deploy.sh production
```

### Option 3: Docker (Coming Soon)
```bash
docker build -t roofready .
docker run -p 5000:5000 roofready
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new company/user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Jobs
- `GET /api/jobs` - List all jobs (with filters)
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `PUT /api/jobs/:id/status` - Update job status

### Materials
- `GET /api/jobs/:id/materials` - Get job materials
- `POST /api/jobs/:id/materials` - Add material to job
- `PUT /api/materials/:id/status` - Update material status

### Crew
- `GET /api/crew/assignments` - Get crew assignments
- `POST /api/crew/assign` - Assign crew to job
- `PUT /api/crew/assignment/:id` - Update assignment

## 🎨 UI Components

### Status Badges
- **Ready**: Green badge, all requirements met
- **At Risk**: Yellow badge, missing 1-2 requirements
- **Blocked**: Red badge, critical issues
- **Completed**: Blue badge, job finished

### Mobile-First Design
- Responsive layout works on phones, tablets, desktops
- Touch-friendly interfaces for field crews
- Offline capability (coming soon)

## 🔧 Development

### Project Structure
```
roofready/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
├── server/               # Express backend
│   ├── routes/          # API routes
│   ├── controllers/     # Route controllers
│   ├── models/         # Database models
│   └── middleware/     # Auth & validation
├── database/            # SQL schemas & migrations
└── scripts/            # Deployment & utility scripts
```

### Adding New Features
1. Create database migration (if needed)
2. Add backend route and controller
3. Create frontend component/service
4. Update TypeScript types
5. Test thoroughly

## 📈 Business Model

### Revenue Streams
1. **Monthly Subscriptions** - Primary revenue
2. **Setup Fees** - Optional onboarding ($0-$499)
3. **Premium Features** - Future AI add-ons
4. **Integration Fees** - Supplier/insurance partnerships

### Target Market
- Local roofing companies
- Regional roofing contractors
- Construction management firms
- Property restoration companies

### Marketing Angle
"Never have a crew show up to an unready job again. RoofReady gives you crystal-clear job status so every install day runs smoothly."

## 🔮 Roadmap

### Phase 1 (MVP - Week 1)
- [x] Basic job board
- [x] Status tracking
- [x] User authentication
- [x] Mobile-responsive design
- [ ] Stripe integration
- [ ] Basic reporting

### Phase 2 (Month 1)
- [ ] AI call notes transcription
- [ ] Supplier integration
- [ ] Automated customer updates
- [ ] Insurance workflow
- [ ] Mobile app (React Native)

### Phase 3 (Quarter 1)
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] API for third-party integrations
- [ ] Marketplace for add-ons

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License
MIT License - see LICENSE file for details

## 🆘 Support
- Email: support@roofready.com
- Documentation: https://docs.roofready.com
- Community: https://community.roofready.com

---
**Built with ❤️ for roofing companies everywhere**