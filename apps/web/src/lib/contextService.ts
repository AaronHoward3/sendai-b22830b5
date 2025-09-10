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

/**
 * Generate AI context for anonymous users (preview mode)
 * Falls back to template-based generation if AI is not available
 */
export async function generateAIContextPreview(request: ContextGenerationRequest): Promise<ContextGenerationResponse> {
  try {
    // Try to get session token (might be null for anonymous users)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      // If user is authenticated, use the regular AI context generation
      return generateAIContext(request);
    }

    // For anonymous users, return template-based context
    return {
      success: true,
      userContext: `Create a ${request.emailType?.toLowerCase() || 'promotional'} email for ${request.domain}. Focus on engaging content that highlights the brand's value proposition.`,
      imageContext: `Generate a hero image that represents ${request.domain}'s brand identity. Use a clean, professional style that matches the ${request.designAesthetic || 'minimal'} aesthetic.`,
    };
  } catch (error) {
    // Fallback to template-based generation
    return {
      success: true,
      userContext: `Create a ${request.emailType?.toLowerCase() || 'promotional'} email for ${request.domain}. Focus on engaging content that highlights the brand's value proposition.`,
      imageContext: `Generate a hero image that represents ${request.domain}'s brand identity. Use a clean, professional style that matches the ${request.designAesthetic || 'minimal'} aesthetic.`,
    };
  }
}