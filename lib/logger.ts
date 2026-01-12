/**
 * Debug logging utility
 * Per user rules: "funnel logs through debug; remove console.log in prod via build step"
 * 
 * Uses the 'debug' package for structured logging. Enable logs by setting:
 * DEBUG=bennopi:* (for all logs)
 * DEBUG=bennopi:api (for API logs only)
 * DEBUG=bennopi:auth (for auth logs only)
 * etc.
 */

// Dynamic import to avoid issues if debug is not installed
let debug: any;
try {
  debug = require('debug');
} catch {
  // Fallback if debug package is not installed
  debug = (namespace: string) => {
    const log = (...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[${namespace}]`, ...args);
      }
    };
    log.enabled = process.env.NODE_ENV === 'development';
    return log;
  };
}

// Create namespaced loggers
export const logger = {
  api: debug('bennopi:api'),
  auth: debug('bennopi:auth'),
  db: debug('bennopi:db'),
  error: debug('bennopi:error'),
  info: debug('bennopi:info'),
  middleware: debug('bennopi:middleware'),
};

/**
 * Log API request/response with full context
 * Per user rules: "log failures with full request/response context"
 */
export interface ApiLogContext {
  method?: string;
  url?: string;
  userId?: string;
  request?: any;
  response?: any;
  error?: Error;
  duration?: number;
  [key: string]: any;
}

export function logApiCall(context: ApiLogContext) {
  const { method, url, userId, request, response, error, duration, ...extra } = context;
  
  if (error) {
    logger.error('API Error:', {
      method,
      url,
      userId,
      request: request ? JSON.stringify(request, null, 2) : undefined,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      duration,
      ...extra,
    });
  } else {
    logger.api('API Call:', {
      method,
      url,
      userId,
      request: request ? JSON.stringify(request, null, 2) : undefined,
      response: response ? JSON.stringify(response, null, 2) : undefined,
      duration,
      ...extra,
    });
  }
}

/**
 * Log database operation with full context
 */
export interface DbLogContext {
  operation: string;
  table?: string;
  userId?: string;
  query?: any;
  result?: any;
  error?: Error;
  duration?: number;
  [key: string]: any;
}

export function logDbOperation(context: DbLogContext) {
  const { operation, table, userId, query, result, error, duration, ...extra } = context;
  
  if (error) {
    logger.db('DB Error:', {
      operation,
      table,
      userId,
      query: query ? JSON.stringify(query, null, 2) : undefined,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      duration,
      ...extra,
    });
  } else {
    logger.db('DB Operation:', {
      operation,
      table,
      userId,
      query: query ? JSON.stringify(query, null, 2) : undefined,
      resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
      duration,
      ...extra,
    });
  }
}

/**
 * Log authentication events
 */
export interface AuthLogContext {
  event: string;
  userId?: string;
  email?: string;
  error?: Error;
  [key: string]: any;
}

export function logAuthEvent(context: AuthLogContext) {
  const { event, userId, email, error, ...extra } = context;
  
  if (error) {
    logger.auth('Auth Error:', {
      event,
      userId,
      email,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...extra,
    });
  } else {
    logger.auth('Auth Event:', {
      event,
      userId,
      email,
      ...extra,
    });
  }
}
