// In-memory store for server-side tracking (resets on deployment/restart)
// Client-side uses localStorage for persistence

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

// In-memory store (for current session only)
let records: FineTuneRecord[] = [];
const index = new Map<string, FineTuneRecord>();

function upsert(record: FineTuneRecord) {
  const existingIndex = records.findIndex((item) => item.trainingId === record.trainingId);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records = [...records, record];
  }
  index.set(record.trainingId, record);
  // No file persistence - data lives in memory only
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
