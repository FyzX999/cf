/**
 * Flash Sales System - Core Business Logic
 * 
 * Implements time-limited promotional offers with countdown timers
 * and automatic discount application for designated services.
 */

export type FlashSaleStatus = 'scheduled' | 'active' | 'expired';

export interface FlashSale {
  id: string;
  title: string;
  discount: number; // 1-99 representing percentage
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  serviceIds: string[]; // Target service IDs
  status: FlashSaleStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the active flash sale with the highest discount for a given service
 * @param serviceId - The service ID to check for flash sales
 * @param flashSales - Array of all flash sales
 * @returns The active flash sale with highest discount, or null if none
 */
export function getActiveFlashSale(
  serviceId: string,
  flashSales: FlashSale[]
): FlashSale | null {
  const now = new Date();
  
  const activeFlashSales = flashSales.filter(sale => 
    sale.status === 'active' &&
    sale.serviceIds.includes(serviceId) &&
    new Date(sale.startTime) <= now &&
    new Date(sale.endTime) > now
  );

  if (activeFlashSales.length === 0) {
    return null;
  }

  // Return the flash sale with the highest discount
  return activeFlashSales.reduce((highest, current) => 
    current.discount > highest.discount ? current : highest
  );
}

/**
 * Apply flash sale discount to a price
 * @param price - Original price
 * @param discount - Discount percentage (1-99)
 * @returns Discounted price rounded to 2 decimals
 */
export function applyFlashSaleDiscount(price: number, discount: number): number {
  if (discount < 1 || discount > 99) {
    throw new Error('Discount must be between 1 and 99');
  }
  const discounted = price * (1 - discount / 100);
  return Math.round(discounted * 100) / 100;
}

/**
 * Update flash sale statuses based on current server time
 * @param flashSales - Array of flash sales to update
 * @returns Updated array with correct statuses
 */
export function updateFlashSaleStatuses(flashSales: FlashSale[]): FlashSale[] {
  const now = new Date();
  
  return flashSales.map(sale => {
    const startTime = new Date(sale.startTime);
    const endTime = new Date(sale.endTime);
    
    let status: FlashSaleStatus;
    
    if (now < startTime) {
      status = 'scheduled';
    } else if (now >= startTime && now < endTime) {
      status = 'active';
    } else {
      status = 'expired';
    }
    
    return {
      ...sale,
      status,
      updatedAt: now.toISOString()
    };
  });
}

/**
 * Validate flash sale data for creation
 * @param data - Flash sale data to validate
 * @returns Validation result with error message if invalid
 */
export function validateFlashSale(data: Partial<FlashSale>): { valid: boolean; error?: string } {
  if (!data.title || data.title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (typeof data.discount !== 'number' || data.discount < 1 || data.discount > 99) {
    return { valid: false, error: 'Discount must be between 1 and 99' };
  }

  if (!data.startTime) {
    return { valid: false, error: 'Start time is required' };
  }

  if (!data.endTime) {
    return { valid: false, error: 'End time is required' };
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (isNaN(startTime.getTime())) {
    return { valid: false, error: 'Invalid start time format' };
  }

  if (isNaN(endTime.getTime())) {
    return { valid: false, error: 'Invalid end time format' };
  }

  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be after start time' };
  }

  if (!data.serviceIds || data.serviceIds.length === 0) {
    return { valid: false, error: 'At least one service must be selected' };
  }

  return { valid: true };
}

/**
 * Get active flash sales (currently running)
 */
export function getActiveFlashSales(flashSales: FlashSale[]): FlashSale[] {
  const now = new Date();
  return flashSales.filter(sale => 
    sale.status === 'active' &&
    new Date(sale.startTime) <= now &&
    new Date(sale.endTime) > now
  );
}

/**
 * Get scheduled flash sales (not yet started)
 */
export function getScheduledFlashSales(flashSales: FlashSale[]): FlashSale[] {
  const now = new Date();
  return flashSales.filter(sale => 
    sale.status === 'scheduled' &&
    new Date(sale.startTime) > now
  );
}

/**
 * Get expired flash sales
 */
export function getExpiredFlashSales(flashSales: FlashSale[]): FlashSale[] {
  const now = new Date();
  return flashSales.filter(sale => 
    sale.status === 'expired' ||
    new Date(sale.endTime) <= now
  );
}

/**
 * Sort flash sales by start time (descending - newest first)
 */
export function sortFlashSalesByStartTime(flashSales: FlashSale[]): FlashSale[] {
  return [...flashSales].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

/**
 * Calculate time remaining until flash sale ends
 * @param endTime - ISO 8601 end time
 * @returns Remaining time in milliseconds, or 0 if expired
 */
export function getTimeRemaining(endTime: string): number {
  const remaining = new Date(endTime).getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format time remaining as DD:HH:MM:SS or HH:MM:SS or MM:SS
 */
export function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const s = seconds % 60;
  const m = minutes % 60;
  const h = hours % 24;

  if (days > 0) {
    return `${days.toString().padStart(2, '0')}:${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else if (hours > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
