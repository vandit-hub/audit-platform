"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastComponentProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastComponent({ toast, onRemove }: ToastComponentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, toast.duration || 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [toast, onRemove]);

  const baseClasses = "w-full p-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform";

  const typeClasses = {
    success: "bg-green-50 text-green-800 border border-green-200",
    error: "bg-red-50 text-red-800 border border-red-200",
    info: "bg-blue-50 text-blue-800 border border-blue-200"
  };

  const iconClasses = {
    success: "text-green-400",
    error: "text-red-400",
    info: "text-blue-400"
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <div
      className={`${baseClasses} ${typeClasses[toast.type]} ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${iconClasses[toast.type]}`}>
          {icons[toast.type]}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(toast.id), 300);
          }}
          className="ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none max-w-md">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}