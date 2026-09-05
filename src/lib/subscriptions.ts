/**
 * Auto-Reorder Subscriptions System - Core Business Logic
 * 
 * Implements recurring order system with automatic processing,
 * wallet deduction, and subscription management.
 */

export type SubscriptionFrequency = 'weekly' | 'bi-weekly' | 'monthly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'insufficient_funds';

export interface Subscription {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  discountPercent: number; // Default 15%
  nextOrderDate: string; // ISO 8601
  lastOrderDate?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
  pauseReason?: string;
}

/**
 * Calculate the next order date based on frequency
 */
export function calculateNextOrderDate(frequency: SubscriptionFrequency, fromDate: Date = new Date()): Date {
  const nextDate = new Date(fromDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setDate(nextDate.getDate() + 30);
      break;
  }
  
  return nextDate;
}

/**
 * Calculate subscription price with discount
 */
export function calculateSubscriptionPrice(basePrice: number, quantity: number, discountPercent: number = 15): number {
  const subtotal = basePrice * quantity;
  const discounted = subtotal * (1 - discountPercent / 100);
  return Math.round(discounted * 100) / 100;
}

/**
 * Validate subscription data
 */
export function validateSubscription(data: Partial<Subscription>): { valid: boolean; error?: string } {
  if (!data.serviceId || data.serviceId.trim().length === 0) {
    return { valid: false, error: 'Service ID is required' };
  }

  if (!data.quantity || data.quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  if (!data.frequency) {
    return { valid: false, error: 'Frequency is required' };
  }

  const validFrequencies: SubscriptionFrequency[] = ['weekly', 'bi-weekly', 'monthly'];
  if (!validFrequencies.includes(data.frequency as SubscriptionFrequency)) {
    return { valid: false, error: 'Invalid frequency' };
  }

  return { valid: true };
}

/**
 * Get subscriptions that are due for processing
 */
export function getDueSubscriptions(subscriptions: Subscription[]): Subscription[] {
  const now = new Date();
  
  return subscriptions.filter(sub => 
    sub.status === 'active' &&
    new Date(sub.nextOrderDate) <= now
  );
}

/**
 * Get active subscriptions for a user
 */
export function getActiveSubscriptions(subscriptions: Subscription[], userId: string): Subscription[] {
  return subscriptions.filter(sub => 
    sub.userId === userId &&
    sub.status === 'active'
  );
}

/**
 * Pause a subscription
 */
export function pauseSubscription(subscription: Subscription, reason?: string): Subscription {
  return {
    ...subscription,
    status: 'paused',
    pauseReason: reason,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Resume a subscription
 */
export function resumeSubscription(subscription: Subscription): Subscription {
  return {
    ...subscription,
    status: 'active',
    pauseReason: undefined,
    // Recalculate next order date from now
    nextOrderDate: calculateNextOrderDate(subscription.frequency).toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Cancel a subscription
 */
export function cancelSubscription(subscription: Subscription): Subscription {
  return {
    ...subscription,
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update subscription after successful order
 */
export function updateAfterOrder(subscription: Subscription): Subscription {
  const now = new Date();
  return {
    ...subscription,
    lastOrderDate: now.toISOString(),
    nextOrderDate: calculateNextOrderDate(subscription.frequency, now).toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * Format frequency for display
 */
export function formatFrequency(frequency: SubscriptionFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'Every week';
    case 'bi-weekly':
      return 'Every 2 weeks';
    case 'monthly':
      return 'Every month';
  }
}

/**
 * Get days until next order
 */
export function getDaysUntilNextOrder(nextOrderDate: string): number {
  const now = new Date();
  const next = new Date(nextOrderDate);
  const diffMs = next.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}