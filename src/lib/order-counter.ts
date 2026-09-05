/**
 * Live Order Counter - Social Proof Display
 * 
 * Displays real-time order count to build trust and create urgency
 */

export interface OrderStats {
  totalOrders: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  lastUpdated: string;
}

/**
 * Get order count from a date
 */
export function getOrderCountSince(orders: any[], sinceDate: Date): number {
  return orders.filter(order => {
    const orderDate = new Date(order.createdAt || order.timestamp);
    return orderDate >= sinceDate;
  }).length;
}

/**
 * Calculate order statistics
 */
export function calculateOrderStats(orders: any[]): OrderStats {
  const now = new Date();
  
  // Start of today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  // Start of this week (Monday)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Start of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    totalOrders: orders.length,
    ordersToday: getOrderCountSince(orders, startOfToday),
    ordersThisWeek: getOrderCountSince(orders, startOfWeek),
    ordersThisMonth: getOrderCountSince(orders, startOfMonth),
    lastUpdated: now.toISOString()
  };
}

/**
 * Format large numbers with commas
 */
export function formatOrderCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Get display message based on count
 */
export function getOrderCountMessage(count: number): string {
  if (count === 0) return 'Be the first to order!';
  if (count === 1) return '1 order placed recently';
  if (count < 10) return `${count} orders placed recently`;
  if (count < 100) return `${count}+ orders placed recently`;
  return `${formatOrderCount(count)}+ happy customers`;
}