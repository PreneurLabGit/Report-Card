import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/guards";
import { loadAppStatePayload } from "@/lib/server/workflow";

export async function GET() {
  const auth = await requireUser("viewer");
  if (!auth.ok) {
    return auth.response;
  }

  const payload = await loadAppStatePayload(auth.user.id);
  return NextResponse.json(payload);
}
