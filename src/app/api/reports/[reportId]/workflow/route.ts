import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/guards";
import { transitionReportVersion } from "@/lib/server/workflow";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const body = (await request.json()) as { action?: "approve" | "publish" };
  const { reportId } = await params;
  const requiredRole = body.action === "publish" ? "publisher" : "reviewer";
  const auth = await requireUser(requiredRole);
  if (!auth.ok) {
    return auth.response;
  }

  if (!body.action) {
    return NextResponse.json({ error: "action is required." }, { status: 400 });
  }

  await transitionReportVersion({
    reportId,
    actorUserId: auth.user.id,
    action: body.action,
  });

  return NextResponse.json({ ok: true });
}
