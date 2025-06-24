# 🌊 Floatr MVP - Social Connectivity Platform for Recreational Boating

![Floatr Logo](public/floatr-logo.png)

Floatr is a revolutionary social connectivity platform designed specifically for the recreational boating community. It enables boaters to discover nearby vessels, connect with fellow enthusiasts, and safely navigate maritime social interactions while prioritizing user safety and maritime compliance.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Docker** & **Docker Compose** 
- **PostgreSQL** 16+ with **PostGIS** extension
- **Git** for version control

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd floatr-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp environment.production.example .env.local
# Edit .env.local with your development credentials
```

4. **Database setup**
```bash
docker-compose up -d database redis
npm run db:migrate:dev
npm run zones:import
```

5. **Start development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15.3.4, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI Components
- **Authentication**: Clerk (with identity verification via Veriff)
- **Database**: PostgreSQL 16 with PostGIS extension
- **ORM**: Prisma with spatial data support
- **Real-time**: Socket.IO for WebSocket communication
- **Maps**: Mapbox GL for interactive maritime maps
- **Containerization**: Docker with multi-stage builds

### External Integrations

- **Clerk**: User authentication and management
- **Veriff**: Identity verification service
- **Mapbox**: Maps and geolocation services
- **Twilio**: SMS notifications for emergencies
- **Google Perspective API**: Content moderation
- **SendGrid**: Email notifications
- **Slack**: Internal monitoring and alerts

## 📦 Production Deployment

### Docker Deployment (Recommended)

#### 1. Prerequisites Setup

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Make deployment script executable
chmod +x deploy.sh
```

#### 2. Environment Configuration

```bash
# Copy the environment template
cp environment.production.example .env.production

# Edit with your production values
nano .env.production
```

**Required Environment Variables:**

| Category | Variable | Description |
|----------|----------|-------------|
| **App** | `NEXT_PUBLIC_APP_URL` | Your production domain |
| **Database** | `DATABASE_PASSWORD` | Secure PostgreSQL password |
| **Auth** | `CLERK_PUBLISHABLE_KEY` | Clerk public key |
| **Auth** | `CLERK_SECRET_KEY` | Clerk secret key |
| **Maps** | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox API token |
| **SMS** | `TWILIO_ACCOUNT_SID` | Twilio account SID |
| **Email** | `SENDGRID_API_KEY` | SendGrid API key |
| **Security** | `NEXTAUTH_SECRET` | 32+ character secret |

#### 3. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p ssl

# Add your SSL certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
```

#### 4. Google Cloud Credentials

```bash
# Download service account JSON from Google Cloud Console
# Place it as google-credentials.json in the root directory
cp path/to/service-account.json google-credentials.json
```

#### 5. Full Deployment

```bash
# Run complete deployment pipeline
./deploy.sh

# Or run individual steps
./deploy.sh build    # Build only
./deploy.sh migrate  # Database migrations only
./deploy.sh seed     # Seed production data only
```

#### 6. Verification

```bash
# Check application health
curl -f http://localhost:3000/health

# View running containers
docker-compose ps

# View logs
docker-compose logs -f app
```

### Manual Deployment

If you prefer manual deployment without Docker:

#### 1. Database Setup

```bash
# Install PostgreSQL with PostGIS
sudo apt-get install postgresql-16 postgresql-16-postgis-3

# Create database and user
createdb floatr_production
psql -d floatr_production -c "CREATE EXTENSION postgis;"
```

#### 2. Application Build

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy

# Seed production data
npm run db:seed:prod
```

#### 3. Process Management

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js

# Or systemd service
sudo systemctl enable floatr
sudo systemctl start floatr
```

## 🧪 Testing

### Test Suite Overview

Our comprehensive testing strategy includes:

- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Full user journey testing
- **Performance Tests**: Load time and responsiveness

### Running Tests

```bash
# Run all tests
npm run test:all

# Unit tests only
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Structure

```
src/test/
├── components/         # Component unit tests
│   ├── SOSButton.test.tsx
│   └── ReportDialog.test.tsx
├── utils/             # Utility function tests
│   └── distance.test.ts
├── api/               # API integration tests
│   └── sos.test.ts
├── e2e/               # End-to-end tests
│   └── user-journey.spec.ts
└── setup.ts           # Test configuration
```

### E2E Testing with Playwright

```bash
# Run E2E tests in different modes
npm run test:e2e              # Headless mode
npm run test:e2e:ui           # Interactive mode
npm run test:e2e:debug       # Debug mode

# Run tests in specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 🔐 Security

### Security Features

- **Authentication**: Multi-factor authentication via Clerk
- **Identity Verification**: Real identity verification via Veriff
- **Content Moderation**: Automated toxicity detection
- **Rate Limiting**: API and authentication rate limiting
- **Data Protection**: Encrypted data storage and transmission
- **Privacy Controls**: User blocking and reporting systems
- **Emergency Systems**: SOS alerts with GPS tracking

### Security Headers

All security headers are configured in `next.config.ts`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

## 📊 Monitoring & Maintenance

### Health Monitoring

```bash
# Check application health
curl http://localhost:3000/health

