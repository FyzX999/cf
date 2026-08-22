"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * Toast notification component and context provider
 * 
 * **Validates Requirements:**
 * - 21.1: Display green toast for success operations
 * - 21.2: Display red toast for error operations
 * - 21.3: Auto-dismiss after 5 seconds
 * - 21.4: Include close button for manual dismissal
 * - 21.5: Stack toasts vertically when multiple notifications shown
 */

export interface ToastOptions {
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number; // Default: 5000ms
  dismissible?: boolean; // Default: true
}

interface Toast extends ToastOptions {
  id: string;
  dismissible: boolean;
  duration: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = {
      ...options,
      id,
      dismissible: options.dismissible ?? true,
      duration: options.duration ?? 5000,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss after duration (Requirement 21.3)
    if (toast.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, toast.duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200); // Match animation duration
  };

  // Get colors based on type (Requirements 21.1, 21.2)
  const getColors = () => {
    switch (toast.type) {
      case "success":
        return "bg-[#3ddc97]/10 border-[#3ddc97]/20 text-[#3ddc97]";
      case "error":
        return "bg-[#f07167]/10 border-[#f07167]/20 text-[#f07167]";
      case "warning":
        return "bg-[#ffd93d]/10 border-[#ffd93d]/20 text-[#ffd93d]";
      case "info":
        return "bg-[#6ea8ff]/10 border-[#6ea8ff]/20 text-[#6ea8ff]";
      default:
        return "bg-white/10 border-white/20 text-white";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "info":
        return (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        rounded-lg border px-4 py-3 shadow-lg pointer-events-auto
        flex items-start gap-3 min-w-[300px] max-w-md
        transition-all duration-200
        ${getColors()}
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0 animate-slide-in-right"}
      `}
    >
      {getIcon()}
      <p className="flex-1 text-sm font-medium break-words">{toast.message}</p>
      {/* Requirement 21.4: Close button for manual dismissal */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
