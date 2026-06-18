import { NextResponse } from "next/server";

import { ReadOnlyStoreError } from "@/lib/server/errors";

export function handleRouteError(error: unknown) {
  if (error instanceof ReadOnlyStoreError) {
    return NextResponse.json(
      {
        error: "Production is currently running in read-only seed mode until persistent storage is wired.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Unexpected server error.",
    },
    { status: 500 },
  );
}
