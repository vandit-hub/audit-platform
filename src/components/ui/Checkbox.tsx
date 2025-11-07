"use client";

import { InputHTMLAttributes, forwardRef } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        type="checkbox"
        className={`notion-checkbox ${className}`}
        {...props}
      />
    );

    if (!label) {
      return input;
    }

    return (
      <label className="inline-flex items-center gap-2 text-sm text-text-medium">
        {input}
        <span>{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;

