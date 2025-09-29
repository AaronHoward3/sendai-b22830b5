// apps/api/middleware/trialTracking.js
import { supabase } from "../utils/supabaseClient.js";

// In-memory cache for trial tracking (in production, use Redis or database)
const trialCache = new Map();

/**
 * Check if an IP has already used their free trial
 */
export async function checkTrialUsage(req, res, next) {
  try {
    // Skip trial checking for authenticated users
    if (req.user?.id) {
      return next();
    }

    // Get client IP
    const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.headers['x-forwarded-for']?.split(',')[0] ||
                   'unknown';

    // Check in-memory cache first
    if (trialCache.has(clientIP)) {
      const trialData = trialCache.get(clientIP);
      if (trialData.used) {
        return res.status(403).json({ 
          error: "Free trial already used from this IP address",
          code: "TRIAL_USED",
          message: "Please sign in or subscribe to continue"
        });
      }
    }

    // Check database for persistent tracking
    if (supabase) {
      const { data, error } = await supabase
        .from('trial_usage')
        .select('ip_address, used_at')
        .eq('ip_address', clientIP)
        .maybeSingle();

      if (error) {
        console.error('Trial tracking error:', error);
        // Continue on error - don't block legitimate users
        return next();
      }

      if (data) {
        // IP has used trial before
        trialCache.set(clientIP, { used: true, usedAt: data.used_at });
        return res.status(403).json({ 
          error: "Free trial already used from this IP address",
          code: "TRIAL_USED",
          message: "Please sign in or subscribe to continue"
        });
      }
    }

    // Add to cache as not used yet
    trialCache.set(clientIP, { used: false });
    
    // Add trial tracking info to request
    req.trialInfo = { ip: clientIP, hasUsedTrial: false };
    next();

  } catch (error) {
    console.error('Trial tracking middleware error:', error);
    // Continue on error - don't block legitimate users
    next();
  }
}

/**
 * Mark an IP as having used their free trial
 */
export async function markTrialUsed(req, res, next) {
  try {
    // Skip if user is authenticated
    if (req.user?.id) {
      return next();
    }

    // Skip if not in preview mode
    if (!req.isPreviewMode) {
      return next();
    }

    const clientIP = req.trialInfo?.ip || 
                   req.ip || 
                   req.connection.remoteAddress || 
                   'unknown';

    // Mark in cache
    trialCache.set(clientIP, { used: true, usedAt: new Date().toISOString() });

    // Mark in database for persistence
    if (supabase) {
      const { error } = await supabase
        .from('trial_usage')
        .upsert({
          ip_address: clientIP,
          used_at: new Date().toISOString(),
          user_agent: req.headers['user-agent'] || null
        });

      if (error) {
        console.error('Failed to mark trial as used:', error);
        // Don't fail the request - trial was still used
      }
    }

    next();
  } catch (error) {
    console.error('Mark trial used error:', error);
    next();
  }
}

/**
 * Clean up old trial records (run periodically)
 */
export async function cleanupTrialRecords() {
  try {
    if (!supabase) return;

    // Delete records older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('trial_usage')
      .delete()
      .lt('used_at', thirtyDaysAgo.toISOString());

    if (error) {
      console.error('Failed to cleanup trial records:', error);
    } else {
      console.log('Cleaned up old trial records');
    }
  } catch (error) {
    console.error('Trial cleanup error:', error);
  }
}
