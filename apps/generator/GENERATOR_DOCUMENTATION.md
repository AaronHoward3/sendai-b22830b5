# Email Generator Documentation

## Overview

The Email Generator is a sophisticated Node.js application that creates branded MJML email templates using AI-powered content generation and dynamic layout composition. It's designed to generate professional promotional and newsletter emails with customizable design aesthetics and brand-specific theming.

## Architecture

### High-Level Flow
```
Request → Layout Selection → MJML Composition → AI Refinement → Theme Application → Final Output
     ↓              ↓                ↓               ↓              ↓
  Brand Data → Block Selection → Base Template → Content Writing → Styled Email
```

### Core Components

#### 1. **Controllers** (`src/controllers/`)
- **`emailController.js`**: Main request handler for email generation
- Handles both streaming (SSE) and traditional request/response patterns
- Manages parallel hero image generation and email content creation
- Processes brand data, user context, and design preferences

#### 2. **Pipeline** (`src/pipeline/`)
- **`twoPassGenerator.js`**: Core generation engine implementing a two-pass approach:
  - **Pass 1**: Layout selection + AI content refinement
  - **Pass 2**: Deterministic theming (no AI)

#### 3. **Layout System** (`src/layout/`)
- **`layoutComposer.js`**: Smart layout selection and MJML composition
- Analyzes brand data and user context to select appropriate email blocks
- Supports dynamic block ordering based on content analysis

#### 4. **Theme Engine** (`src/theme/`)
- **`skins.js`**: Defines design aesthetic variations (10+ styles)
- **`applyTheme.js`**: Applies themes deterministically after AI generation
- **`tokens.js`**: Manages brand-specific color tokens and gradients

#### 5. **Block System** (`src/blocks/`)
- **`blockRegistry.js`**: Manages template block files
- Organizes blocks by email type (Newsletter, Promotion) and aesthetic
- Supports fallback hierarchies for block selection

#### 6. **Services** (`src/services/`)
- **`heroImageService.js`**: Generates custom hero images using OpenAI's image API
- **`imageUploadService.js`**: Handles image uploads to AWS S3 or Supabase
- **`productSectionService.js`**: Creates product showcases for promotional emails
- **`headerFooterBlockService.js`**: Generates branded headers and footers

## Two-Pass Generation Process

### Pass 1: Layout & Content Generation

1. **Layout Selection**
   ```javascript
   const layout = await chooseLayout(emailType, designAesthetic, brandData, userContext);
   ```
   - Analyzes content context (urgent, story-driven, minimal, bold, etc.)
   - Selects appropriate blocks from the template library
   - Uses smart block selection based on brand personality analysis

2. **MJML Composition**
   ```javascript
   const baseMjml = await composeBaseMjml(emailType, designAesthetic, layout, brandData);
   ```
   - Assembles header, blocks, and footer into complete MJML structure
   - For promotional emails: injects `[[PRODUCT_SECTION]]` token instead of static block2
   - Adds divider elements between blocks
   - Implements dynamic block ordering

3. **AI Content Refinement**
   ```javascript
   const refinedMjml = await aiRefinement(baseMjml, brandData, userContext);
   ```
   - Uses OpenAI to replace placeholders with brand-specific content
   - Generates compelling headlines, CTAs, and product descriptions
   - Preserves MJML structure while refining copy

### Pass 2: Deterministic Theming

1. **Style Resolution**
   ```javascript
   const skin = makeSkin(brandTokens, skinId);
   ```
   - Converts brand data into design tokens
   - Applies theme rules (typography, colors, spacing, etc.)
   - No AI involvement - purely algorithmic styling

2. **Theme Application**
   ```javascript
   const themedMjml = applyTheme(refinedMjml, brandData, skinId);
   ```
   - Injects theme-specific CSS and MJML attributes
   - Applies color palettes and typography
   - Adds interactive effects and responsive design
   - Ensures WCAG accessibility compliance

## Template Block System

### Block Organization
```
lib/
├── newsletter-blocks/
│   ├── skeleton/          # Style-agnostic blocks
│   ├── minimal_clean/     # Clean aesthetic variants
│   └── default/          # Legacy block sets
└── promotion-blocks/
    ├── skeleton/
    ├── bold_contrasting/
    ├── minimal_clean/
    └── default/
```

### Block Types
- **block1**: Hero/opening sections
- **block2**: Main content or product sections
- **block3**: Call-to-action sections

### Smart Block Selection
The system analyzes content to automatically select appropriate blocks:
- **Urgent content**: Bold, high-impact designs
- **Story-driven**: Editorial, narrative-focused layouts
- **Minimal content**: Clean, simple designs
- **Social proof**: Testimonial and review-focused blocks

## Design Aesthetics (Skins)

