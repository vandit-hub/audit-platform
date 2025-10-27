/**
 * Agent Error Categorization Module
 *
 * Categorizes errors from the agent chat API and provides appropriate
 * HTTP status codes and user-friendly messages.
 */

export enum AgentErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  AGENT_SERVICE = 'AGENT_SERVICE',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

export interface CategorizedError {
  category: AgentErrorCategory;
  statusCode: number;
  userMessage: string;
  logMessage: string;
  originalError?: unknown;
}

export function categorizeError(error: unknown): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Authentication errors (401)
  if (
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('session') ||
    errorMessage.includes('token')
  ) {
    return {
      category: AgentErrorCategory.AUTHENTICATION,
      statusCode: 401,
      userMessage: 'You are not authenticated. Please log in and try again.',
      logMessage: `Authentication error: ${errorMessage}`,
      originalError: error
    };
  }

  // Authorization errors (403)
  if (
    errorMessage.includes('Forbidden') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('not authorized') ||
    errorMessage.includes('access denied')
  ) {
    return {
      category: AgentErrorCategory.AUTHORIZATION,
      statusCode: 403,
      userMessage: 'You do not have permission to perform this action.',
      logMessage: `Authorization error: ${errorMessage}`,
      originalError: error
    };
  }

  // Validation errors (400)
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('must be')
  ) {
    return {
      category: AgentErrorCategory.VALIDATION,
      statusCode: 400,
      userMessage: 'Invalid request. Please check your input and try again.',
      logMessage: `Validation error: ${errorMessage}`,
      originalError: error
    };
  }

  // Rate limit errors (429)
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('quota exceeded')
  ) {
    return {
      category: AgentErrorCategory.RATE_LIMIT,
      statusCode: 429,
      userMessage: 'You have sent too many requests. Please wait a moment and try again.',
      logMessage: `Rate limit error: ${errorMessage}`,
      originalError: error
    };
  }

  // Database errors (500)
  if (
    errorMessage.includes('prisma') ||
    errorMessage.includes('database') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('query failed') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      category: AgentErrorCategory.DATABASE,
      statusCode: 500,
      userMessage: 'A database error occurred. Our team has been notified. Please try again later.',
      logMessage: `Database error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Agent service errors (500)
  if (
    errorMessage.includes('anthropic') ||
    errorMessage.includes('claude') ||
    errorMessage.includes('AI') ||
    errorMessage.includes('model') ||
    errorMessage.includes('API key')
  ) {
    return {
      category: AgentErrorCategory.AGENT_SERVICE,
      statusCode: 500,
      userMessage: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      logMessage: `Agent service error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Network errors (503)
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('fetch failed')
  ) {
    return {
      category: AgentErrorCategory.NETWORK,
      statusCode: 503,
      userMessage: 'Network error. Please check your connection and try again.',
      logMessage: `Network error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Unknown errors (500)
  return {
    category: AgentErrorCategory.UNKNOWN,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again later.',
    logMessage: `Unknown error: ${errorMessage}\nStack: ${errorStack}`,
    originalError: error
  };
}
