'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining, formatTimeRemaining } from '@/lib/flash-sales';
import { clsx } from '@/lib/format';

interface CountdownTimerProps {
  endTime: string; // ISO 8601
  onExpire?: () => void;
  variant?: 'default' | 'compact' | 'large';
  className?: string;
}

export function CountdownTimer({ 
  endTime, 
  onExpire, 
  variant = 'default',
  className 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(() => getTimeRemaining(endTime));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(endTime);
      setTimeRemaining(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  // Avoid hydration mismatch by showing placeholder until mounted
  if (!mounted) {
    return (
      <div className={clsx(
        'font-mono tabular-nums',
        variant === 'large' && 'text-3xl font-bold',
        variant === 'default' && 'text-xl font-semibold',
        variant === 'compact' && 'text-base font-medium',
        className
      )}>
        --:--:--
      </div>
    );
  }

  const isUrgent = timeRemaining < 3600000; // Less than 1 hour
  const formatted = formatTimeRemaining(timeRemaining);

  if (timeRemaining === 0) {
    return (
      <div className={clsx(
        'font-mono tabular-nums text-gray-500',
        variant === 'large' && 'text-3xl font-bold',
        variant === 'default' && 'text-xl font-semibold',
        variant === 'compact' && 'text-base font-medium',
        className
      )}>
        Expired
      </div>
    );
  }

  return (
    <div className={clsx(
      'font-mono tabular-nums',
      isUrgent && 'text-red-500 animate-pulse',
      !isUrgent && 'text-orange-400',
      variant === 'large' && 'text-3xl font-bold',
      variant === 'default' && 'text-xl font-semibold',
      variant === 'compact' && 'text-base font-medium',
      className
    )}>
      {formatted}
    </div>
  );
}