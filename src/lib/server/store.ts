import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { PersistedAppState } from "@/lib/server/types";

const DATA_DIR = path.join(process.cwd(), "data");
const BLOBS_DIR = path.join(DATA_DIR, "blobs");
const STATE_PATH = path.join(DATA_DIR, "app-state.json");

const DEFAULT_USERS = [
  { id: "u_admin", name: "Admin User", email: "admin@salthub.local", role: "admin", password: "admin123" },
  { id: "u_uploader", name: "Uploader User", email: "uploader@salthub.local", role: "uploader", password: "upload123" },
  { id: "u_reviewer", name: "Reviewer User", email: "reviewer@salthub.local", role: "reviewer", password: "review123" },
  { id: "u_publisher", name: "Publisher User", email: "publisher@salthub.local", role: "publisher", password: "publish123" },
] as const;

function buildDefaultState(): PersistedAppState {
  const now = new Date().toISOString();
  return {
    users: DEFAULT_USERS.map((user) => ({ ...user })),
    sessions: [],
    periods: [
      {
        id: "period-2026-w24",
        label: "Week of Jun 8, 2026",
        cadence: "weekly",
        startDate: "2026-06-08",
        endDate: "2026-06-14",
        createdAt: now,
      },
      {
        id: "period-2026-w25",
        label: "Week of Jun 15, 2026",
        cadence: "weekly",
        startDate: "2026-06-15",
        endDate: "2026-06-21",
        createdAt: now,
      },
      {
        id: "period-2026-m06",
        label: "June 2026",
        cadence: "monthly",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        createdAt: now,
      },
    ],
    uploadedFiles: [],
    uploadBatches: [],
    generatedReports: [],
    reportVersions: [],
    reviewActions: [],
    auditLog: [],
  };
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(BLOBS_DIR, { recursive: true });

  try {
    await readFile(STATE_PATH, "utf8");
  } catch {
    await writeFile(STATE_PATH, JSON.stringify(buildDefaultState(), null, 2), "utf8");
  }
}

export async function readState() {
  await ensureStore();
  const raw = await readFile(STATE_PATH, "utf8");
  return JSON.parse(raw) as PersistedAppState;
}

export async function writeState(state: PersistedAppState) {
  await ensureStore();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function saveBlob(name: string, contents: string) {
  await ensureStore();
  const blobName = `${Date.now()}-${randomUUID()}-${name}`;
  const blobPath = path.join(BLOBS_DIR, blobName);
  await writeFile(blobPath, contents, "utf8");
  return blobPath;
}
