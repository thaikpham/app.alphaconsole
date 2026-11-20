// Restores a card backup onto the attached card. Shared by the backups screen and the recall stage of the write screen.
import { beginWrite, endWrite, readCard } from "@/card/session";
import { toCardState } from "@/core/web/lib/app-core/card/view";
import { recordHolds } from "@/core/web/lib/app-core/transfer/state";
import { dropLastWritten, dropPending, loadWriteState, updateWriteState } from "@/storage/writeState";
import { readBackup, restoreBackup } from "../../modules/usb-volume";

export type RestoreOutcome = "restored" | "noCard" | "failed";

/** Replaces the card's files with the backup. "noCard" when no ready card is attached. */
export async function restoreCardBackup(id: string): Promise<RestoreOutcome> {
  let target: string | null = null;
  try {
    const reading = await readCard();
    if (reading.kind !== "ready") return "noCard";
    const uuid = reading.card.uuid;
    target = uuid;
    beginWrite(uuid);
    const report = await restoreBackup(id);
    if (!report.ok) return "failed";
    // The restore replaces whatever the card held, so an unconfirmed write no longer applies.
    // The last-write record stays only if the restored files are the ones the app wrote.
    const backup = await readBackup(id);
    const record = (await loadWriteState()).lastWritten[uuid] ?? null;
    const keepRecord = record !== null && recordHolds(toCardState({ sonyCard: true, settingDir: true, files: backup.files }), record);
    await updateWriteState((s) => {
      const next = dropPending(s, uuid);
      return keepRecord ? next : dropLastWritten(next, uuid);
    });
    return "restored";
  } catch {
    return "failed";
  } finally {
    if (target) endWrite(target);
  }
}
