"use client";

import { forwardRef, TableHTMLAttributes } from "react";

export interface NotionTableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  density?: "comfortable" | "compact";
}

const NotionTable = forwardRef<HTMLTableElement, NotionTableProps>(
  (
    {
      wrapperClassName = "",
      className = "",
      children,
      density = "comfortable",
      ...tableProps
    },
    ref
  ) => {
    const wrapperClasses = ["notion-table-wrapper", wrapperClassName]
      .filter(Boolean)
      .join(" ");
    const tableClasses = ["notion-database", className].filter(Boolean).join(" ");

    return (
      <div className={wrapperClasses}>
        <table ref={ref} className={tableClasses} data-density={density} {...tableProps}>
          {children}
        </table>
      </div>
    );
  }
);

NotionTable.displayName = "NotionTable";

export default NotionTable;

