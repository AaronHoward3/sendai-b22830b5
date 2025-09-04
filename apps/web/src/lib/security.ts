// Security configuration for the web application
export const securityConfig = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "https:"],
    'font-src': ["'self'", "data:"],
    'connect-src': [
      "'self'", 
      "https://*.supabase.co", 
      "https://api.stripe.com",
      "https://*.vercel.app"
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  },
  
  // Input sanitization rules
  sanitization: {
    maxLength: {
      domain: 253,
      email: 254,
      productName: 200,
      url: 500,
      userContext: 1000,
      imageContext: 1000
    },
    allowedDomains: [
      'localhost',
      '127.0.0.1',
      'vercel.app',
      'netlify.app'
    ]
  },
  
  // Rate limiting (client-side hints)
  rateLimiting: {
    maxRequestsPerMinute: 60,
    maxConcurrentRequests: 5
  }
};

// Input validation helpers
export function sanitizeInput(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function validateDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= securityConfig.sanitization.maxLength.domain;
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= securityConfig.sanitization.maxLength.email;
}

export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
