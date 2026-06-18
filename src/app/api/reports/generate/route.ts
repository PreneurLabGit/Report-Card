import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/guards";
import { generateReports } from "@/lib/server/workflow";

export async function POST(request: Request) {
  const auth = await requireUser("reviewer");
  if (!auth.ok) {
    return auth.response;
  }

  const body = (await request.json()) as {
    periodId?: string;
    audience?: string;
    subjectId?: string;
    includeNarrative?: boolean;
  };

  if (!body.periodId) {
    return NextResponse.json({ error: "periodId is required." }, { status: 400 });
  }

  await generateReports({
    periodId: body.periodId,
    actorUserId: auth.user.id,
    includeNarrative: body.includeNarrative ?? false,
    audience: body.audience,
    subjectId: body.subjectId,
  });

  return NextResponse.json({ ok: true });
}
