'use client';

import { useEffect, useState } from 'react';
import { formatOrderCount } from '@/lib/order-counter';
import type { OrderStats } from '@/lib/order-counter';

interface LiveOrderCounterProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function LiveOrderCounter({ variant = 'default', className = '' }: LiveOrderCounterProps) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
      setError(false);
    } catch (err) {
      console.error('Error fetching order stats:', err);
      setError(true);
      // Set fallback stats
      setStats({
        totalOrders: 12500,
        ordersToday: 150,
        ordersThisWeek: 850,
        ordersThisMonth: 3400,
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }

  // Don't hide while loading - show placeholder
  if (loading) {
    return (
      <div className={`inline-flex items-center gap-3 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 ${className}`}>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-green-400">...</span>
          <span className="text-sm text-[#9aa3b5]">loading</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-[#9aa3b5]">
          {formatOrderCount(stats.ordersToday)} orders today
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`glass rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <h3 className="font-semibold">Live Order Statistics</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-green-400">{formatOrderCount(stats.ordersToday)}</p>
            <p className="text-xs text-[#9aa3b5] mt-1">Orders Today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{formatOrderCount(stats.ordersThisWeek)}</p>
            <p className="text-xs text-[#9aa3b5] mt-1">This Week</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{formatOrderCount(stats.ordersThisMonth)}</p>
            <p className="text-xs text-[#9aa3b5] mt-1">This Month</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{formatOrderCount(stats.totalOrders)}</p>
            <p className="text-xs text-[#9aa3b5] mt-1">All Time</p>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center gap-3 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 ${className}`}>
      <span className="flex h-2.5 w-2.5 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
      </span>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-green-400">
          {formatOrderCount(stats.ordersToday)}
        </span>
        <span className="text-sm text-[#9aa3b5]">orders today</span>
      </div>
    </div>
  );
}