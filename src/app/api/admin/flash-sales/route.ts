import { NextRequest, NextResponse } from 'next/server';
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { readStore, writeStore } from '@/lib/admin-store';
import { validateFlashSale, updateFlashSaleStatuses, type FlashSale } from '@/lib/flash-sales';
import { randomUUID } from 'crypto';

/**
 * Verify admin authentication
 */
async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(adminCookieName())?.value;
  const isValid = await isValidAdminSession(token);
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/admin/flash-sales
 * 
 * Get all flash sales (admin only)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

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
  const authError = await requireAdmin(req);
  if (authError) return authError;

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
    await writeStore((store) => ({
      ...store,
      flashSales: [...(store.flashSales || []), flashSale]
    }));

    return NextResponse.json({ flashSale }, { status: 201 });
  } catch (error) {
    console.error('Error creating flash sale:', error);
    return NextResponse.json(
      { error: 'Failed to create flash sale' },
      { status: 500 }
    );
  }
}