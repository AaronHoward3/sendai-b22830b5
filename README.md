# IRIOS A.I. - AI-Powered Email Marketing Platform

A comprehensive monorepo for generating professional email marketing campaigns using AI. This platform combines brand data scraping, AI-powered content generation, and email template creation into a seamless workflow.

## 🏗️ Architecture Overview

This is a **3-service monorepo** built with modern web technologies:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Gateway   │    │ Email Generator │
│   (React/Vite)  │◄──►│   (Express.js)  │◄──►│   (Node.js)     │
│   Port: 5173    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase DB   │    │   OpenAI API    │    │   MJML Engine   │
│   (PostgreSQL)  │    │   (GPT-4)       │    │   (Email HTML)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
irios-monorepo/
├── apps/
│   ├── web/           # React frontend (Vite + TypeScript)
│   ├── api/           # Express.js API gateway
│   └── generator/     # Email generation service
├── scripts/           # Development utilities
├── package.json       # Root workspace configuration
└── README.md         # This file
```

### 🎨 Frontend (`apps/web/`)
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui + Radix UI + Tailwind CSS
- **State Management**: React hooks + Context
- **Authentication**: Supabase Auth
- **Key Features**:
  - Multi-step email generation wizard
  - Brand data visualization
  - Real-time AI context generation
  - Email preview and management

### 🔌 API Gateway (`apps/api/`)
- **Framework**: Express.js + Node.js
- **Authentication**: Supabase Auth middleware
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet + CORS + input validation
- **Key Features**:
  - Brand data scraping and storage
  - Product catalog management
  - AI context generation
  - Credit system management
  - Stripe billing integration

### 🤖 Email Generator (`apps/generator/`)
- **Framework**: Node.js + Express.js
- **AI Integration**: OpenAI GPT-4
- **Email Engine**: MJML (responsive email HTML)
- **Key Features**:
  - Two-pass email generation pipeline
  - AI-powered content refinement
  - Hero image generation
  - Template system with multiple design aesthetics

## 🚀 Quick Start

### Prerequisites
- **Node.js**: >= 20.10.0
- **npm**: Latest version
- **Supabase Account**: For database and auth
- **OpenAI API Key**: For AI features
- **Stripe Account**: For billing (optional)

### 1. Clone and Install
```bash
git clone <repository-url>
cd irios-monorepo
npm install
```

### 2. Environment Setup
Create `.env` files in each app directory:

**`apps/api/.env`**:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Generator Service
GENERATOR_URL=http://localhost:3002

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key

# Brand Data API (optional)
BRANDDEV_API_KEY=your_branddev_api_key
```

**`apps/generator/.env`**:
```env
OPENAI_API_KEY=your_openai_api_key
```

### 3. Database Setup
1. Create a Supabase project
2. Run the SQL schema (see `apps/api/docs/` for database setup)
3. Configure RLS policies for security

### 4. Start Development
```bash
# Start all services concurrently
npm run dev

# Or start individually:
npm run dev:web      # Frontend on :5173
npm run dev:api      # API on :3001
npm run dev:generator # Generator on :3002
```

## 🔧 Development Workflow

### Available Scripts

**Root Level**:
```bash
npm run dev              # Start all services
npm run build            # Build all services
npm run check:all        # Run all quality checks
npm run security:audit   # Security audit
```

**Individual Services**:
```bash
npm run dev:web          # Frontend only
npm run dev:api          # API only
npm run dev:generator    # Generator only
```

### Code Quality Tools
- **ESLint**: Code linting
- **TypeScript**: Type checking
- **Knip**: Unused code detection
- **Madge**: Circular dependency detection
- **Depcheck**: Dependency analysis

## 🏛️ Architecture Deep Dive

### Data Flow
1. **User Input** → Frontend collects domain and preferences
2. **Brand Scraping** → API scrapes brand data and products
3. **AI Context Generation** → API generates human-readable prompts
4. **Email Generation** → Generator creates MJML templates
5. **Content Refinement** → AI refines copy and styling
6. **Final Output** → Responsive HTML emails

### Key Services

#### Brand Scraping (`apps/api/utils/`)
- **Universal Scraper**: Handles most e-commerce sites
- **Hybrid Scraper**: Combines multiple strategies
- **Product Scraper**: Extracts product catalogs
- **Brand Normalizer**: Standardizes brand data

#### AI Integration
- **Context Generation**: Creates digestible prompts from brand data
- **Content Refinement**: Improves email copy and structure
- **Image Generation**: Creates custom hero images
- **Subject Lines**: Generates compelling email subjects

#### Email Templates (`apps/generator/lib/`)
- **Design Aesthetics**: 8 different visual styles
- **Block System**: Modular email components
- **Responsive Design**: Mobile-first approach
- **Brand Theming**: Dynamic color and styling

## 🔐 Security & Authentication

### Authentication Flow
1. **Supabase Auth**: Handles user registration/login
2. **JWT Tokens**: Secure API communication
3. **RLS Policies**: Database-level security
4. **Rate Limiting**: Prevents abuse

### Security Features
- **Input Sanitization**: All user inputs are validated
- **CORS Protection**: Configured for production domains
- **Helmet Security**: Security headers
- **CSRF Protection**: Cross-site request forgery prevention

