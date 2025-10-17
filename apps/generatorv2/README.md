# GeneratorV2 - Complete Email Generator Replacement

A complete replacement for the original generator that uses example PNG screenshots to generate MJML emails with AI, plus the same hero image generation as the original.

## Features

- **Example-based generation**: Uses example email template images to generate MJML
- **Frontend-compatible design aesthetics**: Supports the exact same styles as your frontend:
  - `minimal_clean` - Whitespace, simple typography
  - `bold_contrasting` - High contrast, punchy CTAs  
  - `magazine_serif` - Editorial, premium feel
  - `warm_editorial` - Serif headlines, paper texture
- **Original hero image generation**: Uses the same DALL-E 3 + Supabase upload logic as the original generator
- **Brand integration**: Incorporates raw brand.dev data, colors, and products
- **Complete API replacement**: Drop-in replacement for the original generator service
- **Production-ready**: Includes concurrency limiting, CORS, compression, and error handling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
Create a `.env` file in `apps/generatorv2/` with:
```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_IMAGES_BUCKET=your_images_bucket
PORT=3000
```

**IMPORTANT**: You must create this `.env` file before running the service, otherwise it will fail to start.

3. Add example images:
   - Place PNG/JPG email template examples in `examples/[design-aesthetic]/[email-type]/`
   - Supported design aesthetics: `minimal-clean`, `bold-contrasting`, `magazine-serif`, `warm-editorial`
   - Supported email types: `promotion`, `newsletter`, `announcement`, etc.

## API Usage

### POST /generate (Main endpoint)
### POST /api/generate-emails (API compatibility alias)

Generate an email using example images and AI.

**Request Body:**
```json
{
  "domain": "example.com",
  "emailType": "promotion",
  "designAesthetic": "bold_contrasting",
  "tone": "bold",
  "userContext": "Summer sale promotion",
  "imageContext": "Outdoor lifestyle",
  "products": [
    {
      "title": "Product Name",
      "subtitle": "Product description",
      "price": "$99",
      "imageUrl": "https://example.com/product.jpg",
      "buttonUrl": "https://example.com/product"
    }
  ],
  "brandData": {
    "brand": {
      "title": "Brand Name",
      "description": "Brand description",
      "colors": [
        {"hex": "#ff0000", "name": "Primary"},
        {"hex": "#00ff00", "name": "Secondary"}
      ]
    }
  },
  "customHeroImage": true,
  "savedHeroImageUrl": null
}
```

**Response:**
```json
{
  "success": true,
  "mjml": "<mjml>...</mjml>",
  "heroImageUrl": "https://example.com/hero.jpg",
  "emailType": "promotion",
  "designAesthetic": "bold_contrasting",
  "domain": "example.com",
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

## How It Works

1. **Example Selection**: Randomly selects an example image based on design aesthetic and email type
2. **AI Generation**: Uses OpenAI Vision to analyze the example and generate matching MJML
3. **Hero Image**: Uses the same DALL-E 3 + Supabase upload logic as the original generator
4. **Integration**: Combines brand data, products, and user context into the final email

## Example Image Structure

```
examples/
├── minimal-clean/
│   ├── promotion/
│   │   ├── example1.png
│   │   └── example2.png
│   └── newsletter/
│       └── example1.png
├── bold-contrasting/
│   ├── promotion/
│   └── newsletter/
├── magazine-serif/
│   ├── promotion/
│   └── newsletter/
└── warm-editorial/
    ├── promotion/
    └── newsletter/
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Health Check

```bash
GET /health
GET /healthz
GET /
```

Returns service status and version information.

## Migration from Original Generator

This service is designed as a complete replacement for the original generator:

1. **Same endpoints**: `/generate` and `/api/generate-emails`
2. **Same request/response format**: Drop-in replacement
3. **Same hero image generation**: Uses identical DALL-E 3 + Supabase logic
4. **Enhanced features**: Example-based MJML generation with Vision API
5. **Production ready**: Includes all the same production features (CORS, compression, concurrency limiting)

Simply update your API calls to point to this service instead of the original generator.
