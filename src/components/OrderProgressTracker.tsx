"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Clock, CheckCircle, TrendingUp } from "lucide-react";

interface OrderProgress {
  order_id: string;
  progress_percent: number;
  current_delivered: number;
  target_quantity: number;
  estimated_completion_at: string;
  status: string;
}

export function OrderProgressTracker({ orderId, publicId }: { orderId?: string; publicId?: string }) {
  const [progress, setProgress] = useState<OrderProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();

    // Refresh every 30 seconds
    const interval = setInterval(loadProgress, 30000);
    return () => clearInterval(interval);
  }, [orderId, publicId]);

  async function loadProgress() {
    try {
      const params = new URLSearchParams();
      if (orderId) params.append("orderId", orderId);
      if (publicId) params.append("publicId", publicId);

      const res = await fetch(`/api/order-progress?${params}`);
      const data = await res.json();
      setProgress(data);
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="h-8 bg-white/10 rounded animate-pulse" />
        <div className="h-4 bg-white/10 rounded animate-pulse" />
      </motion.div>
    );
  }

  if (!progress) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-white/50"
      >
        Tracking will start soon...
      </motion.p>
    );
  }

  const isCompleted = progress.progress_percent === 100;
  const estimatedDate = progress.estimated_completion_at
    ? new Date(progress.estimated_completion_at)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg p-6"
    >
      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <TrendingUp className="w-5 h-5 text-[#3ddc97]" />
              </motion.div>
            )}
            <span className="text-white font-semibold">
              {isCompleted ? "Completed" : "In Progress"}
            </span>
          </div>
          <motion.span
            className="text-2xl font-bold text-[#3ddc97]"
            key={progress.progress_percent}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {progress.progress_percent}%
          </motion.span>
        </div>

        {/* Progress Bar Animation */}
        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#3ddc97] to-[#3ddc97]/50"
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress_percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="bg-black/50 rounded-lg p-4 border border-white/5">
          <p className="text-white/60 text-sm mb-1">Delivered</p>
          <motion.p
            className="text-2xl font-bold text-[#3ddc97]"
            key={progress.current_delivered}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {progress.current_delivered.toLocaleString()}
          </motion.p>
        </div>

        <div className="bg-black/50 rounded-lg p-4 border border-white/5">
          <p className="text-white/60 text-sm mb-1">Remaining</p>
          <motion.p
            className="text-2xl font-bold text-white"
            key={progress.target_quantity - progress.current_delivered}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            {(progress.target_quantity - progress.current_delivered).toLocaleString()}
          </motion.p>
        </div>
      </motion.div>

      {/* Target */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-black/50 rounded-lg p-4 border border-white/5"
      >
        <p className="text-white/60 text-sm mb-1">Target Quantity</p>
        <p className="text-lg font-bold text-white">
          {progress.target_quantity.toLocaleString()} units
        </p>
      </motion.div>

      {/* Estimated Completion */}
      {estimatedDate && !isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-semibold">Estimated Completion</p>
            <p className="text-white/60 text-sm">
              {estimatedDate.toLocaleDateString()} at{" "}
              {estimatedDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </motion.div>
      )}

      {/* Completion Message */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-4"
          >
            <motion.p
              className="text-green-400 font-semibold text-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✓ Your order is complete!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={loadProgress}
        className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-white/60 hover:text-white transition-all text-sm font-medium"
      >
        Refresh Status
      </motion.button>
    </motion.div>
  );
}
