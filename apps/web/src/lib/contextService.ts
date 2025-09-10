import { apiPath } from './api';
import { supabase } from './supabaseClient';

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
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  const response = await fetch(apiPath('context/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}
