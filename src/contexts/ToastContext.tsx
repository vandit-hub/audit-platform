"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast, ToastType, ToastContainer } from "@/components/Toast";

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const showToast = (message: string, type: ToastType, duration?: number) => {
    const id = generateId();
    const toast: Toast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [toast, ...prev]);
  };

  const showSuccess = (message: string, duration?: number) => {
    showToast(message, "success", duration);
  };

  const showError = (message: string, duration?: number) => {
    showToast(message, "error", duration);
  };

  const showInfo = (message: string, duration?: number) => {
    showToast(message, "info", duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        removeToast
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}