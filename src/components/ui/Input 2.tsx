"use client";

import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    // S-Tier: Enhanced transitions, better focus rings, improved padding
    const baseStyles = "w-full px-3.5 py-2.5 border rounded-lg text-sm transition-all duration-200 ease-out shadow-sm";
    const stateStyles = error
      ? "border-error-300 bg-error-50 focus:border-error-500 focus:ring-error-100"
      : "border-neutral-300 bg-white hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-100";
    // S-Tier: Enhanced focus ring (ring-4 instead of ring-2)
    const focusStyles = "focus:outline-none focus:ring-4";
    const disabledStyles = "disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:shadow-none";

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${stateStyles} ${focusStyles} ${disabledStyles} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-error-600 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
