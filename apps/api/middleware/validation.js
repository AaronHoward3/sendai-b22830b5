import { z } from 'zod';

// Common validation schemas
export const domainSchema = z.string()
  .min(1, 'Domain is required')
  .max(253, 'Domain too long')
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, 'Invalid domain format');

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email too long');

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  url: z.string().url('Invalid URL format').max(500, 'URL too long'),
  image: z.string().url('Invalid image URL').max(500, 'Image URL too long').optional(),
});

export const generateEmailSchema = z.object({
  domain: domainSchema,
  emailType: z.enum(['Promotion', 'Newsletter']),
  tone: z.enum(['bold', 'friendly', 'formal', 'fun']),
  designAesthetic: z.enum(['minimal_clean', 'bold_contrasting', 'magazine_serif', 'warm_editorial', 'neo_brutalist', 'gradient_glow', 'pastel_soft', 'luxe_mono']),
  userContext: z.string().max(1000, 'User context too long'),
  imageContext: z.string().max(1000, 'Image context too long').optional(),
  products: z.array(productSchema).max(4, 'Too many products'),
  customHeroImage: z.boolean(),
  savedHeroImageUrl: z.string().url().nullable().optional(),
  savedHeroImageId: z.string().nullable().optional(),
  brandData: z.object({}).optional(),
});

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params
      });
      
      // Only replace request body with validated data (query and params are read-only)
      req.body = { ...req.body, ...validatedData };
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
}
