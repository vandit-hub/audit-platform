import { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageTitle({ title, description, actions }: PageTitleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--c-texPri)' }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: 'var(--c-texSec)', fontSize: '15px' }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
