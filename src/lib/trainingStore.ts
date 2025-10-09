import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface FineTuneRecord {
  trainingId: string;
  destination: string;
  triggerWord: string;
  owner: string;
  modelName: string;
  inputUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version?: string;
  weightsUrl?: string;
  error?: string | null;
}

const STORE_PATH = join(process.cwd(), "data", "fineTunes.json");

function ensureStoreFile() {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "[]", "utf8");
  }
}

function loadStore(): FineTuneRecord[] {
  ensureStoreFile();
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FineTuneRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load fine-tune store", error);
    return [];
  }
}

function persistStore(records: FineTuneRecord[]) {
  ensureStoreFile();
  writeFileSync(STORE_PATH, JSON.stringify(records, null, 2), "utf8");
}

let records = loadStore();
const index = new Map(records.map((record) => [record.trainingId, record] as const));

function upsert(record: FineTuneRecord) {
  const existingIndex = records.findIndex((item) => item.trainingId === record.trainingId);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records = [...records, record];
  }
  index.set(record.trainingId, record);
  persistStore(records);
}

export function createFineTuneRecord(record: Omit<FineTuneRecord, "updatedAt">) {
  const withTimestamps: FineTuneRecord = {
    ...record,
    updatedAt: record.createdAt,
  };
  upsert(withTimestamps);
  return withTimestamps;
}

export function getFineTuneRecord(id: string) {
  return index.get(id) ?? null;
}

export function updateFineTuneRecord(
  id: string,
  patch: Partial<Omit<FineTuneRecord, "trainingId" | "createdAt" | "owner" | "modelName" | "destination" | "triggerWord">>,
) {
  const existing = index.get(id);
  if (!existing) return null;
  const updated: FineTuneRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  upsert(updated);
  return updated;
}

export function listFineTuneRecords() {
  return [...records].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listCompletedFineTunes() {
  return listFineTuneRecords().filter((record) =>
    ["succeeded", "completed"].includes(record.status),
  );
}



