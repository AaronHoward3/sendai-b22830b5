# IRIOS REVAMP

A multi-service architecture project with separate frontend, backend, and generator services.

## Project Structure

```
IRIOS REVAMP/
├── frontend/          # Web application (Vercel deployment)
├── backend/           # API server (Render deployment)
├── generator/         # Content generation service (Render deployment)
└── README.md         # This file
```

## Services

### Frontend (Web)
- **Location**: `frontend/`
- **Deployment**: Vercel
- **Port**: 3000 (development)
- **Framework**: Next.js

### Backend (API)
- **Location**: `backend/`
- **Deployment**: Render
- **Port**: 3001 (development)
- **Framework**: Express.js

### Generator
- **Location**: `generator/`
- **Deployment**: Render
- **Port**: 3002 (development)
- **Framework**: Express.js

## Getting Started

Each service has its own README with specific setup instructions. Navigate to the respective folder and follow the setup guide.

## Development

1. Clone the repository
2. Set up each service individually:
   - `cd frontend && npm install`
   - `cd backend && npm install`
   - `cd generator && npm install`
3. Start each service in development mode
4. Services will be available on their respective ports

## Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Render
- **Generator**: Deploy to Render

Each service is configured for its respective deployment platform.

