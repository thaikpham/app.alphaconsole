// v21 has no "Của tôi" list: Chỉnh slot edits a recommended set in place. The core store keeps bundled sets read-only, so an
// edit lives in a user copy tagged with the bundled id (sourceId). The newest copy of a bundled set is "the edited set".
import { parseUserSetsFile } from "@/core/web/lib/app-core/sets/store";
import { setStore, userSetsAdapter } from "@/storage/userSetsFile";

/** Bundled set id → id of its newest edited copy. */
export async function editedCopies(): Promise<Map<string, string>> {
  const text = await userSetsAdapter.read();
  const map = new Map<string, string>();
  if (text === null) return map;
  for (const record of parseUserSetsFile(text).sets) {
    if (record.sourceId !== undefined) map.set(record.sourceId, record.set.id);
  }
  return map;
}

/** The copy to edit for a bundled set, made on first use. */
export async function editableCopyId(bundledId: string): Promise<string> {
  const existing = (await editedCopies()).get(bundledId);
  if (existing !== undefined) return existing;
  return (await setStore.duplicate(bundledId)).id;
}
