import { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    // S-Tier: More generous vertical padding, soft background, larger icon
    <div className="text-center py-16 px-6 bg-neutral-50 rounded-xl">
      {icon && (
        // S-Tier: Larger icon container (120px+ recommended)
        <div className="flex justify-center mb-6 text-neutral-300 [&>svg]:h-20 [&>svg]:w-20">
          {icon}
        </div>
      )}
      {/* S-Tier: Better typography hierarchy */}
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{title}</h3>
      {description && (
        <p className="text-base text-neutral-600 mb-8 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
