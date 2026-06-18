import { NextResponse } from "next/server";

import { requireUser } from "@/lib/server/guards";
import { createUploadBatch } from "@/lib/server/workflow";

export async function POST(request: Request) {
  const auth = await requireUser("uploader");
  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();
  const periodId = formData.get("periodId");
  const fileEntries = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (typeof periodId !== "string" || !periodId) {
    return NextResponse.json({ error: "periodId is required." }, { status: 400 });
  }

  if (fileEntries.length === 0) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const batchId = await createUploadBatch({
    periodId,
    uploaderUserId: auth.user.id,
    files: fileEntries,
  });

  return NextResponse.json({ batchId });
}
