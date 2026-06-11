import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DatasetProfileSchema,
  type DatasetProfile,
  type DashboardColumn,
} from "@/shared/contracts";
import { inferColumns } from "./infer";
import type { DashboardState } from "./types";
import {
  createDatasetState,
  getDatasetRows,
  getDatasetState,
  setDatasetRows,
} from "./state";

type Row = Record<string, unknown>;

export type DatasetContext = {
  state: DashboardState;
  rows: Row[];
  profile: DatasetProfile | null;
  topic: string;
};

// The in-memory dataset state is a per-process cache; it disappears on
// restart. This module rehydrates it from Supabase so chat keeps working
// without re-uploading. The profile/topic ride along in their own cache to
// avoid re-reading the (potentially large) dataset row on every chat turn.

const metaCache = new Map<
  string,
  { profile: DatasetProfile | null; topic: string }
>();

export async function ensureDatasetContext(
  supabase: SupabaseClient,
  datasetId: string,
): Promise<DatasetContext | null> {
  const cachedState = getDatasetState(datasetId);
  const cachedRows = getDatasetRows(datasetId);
  const cachedMeta = metaCache.get(datasetId);
  if (cachedState && cachedRows && cachedMeta) {
    return {
      state: cachedState,
      rows: cachedRows,
      profile: cachedMeta.profile,
      topic: cachedMeta.topic,
    };
  }

  const { data, error } = await supabase
    .from("datasets")
    .select("id, name, rows, profile, topic")
    .eq("id", datasetId)
    .single();
  if (error || !data) {
    // The DB row may be unreachable (e.g. transient failure) while the
    // process cache still holds the dataset; keep chat working from memory.
    if (cachedState && cachedRows) {
      return {
        state: cachedState,
        rows: cachedRows,
        profile: cachedMeta?.profile ?? null,
        topic: cachedMeta?.topic ?? "unknown",
      };
    }
    return null;
  }

  const rows = Array.isArray(data.rows)
    ? (data.rows as Row[])
    : cachedRows ?? [];
  if (rows.length === 0) {
    return null;
  }

  const parsedProfile = DatasetProfileSchema.safeParse(data.profile);
  const profile = parsedProfile.success ? parsedProfile.data : null;
  const columns: DashboardColumn[] = profile
    ? profile.columns.map((column) => ({
        name: column.name,
        kind: column.kind,
      }))
    : inferColumns(rows);

  const state =
    cachedState ??
    createDatasetState(datasetId, columns, [], [], {
      columns,
      rowCount: rows.length,
      sampleRows: [],
    });
  if (!cachedRows) {
    setDatasetRows(datasetId, rows);
  }

  const topic = typeof data.topic === "string" ? data.topic : "unknown";
  metaCache.set(datasetId, { profile, topic });

  return { state, rows, profile, topic };
}