# View detailed health status
curl -s http://localhost:3000/health | jq '.'
```

### Database Backups

Automated backups are configured via the backup service:

```bash
# Manual backup
./scripts/backup.sh

# View backup logs
docker-compose logs backup

# Restore from backup
gunzip -c backup_file.sql.gz | psql -d floatr_production
```

### Log Management

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f database

# View nginx logs
docker-compose logs -f nginx
```

## 🚀 Performance Optimization

### Production Optimizations

- **Next.js Standalone Output**: Minimal Docker image size
- **Image Optimization**: WebP/AVIF format support
- **Caching Strategy**: Static asset caching and API response caching
- **Code Splitting**: Automatic bundle optimization
- **Compression**: Gzip compression for all text assets

### Performance Monitoring

Monitor key metrics:

- **Page Load Time**: < 3 seconds target
- **API Response Time**: < 500ms average
- **Database Query Time**: < 100ms average
- **Memory Usage**: < 512MB per container

## 🛠️ Development Tools

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run zones:import` | Import maritime zones |
| `npm run db:seed:prod` | Seed production data |

### Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   npm run dev
   # Develop your feature
   npm run test
   npm run lint
   ```

2. **Testing**
   ```bash
   npm run test:all
   npm run test:e2e
   ```

3. **Deployment**
   ```bash
   git push origin feature/new-feature
   # Create PR, review, merge
   ./deploy.sh
   ```

## 📚 API Documentation

### Core Endpoints

- **Authentication**: `/api/auth/*` - Clerk integration
- **User Management**: `/api/profile` - User CRUD operations
- **Boat Management**: `/api/boats` - Boat CRUD operations
- **Discovery**: `/api/boats/nearby` - Location-based discovery
- **Matching**: `/api/match` - Swipe and match functionality
- **Messaging**: `/api/matches/[id]/messages` - Real-time chat
- **Safety**: `/api/sos` - Emergency alert system
- **Reporting**: `/api/report` - Content reporting system
- **Maritime Zones**: `/api/zones` - No-go zone information

### WebSocket Events

- **Connection Management**: `connect`, `disconnect`
- **Messaging**: `message`, `typing`, `read_receipt`
- **Presence**: `user_online`, `user_offline`
- **Notifications**: `match_notification`, `message_notification`

## 🌍 Maritime Compliance

### Supported Zone Types

- **Ecological Zones**: Marine sanctuaries and wildlife protection
- **Alcohol-Free Zones**: Dry marina areas
- **Quiet Zones**: Noise-restricted areas
- **No-Anchor Zones**: Coral reef and sensitive bottom protection
- **High-Traffic Zones**: Commercial shipping lanes
- **Speed-Restricted Zones**: Wildlife protection areas
- **Protected Areas**: Various conservation zones

### Zone Management

```bash
# Import new zones
npm run zones:import

# Update existing zones
psql -d floatr_production -f scripts/update-zones.sql
```

## 🤝 Contributing

### Development Guidelines

1. **Code Standards**: Follow TypeScript strict mode
2. **Testing**: Maintain 80%+ test coverage
3. **Security**: All PRs require security review
4. **Performance**: Monitor bundle size and performance metrics
5. **Accessibility**: WCAG 2.1 AA compliance required

### Git Workflow

```bash
# Feature development
git checkout -b feature/feature-name
git commit -m "feat: add new feature"
git push origin feature/feature-name

# Bug fixes
git checkout -b fix/bug-description
git commit -m "fix: resolve bug issue"
git push origin fix/bug-description
```

## 📞 Support & Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database status
docker-compose ps database
docker-compose logs database

# Reset database
docker-compose down -v
docker-compose up -d database
npm run db:migrate:deploy
```

**SSL Certificate Issues**
```bash
# Verify certificate files
openssl x509 -in ssl/cert.pem -text -noout
openssl rsa -in ssl/key.pem -check
```

**Performance Issues**
```bash
# Check resource usage
docker stats
docker-compose logs app | grep "memory\|performance"
```

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discord**: Join our developer community
- **Email**: Contact the development team

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Phase 1: MVP Launch (Current)
- ✅ Core social features
- ✅ Safety systems
- ✅ Maritime compliance
- ✅ Production deployment

### Phase 2: Enhanced Features
- 🚧 Advanced matching algorithms
- 🚧 Group chat functionality
- 🚧 Event planning system
- 🚧 Marina integration

### Phase 3: Platform Growth
- 📋 Mobile applications
- 📋 Advanced analytics
- 📋 Premium features
- 📋 International expansion

---

**Built with ❤️ for the boating community**

*For technical support or deployment assistance, contact the development team.*
