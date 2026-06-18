import { NextResponse } from "next/server";

import { canAtLeast, getCurrentUser } from "@/lib/server/auth";
import type { UserRole } from "@/lib/server/types";

export async function requireUser(requiredRole: UserRole = "viewer") {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canAtLeast(user.role, requiredRole)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user };
}
