"use client";

import { HTMLAttributes, ReactNode } from "react";

export interface NotionTableHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
}

const NotionTableHeader = ({
  title,
  description,
  actions,
  children,
  className = "",
  ...props
}: NotionTableHeaderProps) => {
  const containerClasses = ["notion-table-header", className].filter(Boolean).join(" ");

  if (!title && !description) {
    return (
      <div className={containerClasses} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={containerClasses} {...props}>
      <div className="notion-table-header-meta">
        {title && <h2 className="notion-table-title">{title}</h2>}
        {description && (
          <p className="notion-table-description">{description}</p>
        )}
      </div>
      {(actions || children) && (
        <div className="notion-table-actions">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};

export default NotionTableHeader;

