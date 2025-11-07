"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = "", children, ...props }, ref) => {
    const baseStyles = "w-full pl-3 pr-10 py-2 border border-notion-borPri rounded-400 text-sm transition-all duration-200 bg-white appearance-none cursor-pointer";
    const stateStyles = error
      ? "bg-pink-100/40 border-pink-500 focus:border-pink-500 focus:ring-pink-500/40"
      : "hover:border-gray-400 focus:border-blue-600 focus:ring-blue-600/30";
    const focusStyles = "focus:outline-none focus:ring-2";
    const disabledStyles = "disabled:bg-gray-200 disabled:text-text-light disabled:cursor-not-allowed";

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-text-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${baseStyles} ${stateStyles} ${focusStyles} ${disabledStyles} ${className}`}
            {...props}
          >
            {children}
          </select>
          {/* Custom chevron icon - perfectly centered */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4 text-text-light transition-colors duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-pink-500 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-text-light">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
