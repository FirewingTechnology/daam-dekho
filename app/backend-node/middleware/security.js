/**
 * Security and Rate Limiting Middleware
 * Implements rate limiting, IP whitelisting, and security headers
 */

import rateLimit from 'express-rate-limit';

// ==================== RATE LIMITING ====================

/**
 * Global rate limiter - strict for general endpoints
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ping';
  }
});

/**
 * Search limiter - stricter for search endpoints
 */
export const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Max 30 search requests per windowMs
  message: {
    error: 'Too many search requests',
    info: 'Please wait before making another search'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + search term as key to allow different searches
    return `${req.ip}:${req.query.q || 'no-query'}`;
  }
});

/**
 * Comparison endpoint limiter
 */
export const comparisonLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Max 50 comparison requests
  message: {
    error: 'Too many comparison requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Offer endpoint limiter
 */
export const offerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60, // Max 60 offers requests
  message: {
    error: 'Too many offer requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API key based rate limiter (if using API keys)
 */
export const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // High limit for authenticated API keys
  message: {
    error: 'API rate limit exceeded',
    info: 'You have exceeded your API rate limit'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Apply only if API key is present
    return !req.headers['x-api-key'];
  }
});


// ==================== IP WHITELIST/BLACKLIST ====================

const WHITELISTED_IPS = process.env.WHITELISTED_IPS
  ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim())
  : ['127.0.0.1', 'localhost', '::1'];

const BLACKLISTED_IPS = process.env.BLACKLISTED_IPS
  ? process.env.BLACKLISTED_IPS.split(',').map(ip => ip.trim())
  : [];

/**
 * IP filtering middleware
 */
export function ipFilter(req, res, next) {
  const clientIP = getClientIP(req);

  // Check blacklist first
  if (BLACKLISTED_IPS.includes(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is blocked'
    });
  }

  // If whitelist enabled and IP not in list, check environment
  if (process.env.ENFORCE_IP_WHITELIST === 'true' && 
      WHITELISTED_IPS.length > 0 &&
      !WHITELISTED_IPS.includes(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is not whitelisted'
    });
  }

  next();
}

/**
 * Extract client IP from request
 */
// BUG-30 FIX: req.connection is deprecated since Node.js 13.
// Use req.socket directly.
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}


// ==================== SECURITY HEADERS ====================

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Strict Transport Security
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}


// ==================== REQUEST VALIDATION ====================

/**
 * Validate query parameters
 */
export function validateQueryParams(validParams) {
  return (req, res, next) => {
    const receivedParams = Object.keys(req.query);
    const invalidParams = receivedParams.filter(param => !validParams.includes(param));

    if (invalidParams.length > 0) {
      console.warn(`⚠️  Invalid query parameters: ${invalidParams.join(', ')}`);
      // Log but don't block (for backward compatibility)
    }

    next();
  };
}

/**
 * Input sanitization
 */
export function sanitizeInput(req, res, next) {
  if (req.query.q || req.query.query) {
    const query = req.query.q || req.query.query;
    
    // Remove SQL injection attempts
    if (query.includes(';') || query.includes('--') || query.includes('/*')) {
      return res.status(400).json({
        error: 'Invalid search query',
        message: 'Query contains invalid characters'
      });
    }

    // Limit query length
    if (query.length > 500) {
      return res.status(400).json({
        error: 'Query too long',
        message: 'Search query must be less than 500 characters'
      });
    }
  }

  next();
}


// ==================== REQUEST LOGGING ====================

/**
 * Security event logger
 */
export function logSecurityEvents(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const clientIP = getClientIP(req);

    // Log suspicious requests
    if (res.statusCode >= 400) {
      console.log(`[SECURITY] ${res.statusCode} ${req.method} ${req.path} from ${clientIP} in ${duration}ms`);
    }

    // Log rate limit hits
    if (res.statusCode === 429) {
      console.warn(`[RATE-LIMIT] IP: ${clientIP} - ${req.method} ${req.path}`);
    }
  });

  next();
}


// ==================== API KEY VALIDATION ====================

/**
 * API key middleware
 */
export function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    // API key optional in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required'
    });
  }

  // Validate API key (in production, validate against database)
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validKeys.includes(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  // Attach API key info to request
  req.apiKey = apiKey;
  next();
}


// ==================== DDOS PROTECTION ====================

/**
 * Simple DDOS protection - track request patterns
 */
// BUG-31 FIX: Use a module-scoped Map and interval (not global) to avoid
// memory leaks and ensure the interval can be properly cleared.
const _ipRequestCounts = new Map();
let _ddosResetInterval = null;

function _startDdosInterval() {
  if (_ddosResetInterval) return;
  _ddosResetInterval = setInterval(() => {
    _ipRequestCounts.clear();
  }, 60000);
  // Clean up on process exit so the interval doesn't prevent shutdown
  process.once('exit', () => {
    if (_ddosResetInterval) clearInterval(_ddosResetInterval);
  });
}

export function ddosProtection(req, res, next) {
  const clientIP = getClientIP(req);

  _startDdosInterval();

  const count = _ipRequestCounts.get(clientIP) || 0;

  if (count > 1000) {
    console.error(`[DDOS] Potential DDOS attack from ${clientIP}`);
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Your IP has been temporarily blocked due to excessive requests'
    });
  }

  _ipRequestCounts.set(clientIP, count + 1);
  next();
}


// ==================== ERROR HANDLING ====================

/**
 * Rate limit error handler
 */
export function rateLimitErrorHandler(err, req, res, next) {
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: err.message,
      retryAfter: req.rateLimit?.resetTime
    });
  }

  next(err);
}
