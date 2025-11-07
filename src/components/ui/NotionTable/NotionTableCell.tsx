"use client";

import { forwardRef } from "react";
import type {
  TdHTMLAttributes,
  ThHTMLAttributes
} from "react";

type TableElementProps = TdHTMLAttributes<HTMLTableCellElement> &
  ThHTMLAttributes<HTMLTableCellElement>;

export interface NotionTableCellProps extends TableElementProps {
  as?: "td" | "th";
  align?: "left" | "center" | "right";
  muted?: boolean;
  nowrap?: boolean;
  numeric?: boolean;
}

const NotionTableCell = forwardRef<HTMLTableCellElement, NotionTableCellProps>(
  (
    {
      as = "td",
      align = "left",
      muted = false,
      nowrap = false,
      numeric = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const Component = as;
    const classes = [
      "notion-table-cell",
      align === "center"
        ? "text-center"
        : align === "right"
        ? "text-right"
        : "text-left",
      muted ? "notion-table-cell-muted" : "",
      nowrap ? "notion-table-cell-nowrap" : "",
      numeric ? "notion-table-cell-numeric" : "",
      className
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component ref={ref as any} className={classes} {...props}>
        {children}
      </Component>
    );
  }
);

NotionTableCell.displayName = "NotionTableCell";

export default NotionTableCell;

