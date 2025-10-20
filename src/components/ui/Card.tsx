import { HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = "md", hover = false, className = "", children, ...props }, ref) => {
    // S-Tier: Enhanced shadows, smooth transitions, subtle hover lift
    const baseStyles = "bg-white rounded-lg shadow-sm border border-neutral-200";
    const hoverStyles = hover
      ? "transition-all duration-250 ease-out hover:shadow-lg hover:-translate-y-0.5"
      : "";

    // S-Tier: More generous padding (md=6, lg=8 instead of 4, 6)
    const paddings = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${hoverStyles} ${paddings[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
