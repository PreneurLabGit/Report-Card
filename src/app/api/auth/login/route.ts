import { NextResponse } from "next/server";

import { createSession } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await createSession(body.email, body.password);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  return NextResponse.json({ user });
}
