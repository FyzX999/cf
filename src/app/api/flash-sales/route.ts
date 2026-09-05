import { NextRequest, NextResponse } from 'next/server';
import { getActiveFlashSales, updateFlashSaleStatuses, type FlashSale } from '@/lib/flash-sales';
import { readStore } from '@/lib/admin-store';

/**
 * GET /api/flash-sales
 * 
 * Public endpoint to fetch active flash sales
 * Query params:
 * - serviceId (optional): Filter by specific service
 */
export async function GET(req: NextRequest) {
  try {
    const store = await readStore();
    const flashSales = store.flashSales || [];
    
    // Update statuses based on current time
    const updatedFlashSales = updateFlashSaleStatuses(flashSales);
    
    // Get only active flash sales
    const activeFlashSales = getActiveFlashSales(updatedFlashSales);
    
    // Filter by serviceId if provided
    const serviceId = req.nextUrl.searchParams.get('serviceId');
    const filteredFlashSales = serviceId
      ? activeFlashSales.filter(sale => sale.serviceIds.includes(serviceId))
      : activeFlashSales;
    
    return NextResponse.json({ flashSales: filteredFlashSales });
  } catch (error) {
    console.error('Error fetching flash sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flash sales' },
      { status: 500 }
    );
  }
}
