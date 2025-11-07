"use client";

import { HTMLAttributes, forwardRef } from "react";

export interface NotionTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

const NotionTableRow = forwardRef<HTMLTableRowElement, NotionTableRowProps>(
  ({ hoverable = true, className = "", ...props }, ref) => {
    const rowClasses = [
      "notion-table-row",
      hoverable ? "" : "notion-table-row-static",
      className
    ]
      .filter(Boolean)
      .join(" ");

    return <tr ref={ref} className={rowClasses} {...props} />;
  }
);

NotionTableRow.displayName = "NotionTableRow";

export default NotionTableRow;

