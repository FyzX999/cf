/**
 * Security Event Logging System
 * SECURITY: Comprehensive audit trail for security-relevant events
 */

export type SecurityEventType = 
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.session.invalid'
  | 'rate_limit.exceeded'
  | 'rate_limit.blocked'
  | 'input.validation.failure'
  | 'payment.webhook.received'
  | 'payment.webhook.invalid'
  | 'payment.amount.mismatch'
  | 'admin.settings.changed'
  | 'admin.service.modified'
  | 'order.status.changed'
  | 'order.enumeration.detected'
  | 'csrf.validation.failure'
  | 'sql_injection.attempt'
  | 'xss.attempt';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  actor: string;  // user ID, IP, or 'system'
  target?: string;  // order ID, setting name, etc.
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

const RETENTION_DAYS = 90;
const MAX_EVENTS_IN_MEMORY = 10000;

/**
 * Hash PII for secure logging
 */
async function hashPii(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask IP address (keep first 2 octets for IPv4)
 */
export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // IPv4
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6 or unknown - mask more aggressively
  if (ip.includes(':')) {
    const segments = ip.split(':');
    return `${segments[0]}:${segments[1]}:****`;
  }
  return '***';
}

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  
  // Log to console for immediate visibility (in development and production)
  console.log('[Security Event]', JSON.stringify({
    type: securityEvent.type,
    actor: securityEvent.actor,
    target: securityEvent.target,
    timestamp: securityEvent.timestamp,
    // Mask IP address in logs
    ipAddress: securityEvent.ipAddress ? maskIp(securityEvent.ipAddress) : undefined,
  }, null, 2));
  
  // Store in admin store (async, non-blocking)
  storeSecurityEvent(securityEvent).catch(err => {
    console.error('[Security Logger] Failed to store event:', err);
  });
}

/**
 * Store security event in admin store
 */
async function storeSecurityEvent(event: SecurityEvent): Promise<void> {
  // Dynamically import to avoid circular dependencies
  const { readStore, writeStore } = await import('./admin-store.js');
  
  const store = await readStore();
  
  // Initialize security log if it doesn't exist
  if (!store.securityLog) {
    store.securityLog = {
      events: [],
      retentionDays: RETENTION_DAYS,
    };
  }
  
  // Add new event
  store.securityLog.events.push(event);
  
  // Enforce retention policy and max size
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - store.securityLog.retentionDays);
  const cutoffTimestamp = cutoffDate.toISOString();
  
  store.securityLog.events = store.securityLog.events
    .filter((e: SecurityEvent) => e.timestamp >= cutoffTimestamp)
    .slice(-MAX_EVENTS_IN_MEMORY); // Keep only most recent events
  
  await writeStore(store);
}

/**
 * Get recent security events (for admin dashboard)
 */
export async function getRecentEvents(limit = 100): Promise<SecurityEvent[]> {
  const { loadAdminStore } = await import('./admin-store.js');
  const store = await readStore();
  
  if (!store.securityLog) {
    return [];
  }
  
  return store.securityLog.events
    .slice(-limit)
    .reverse(); // Most recent first
}

/**
 * Get events by type
 */
export async function getEventsByType(type: SecurityEventType, limit = 100): Promise<SecurityEvent[]> {
  const { loadAdminStore } = await import('./admin-store.js');
  const store = await readStore();
  
  if (!store.securityLog) {
    return [];
  }
  
  return store.securityLog.events
    .filter((e: SecurityEvent) => e.type === type)
    .slice(-limit)
    .reverse();
}

/**
 * Get events by actor
 */
export async function getEventsByActor(actor: string, limit = 100): Promise<SecurityEvent[]> {
  const { loadAdminStore } = await import('./admin-store.js');
  const store = await readStore();
  
  if (!store.securityLog) {
    return [];
  }
  
  return store.securityLog.events
    .filter((e: SecurityEvent) => e.actor === actor)
    .slice(-limit)
    .reverse();
}

/**
 * Search events with filters
 */
export async function searchEvents(filters: {
  type?: SecurityEventType;
  actor?: string;
  target?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<SecurityEvent[]> {
  const { loadAdminStore } = await import('./admin-store.js');
  const store = await readStore();
  
  if (!store.securityLog) {
    return [];
  }
  
  let events = store.securityLog.events;
  
  if (filters.type) {
    events = events.filter((e: SecurityEvent) => e.type === filters.type);
  }
  
  if (filters.actor) {
    events = events.filter((e: SecurityEvent) => e.actor === filters.actor);
  }
  
  if (filters.target) {
    events = events.filter((e: SecurityEvent) => e.target === filters.target);
  }
  
  if (filters.startDate) {
    events = events.filter((e: SecurityEvent) => e.timestamp >= filters.startDate!);
  }
  
  if (filters.endDate) {
    events = events.filter((e: SecurityEvent) => e.timestamp <= filters.endDate!);
  }
  
  const limit = filters.limit || 100;
  return events.slice(-limit).reverse();
}
