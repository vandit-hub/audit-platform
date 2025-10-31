export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { EXPECTED_HEADERS } from "@/types/import";

export async function GET() {
  const wb = XLSX.utils.book_new();
  const makeSheet = (headers: string[]) => {
    const data = [headers];
    return XLSX.utils.aoa_to_sheet(data);
  };
  XLSX.utils.book_append_sheet(wb, makeSheet(EXPECTED_HEADERS.Plants), "Plants");
  XLSX.utils.book_append_sheet(wb, makeSheet(EXPECTED_HEADERS.Audits), "Audits");
  XLSX.utils.book_append_sheet(wb, makeSheet(EXPECTED_HEADERS.Observations), "Observations");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="import-template.xlsx"'
    }
  });
}


