import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div 
      className={`w-full pl-16 pr-6 py-8 mx-0 max-w-none ${className}`}
      style={{ background: 'var(--c-bacPri)' }}
    >
      {children}
    </div>
  );
}