### Available Themes
1. **minimal_clean**: Clean, professional design with subtle elements
2. **bold_contrasting**: High-impact design with strong contrast
3. **gradient_glow**: Modern design with gradient backgrounds
4. **warm_editorial**: Editorial-inspired, warm color palette
5. **magazine_serif**: Sophisticated magazine aesthetic
6. **pastel_soft**: Soft, friendly color palette
7. **luxe_mono**: Luxury black-and-white design
8. **neo_brutalist**: Bold, modern brutalism
9. **modern_glass**: Glass morphism effects
10. **neon_cyber**: Cyberpunk-inspired neon design

### Theme Features
- **Typography**: Font families, weights, and sizes optimized per theme
- **Color Palettes**: Brand-aware color schemes
- **Layout**: Border radius, shadows, and spacing
- **Interactive Effects**: Hover animations and transitions
- **Accessibility**: WCAG-compliant contrast ratios

## Hero Image Generation

### Process
1. **Prompt Generation**: Creates AI-safe prompts excluding text/logos
2. **Image Creation**: Uses OpenAI's GPT-Image-1 model
3. **Upload**: Stores images on AWS S3 or Supabase
4. **Integration**: Embeds URLs in email templates

### Safety Features
- Invariant prompt templates prevent text/logos in final images
- Content policy enforcement
- Fallback to local prompts if AI prompt generation fails

## API Endpoints

### Generate Email
```http
POST /api/generate-emails
Content-Type: application/json
Accept: text/mjml (optional)

{
  "brandData": {
    "brandName": "Your Brand",
    "description": "Brand description",
    "colors": ["#FF6B6B"],
    "products": [...],
    "customHeroImage": true
  },
  "emailType": "Promotion",
  "styleId": "minimal_clean",
  "userContext": "Custom email content...",
  "imageContext": "Additional image guidance"
}
```

**Response:**
```json
{
  "success": true,
  "emails": [{
    "content": "<mjml>...</mjml>",
    "tokens": 10294
  }],
  "totalTokens": 30883,
  "styleUsed": {
    "palette": {...}
  }
}
```

### Streaming Support
Supports Server-Sent Events (SSE) for real-time generation updates:
```http
GET /api/generate-emails?stream=1
Accept: text/event-stream
```

**Stream Events:**
- `start`: Generation begins
- `hero:start`: Hero image generation
- `layout:chosen`: Layout selected
- `refine:writing`: AI refinement
- `refine:done`: Content refinement complete
- `finalizing`: Final processing
- `complete`: Generation finished

## Configuration

### Environment Variables

#### Required
```bash
OPENAI_API_KEY=your_openai_api_key
```

#### Optional
```bash
# Image hosting (AWS S3)
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket

# Image hosting (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Model configuration
REFINE_MODEL=gpt-3.5-turbo
HERO_PROMPT_MODEL=gpt-3.5-turbo
```

### Development
```bash
npm install
npm run dev      # Development with nodemon
npm start        # Production server
npm test         # Test endpoint
```

## Deployment

### AWS App Runner
- Containerized deployment with Docker
- Supports long-running requests (5+ minutes)
- Automatic scaling and HTTPS
- GitHub Actions integration for CI/CD

### Environment Setup
1. Configure AWS credentials
2. Run setup script: `.\setup-apprunner.ps1`
3. Add GitHub secrets for automated deployment
4. Deploy via push to main branch

## Key Features

### Performance Optimizations
- **Parallel Processing**: Hero images and email content generated simultaneously
- **Template Caching**: Block files cached in memory
- **Concurrent Request Limiting**: Prevents server overload
- **Streaming Support**: Real-time progress updates

### Error Handling
- **Graceful Degradation**: Falls back to default blocks if specific ones unavailable
- **Timeout Management**: Hero image generation with fallback
- **Retry Logic**: OpenAI API calls with exponential backoff
- **Validation**: Input validation and sanitization

### Scalability
- **Stateless Design**: No server-side session storage
- **Modular Architecture**: Easy to extend with new themes/blocks
- **Template Separation**: Themes and content generation are independent
- **Metrics Collection**: Performance and usage tracking

## File Structure
```
apps/generator/
├── src/
│   ├── controllers/     # Request handlers
│   ├── pipeline/        # Core generation engine
│   ├── layout/         # Layout composition
│   ├── theme/          # Design system
│   ├── blocks/         # Template registry
│   ├── services/       # Business logic
│   ├── routes/         # API endpoints
│   └── utils/          # Helper functions
├── lib/                # Template blocks
│   ├── newsletter-blocks/
│   ├── promotion-blocks/
│   └── design-elements/
├── scripts/            # Development tools
└── docs/               # Documentation
```

This documentation provides a comprehensive overview of how the Email Generator works, its architecture, and key features. The two-pass approach ensures high-quality content while maintaining design consistency through deterministic theming.

