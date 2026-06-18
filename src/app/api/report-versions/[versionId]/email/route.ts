import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/guards";
import { getEmailHtml } from "@/lib/server/workflow";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const auth = await requireUser("viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const { versionId } = await params;
  const html = await getEmailHtml(versionId);

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
