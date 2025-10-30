/**
 * Agent Configuration Module
 *
 * Centralized configuration for AI agent features with environment
 * variable support and sensible defaults.
 */

export interface AgentConfig {
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  features: {
    streaming: boolean;
    auditLogging: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Parse boolean from environment variable
 * Handles 'true', 'false', '1', '0' strings
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse integer from environment variable
 */
function parseIntValue(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse log level from environment variable
 */
function parseLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  if (!value) return 'info';
  const lower = value.toLowerCase();
  if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error') {
    return lower;
  }
  return 'info';
}

/**
 * Agent configuration object
 *
 * All values can be overridden via environment variables.
 * Defaults are production-safe and suitable for MVP deployment.
 */
export const agentConfig: AgentConfig = {
  // Rate limiting configuration
  rateLimit: {
    // Maximum requests per user per window (default: 20)
    requests: parseIntValue(process.env.AGENT_RATE_LIMIT_REQUESTS, 20),

    // Time window in milliseconds (default: 60000 = 1 minute)
    windowMs: parseIntValue(process.env.AGENT_RATE_LIMIT_WINDOW_MS, 60000)
  },

  // Feature flags
  features: {
    // Enable Server-Sent Events streaming (default: true)
    streaming: parseBoolean(process.env.AGENT_STREAMING_ENABLED, true),

    // Enable audit event logging to database (default: true)
    auditLogging: parseBoolean(process.env.AGENT_AUDIT_LOGGING_ENABLED, true)
  },

  // Logging configuration
  logging: {
    // Log level: debug, info, warn, error (default: info)
    level: parseLogLevel(process.env.LOG_LEVEL)
  }
};
