/**
 * CSRF Token Management Module
 * SECURITY: Prevents Cross-Site Request Forgery attacks
 */

export interface CsrfToken {
  token: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

const CSRF_TOKEN_BYTES = 32;
const CSRF_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const csrfStore = new Map<string, CsrfToken>();

// Clean up expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, csrf] of csrfStore.entries()) {
    if (csrf.expiresAt < now) {
      csrfStore.delete(token);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  // Generate 32 bytes of cryptographically random data
  const bytes = crypto.getRandomValues(new Uint8Array(CSRF_TOKEN_BYTES));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  
  const csrfToken: CsrfToken = {
    token,
    sessionId,
    createdAt: Date.now(),
    expiresAt: Date.now() + CSRF_EXPIRY_MS,
  };
  
  csrfStore.set(token, csrfToken);
  return token;
}

/**
 * Verify CSRF token against session
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  const csrf = csrfStore.get(token);
  if (!csrf) return false;
  
  // Check expiration
  if (csrf.expiresAt < Date.now()) {
    csrfStore.delete(token);
    return false;
  }
  
  // Check session binding
  if (csrf.sessionId !== sessionId) return false;
  
  return true;
}

/**
 * Clean up expired tokens (can be called manually)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, csrf] of csrfStore.entries()) {
    if (csrf.expiresAt < now) {
      csrfStore.delete(token);
    }
  }
}

/**
 * Get CSRF token from request headers
 */
export function getCsrfTokenFromRequest(req: Request): string | null {
  // Check X-CSRF-Token header (standard for AJAX requests)
  const headerToken = req.headers.get('X-CSRF-Token') || req.headers.get('x-csrf-token');
  if (headerToken) return headerToken;
  
  // Check Authorization header for Bearer token (alternative)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('CSRF ')) {
    return authHeader.slice(5);
  }
  
  return null;
}

/**
 * Invalidate all CSRF tokens for a session (e.g., on logout)
 */
export function invalidateSessionTokens(sessionId: string): void {
  for (const [token, csrf] of csrfStore.entries()) {
    if (csrf.sessionId === sessionId) {
      csrfStore.delete(token);
    }
  }
}
