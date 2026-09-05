import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/middleware/auth';
import { readStore, writeStore } from '@/lib/admin-store';
import { validateFlashSale, type FlashSale } from '@/lib/flash-sales';

/**
 * PUT /api/admin/flash-sales/[id]
 * 
 * Update an existing flash sale (admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await withPermission(req, 'commerce.manage');
  if (permissionError) return permissionError;

  try {
    const { id } = params;
    const body = await req.json();
    
    // Validate partial update
    const validation = validateFlashSale(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Load store and find flash sale
    const store = await readStore();
    const flashSales = store.flashSales || [];
    const index = flashSales.findIndex((s: FlashSale) => s.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Flash sale not found' },
        { status: 404 }
      );
    }

    // Update flash sale
    const updatedFlashSale: FlashSale = {
      ...flashSales[index],
      ...body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    flashSales[index] = updatedFlashSale;
    await writeStore({ ...store, flashSales });

    return NextResponse.json({ flashSale: updatedFlashSale });
  } catch (error) {
    console.error('Error updating flash sale:', error);
    return NextResponse.json(
      { error: 'Failed to update flash sale' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/flash-sales/[id]
 * 
 * Delete a flash sale (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const permissionError = await withPermission(req, 'commerce.manage');
  if (permissionError) return permissionError;

  try {
    const { id } = params;
    
    // Load store and remove flash sale
    const store = await readStore();
    const flashSales = store.flashSales || [];
    const filteredFlashSales = flashSales.filter((s: FlashSale) => s.id !== id);
    
    if (flashSales.length === filteredFlashSales.length) {
      return NextResponse.json(
        { error: 'Flash sale not found' },
        { status: 404 }
      );
    }

    await writeStore({ ...store, flashSales: filteredFlashSales });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flash sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete flash sale' },
      { status: 500 }
    );
  }
}