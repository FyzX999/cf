import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/middleware/auth';
import { readStore, writeStore } from '@/lib/admin-store';
import { validateFlashSale, updateFlashSaleStatuses, type FlashSale } from '@/lib/flash-sales';
import { randomUUID } from 'crypto';

/**
 * GET /api/admin/flash-sales
 * 
 * Get all flash sales (admin only)
 */
export async function GET(req: NextRequest) {
  const permissionError = await withPermission(req, 'commerce.manage');
  if (permissionError) return permissionError;

  try {
    const store = await readStore();
    const flashSales = store.flashSales || [];
    
    // Update statuses based on current time
    const updatedFlashSales = updateFlashSaleStatuses(flashSales);
    
    return NextResponse.json({ flashSales: updatedFlashSales });
  } catch (error) {
    console.error('Error fetching flash sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flash sales' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/flash-sales
 * 
 * Create a new flash sale (admin only)
 */
export async function POST(req: NextRequest) {
  const permissionError = await withPermission(req, 'commerce.manage');
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    
    // Validate flash sale data
    const validation = validateFlashSale(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Generate unique ID
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // Determine initial status
    const startTime = new Date(body.startTime);
    const currentTime = new Date();
    const status = startTime <= currentTime ? 'active' : 'scheduled';

    const flashSale: FlashSale = {
      id,
      title: body.title,
      discount: body.discount,
      startTime: body.startTime,
      endTime: body.endTime,
      serviceIds: body.serviceIds,
      status,
      createdAt: now,
      updatedAt: now
    };

    // Store in admin-store
    const store = await readStore();
    const flashSales = store.flashSales || [];
    flashSales.push(flashSale);
    await writeStore({ ...store, flashSales });

    return NextResponse.json({ flashSale }, { status: 201 });
  } catch (error) {
    console.error('Error creating flash sale:', error);
    return NextResponse.json(
      { error: 'Failed to create flash sale' },
      { status: 500 }
    );
  }
}