## 💳 Billing & Credits

### Credit System
- **Email Credits**: For email generation
- **Image Credits**: For hero image generation
- **Brand Credits**: For brand data storage
- **Usage Tracking**: Real-time credit consumption

### Stripe Integration
- **Subscription Management**: Monthly/yearly plans
- **Webhook Handling**: Real-time payment updates
- **Credit Top-ups**: Additional credit purchases

## 🚀 Deployment

### Production Environment
The project is configured for deployment on **Render.com**:

**API Service** (`irios-api`):
- **Runtime**: Node.js 20
- **Build**: `npm ci`
- **Start**: `node server.js`
- **Health Check**: `/healthz`

**Generator Service** (`irios-generator`):
- **Runtime**: Node.js 20
- **Build**: `npm ci`
- **Start**: `node src/server.js`
- **Health Check**: `/healthz`

**Frontend** (Vercel):
- **Framework**: Vite + React
- **Build**: `npm run build`
- **Deploy**: Automatic on push

### Environment Variables
Set these in your deployment platform:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GENERATOR_URL`
- `STRIPE_SECRET_KEY`

## 🧪 Testing & Debugging

### API Testing
```bash
# Test API endpoints
cd apps/api
npm run test

# Debug scraper
node scripts/debug-scraper.js

# Test specific brand
node scripts/test-nike.js
```

### Generator Testing
```bash
# Test email generation
cd apps/generator
npm run test
```

### Frontend Development
- **Hot Reload**: Automatic on file changes
- **TypeScript**: Real-time type checking
- **ESLint**: Live linting in IDE
- **Tailwind**: CSS hot reload

## 📚 Key Concepts for Contributors

### Understanding the Email Generation Pipeline

1. **Brand Data Collection**:
   - Scrapes website for brand info, colors, products
   - Normalizes data into consistent format
   - Stores in Supabase for future use

2. **AI Context Generation**:
   - Takes raw brand data + user preferences
   - Generates human-readable prompts
   - Creates both user context and image context

3. **Email Template Assembly**:
   - Selects appropriate design aesthetic
   - Assembles MJML blocks based on email type
   - Applies brand theming and colors

4. **AI Content Refinement**:
   - Takes MJML skeleton + context
   - Refines copy, headlines, CTAs
   - Maintains structure while improving content

5. **Final Processing**:
   - Compiles MJML to HTML
   - Generates hero images (if needed)
   - Returns complete email package

### Working with the Codebase

**Frontend Development**:
- Components are in `apps/web/src/components/`
- Pages are in `apps/web/src/pages/`
- Services are in `apps/web/src/lib/`
- Use TypeScript interfaces for type safety

**API Development**:
- Controllers handle business logic
- Routes define endpoints
- Middleware handles auth, validation, etc.
- Utils contain reusable functions

**Generator Development**:
- Services handle AI interactions
- Pipeline manages generation flow
- Blocks define email components
- Themes apply visual styling

### Adding New Features

1. **Frontend**: Add components, update forms, handle state
2. **API**: Create endpoints, add validation, update database
3. **Generator**: Add templates, modify pipeline, enhance AI prompts

### Common Patterns

**Error Handling**:
- Frontend: Try/catch with user-friendly messages
- API: Middleware with proper HTTP status codes
- Generator: Graceful fallbacks for AI failures

**State Management**:
- Frontend: React hooks + Context for global state
- API: Stateless with database persistence
- Generator: In-memory with job tracking

**AI Integration**:
- Always provide fallbacks for AI failures
- Use appropriate models for different tasks
- Track token usage for cost management

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- **TypeScript**: Use strict typing
- **ESLint**: Follow configured rules
- **Prettier**: Consistent formatting
- **Commits**: Clear, descriptive messages

### Testing Requirements
- **Frontend**: Test user interactions
- **API**: Test endpoints with various inputs
- **Generator**: Test email output quality

## 📞 Support & Resources

### Documentation
- **API Docs**: `apps/api/docs/`
- **Scraper Guide**: `apps/api/SCRAPER_QUICKSTART.md`
- **Generator README**: `apps/generator/README.md`

### Key Files to Understand
- `apps/web/src/components/EmailGenerator.tsx` - Main frontend flow
- `apps/api/controllers/generateController.js` - Email generation API
- `apps/generator/src/pipeline/twoPassGenerator.js` - Core generation logic
- `apps/generator/src/services/heroImageService.js` - AI image generation

### External Services
- **Supabase**: Database and authentication
- **OpenAI**: AI content generation
- **Stripe**: Payment processing
- **Render**: Hosting platform

---

## 🎯 Quick Reference

**Start Development**: `npm run dev`
**Build All**: `npm run build`
**Check Quality**: `npm run check:all`
**API Health**: `http://localhost:3001/healthz`
**Generator Health**: `http://localhost:3002/healthz`
**Frontend**: `http://localhost:5173`

**Key Endpoints**:
- `POST /api/generate` - Generate emails
- `POST /api/context/generate` - Generate AI context
- `POST /api/brand/check` - Check brand data
- `POST /api/products/scrape` - Scrape products

This monorepo provides a complete AI-powered email marketing platform with modern architecture, comprehensive features, and production-ready deployment configuration.