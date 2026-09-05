import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase';
import { calculateOrderStats } from '@/lib/order-counter';
import { readStore } from '@/lib/admin-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats
 * 
 * Public endpoint to get order statistics for social proof
 */
export async function GET() {
  try {
    const store = await readStore();
    const baseCount = store.settings.baseOrderCount || 0;
    
    const db = createServiceSupabase();
    
    if (!db) {
      // Fallback to base count + mock data if Supabase not configured
      return NextResponse.json({
        totalOrders: baseCount + 12847,
        ordersToday: 156,
        ordersThisWeek: 892,
        ordersThisMonth: 3421,
        lastUpdated: new Date().toISOString()
      });
    }

    // Get orders from last 30 days for statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentOrders } = await db
      .from('orders')
      .select('id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get total order count
    const { count: totalCount } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const orders = (recentOrders || []).map(o => ({
      createdAt: o.created_at
    }));

    const stats = calculateOrderStats(orders);
    stats.totalOrders = (totalCount || 0) + baseCount;

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    const store = await readStore();
    const baseCount = store.settings.baseOrderCount || 0;
    
    // Return base count + mock data on error
    return NextResponse.json({
      totalOrders: baseCount + 12500,
      ordersToday: 150,
      ordersThisWeek: 850,
      ordersThisMonth: 3400,
      lastUpdated: new Date().toISOString()
    });
  }
}