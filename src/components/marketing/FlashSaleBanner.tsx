'use client';

import { useEffect, useState } from 'react';
import { CountdownTimer } from './CountdownTimer';
import { type FlashSale } from '@/lib/flash-sales';
import { clsx } from '@/lib/format';

interface FlashSaleBannerProps {
  serviceId?: string;
  placement?: 'homepage' | 'service-page';
  className?: string;
}

export function FlashSaleBanner({ 
  serviceId, 
  placement = 'homepage',
  className 
}: FlashSaleBannerProps) {
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlashSale();
  }, [serviceId]);

  async function fetchFlashSale() {
    try {
      const url = serviceId 
        ? `/api/flash-sales?serviceId=${serviceId}`
        : '/api/flash-sales';
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.flashSales && data.flashSales.length > 0) {
        // Get the flash sale with highest discount
        const highest = data.flashSales.reduce((max: FlashSale, current: FlashSale) => 
          current.discount > max.discount ? current : max
        );
        setFlashSale(highest);
      }
    } catch (error) {
      console.error('Error fetching flash sale:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExpire() {
    setFlashSale(null);
  }

  if (loading || !flashSale) {
    return null;
  }

  const isHomepage = placement === 'homepage';

  return (
    <div className={clsx(
      'rounded-lg p-4 md:p-6',
      'bg-gradient-to-r from-red-600 to-orange-600',
      'border border-red-500/20',
      'shadow-lg shadow-red-900/20',
      className
    )}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              ⚡ FLASH SALE
            </span>
            <span className="text-2xl font-bold text-white">
              {flashSale.discount}% OFF
            </span>
          </div>
          <h3 className={clsx(
            'font-bold text-white',
            isHomepage ? 'text-lg md:text-xl' : 'text-base md:text-lg'
          )}>
            {flashSale.title}
          </h3>
          {isHomepage && (
            <p className="text-sm text-white/80 mt-1">
              Limited time offer • Hurry before it expires!
            </p>
          )}
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-1">
          <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
            Ends in
          </span>
          <CountdownTimer 
            endTime={flashSale.endTime}
            onExpire={handleExpire}
            variant={isHomepage ? 'large' : 'default'}
            className="text-white drop-shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
