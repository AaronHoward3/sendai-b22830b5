import { apiPath } from './api';

export interface ContextGenerationRequest {
  brandData?: any;
  emailType?: 'Promotion' | 'Newsletter';
  tone?: 'bold' | 'friendly' | 'formal' | 'fun';
  designAesthetic?: string;
  products?: Array<{ name?: string; url?: string; image?: string; description?: string }>;
  occasion?: string;
  domain: string;
}

export interface ContextGenerationResponse {
  success: boolean;
  userContext: string;
  imageContext: string;
  usage?: {
    userContextTokens: number;
    imageContextTokens: number;
  };
}

/**
 * Generate AI-powered, digestible user context and image context
 */
export async function generateAIContext(request: ContextGenerationRequest): Promise<ContextGenerationResponse> {
  const response = await fetch(apiPath('context/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}
