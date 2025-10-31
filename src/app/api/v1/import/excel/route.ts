export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { assertCFO } from "@/lib/rbac";
import { runImport, dryRunImport } from "@/server/import/run";

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  assertCFO((session.user as any)?.role);

  const url = new URL(req.url);
  const dryRun = (url.searchParams.get("dryRun") ?? "true").toLowerCase() === "true";

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("Missing 'file' field");
  }
  if ((file as any).size && (file as any).size > 10 * 1024 * 1024) {
    return badRequest("File too large. Max 10 MB");
  }
  // Content type check (best effort)
  const type = file.type || "";
  if (
    type &&
    type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    type !== "application/octet-stream"
  ) {
    return badRequest("Unsupported content type. Upload an .xlsx file");
  }

  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);

  if (dryRun) {
    const result = await dryRunImport(buffer);
    return Response.json(result);
  }

  const result = await runImport(buffer, (session.user as any).id as string, false);
  return Response.json(result);
}


