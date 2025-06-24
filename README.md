# Floatr - Social Boating Platform

![Floatr Logo](https://img.shields.io/badge/Floatr-MVP-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Clerk Auth](https://img.shields.io/badge/Clerk-Auth-purple?style=for-the-badge)

Revolutionary social connectivity platform for the recreational boating community. Break down social isolation on water and connect with fellow boating enthusiasts.

## 🚀 Development Status

- ✅ **Project Setup & Infrastructure** - Complete
- ✅ **User Authentication System** - Complete
- ⏳ **Identity Verification System** - Next Phase
- ⏳ **User Profile Management** - Planned
- ⏳ **Real-Time Location & Mapping** - Planned

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Authentication**: Clerk
- **Database**: PostgreSQL (schema ready)
- **Architecture**: Web-first with mobile expansion planned

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Clerk account (for authentication)
- PostgreSQL database (for production)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd floatr-app
npm install
```

### 2. Environment Setup
Copy the environment template:
```bash
cp env.template .env.local
```

### 3. Configure Clerk Authentication
1. Create a free account at [Clerk.com](https://clerk.com)
2. Create a new application
3. Copy your API keys to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 🔐 Authentication Setup

### Clerk Configuration
Floatr uses Clerk for secure, scalable authentication with the following features:
- Email/password registration
- Social logins (ready for Google/Apple)
- Email verification
- Session management
- Protected routes

### Without Clerk Keys
The app gracefully handles missing Clerk configuration:
- Shows setup instructions on dashboard
- Builds successfully for development
- All authentication features disabled but UI remains functional

## 🏗️ Project Structure

```
floatr-app/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication routes
│   │   │   ├── sign-in/     # Sign-in page
│   │   │   └── sign-up/     # Sign-up page
│   │   ├── dashboard/       # Protected dashboard
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   └── ui/              # Shadcn UI components
│   ├── lib/
│   │   ├── config.ts        # App configuration
│   │   └── db/
│   │       └── schema.sql   # Database schema
│   └── types/
│       └── index.ts         # TypeScript definitions
├── middleware.ts            # Route protection
└── env.template             # Environment variables template
```

## 🎨 Design System

### Colors
- **Primary**: Blue (maritime theme)
- **Secondary**: Ocean-inspired gradients
- **Safety**: Green for verified states
- **Alerts**: Appropriate warning colors

### Components
Built with **Shadcn UI** for consistency:
- Modern, accessible components
- Customizable design tokens
- Mobile-responsive by default

## 🔒 Security Features

- **Route Protection**: Middleware-based authentication
- **Identity Verification**: Ready for Veriff/Onfido integration
- **Data Validation**: TypeScript throughout
- **Security Headers**: Production-ready configuration

## 🗄️ Database Schema

Complete PostgreSQL schema includes:
- User management & profiles
- Boat registration system
- Real-time location tracking
- Matching & communication
- Safety & reporting features
- Audit logging

## 📱 Responsive Design

- **Desktop First**: Optimized for desktop/tablet use
- **Mobile Ready**: Progressive enhancement for mobile
- **Future Native**: Architecture supports React Native expansion

## 🧪 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript checking
```

## 🚢 Deployment

### Environment Variables
Required for production:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# Optional: Third-party services
VERIFF_API_KEY=
GOOGLE_MAPS_API_KEY=
TWILIO_AUTH_TOKEN=
```

### Build & Deploy
```bash
npm run build
npm run start
```

## 🤝 Contributing

This is an MVP project following the Task-Master methodology:
1. Tasks are defined in `FLOATR_DEVELOPMENT_PLAN.md`
2. Sequential development approach
3. Each task is completed and verified before moving to the next

## 📄 License

© 2025 Floatr. All rights reserved.

## 🆘 Support

For development questions or issues:
1. Check the development plan for current status
2. Ensure environment variables are correctly configured
3. Verify Clerk authentication setup

---

**Ready to set sail? 🛥️ Get started with `npm run dev`**
