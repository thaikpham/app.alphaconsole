/** Camera status line: each USB and card state maps to one kind, and a ready card names its matched set or none. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardLine, type UsbStatus } from "../src/card/status.ts";
import type { CardReading, ReadyCard } from "../src/card/session.ts";
import { modelById } from "../src/core/models.ts";
import type { Family } from "../src/core/transfer/plan.ts";

const massStorage: UsbStatus = { vendorId: 1356, productId: 0, mode: "mass-storage" };
const ptp: UsbStatus = { vendorId: 1356, productId: 0, mode: "ptp" };

/** Only the fields cardLine reads are set. */
function fakeCard(family: Family | null, error: string | null, matchedName: string | null): ReadyCard {
  return {
    view: { family, error, slots: [] },
    matched: matchedName === null ? null : { name: matchedName },
  } as unknown as ReadyCard;
}

function ready(family: Family | null, error: string | null, matchedName: string | null): CardReading {
  return { kind: "ready", card: fakeCard(family, error, matchedName) };
}

test("no USB device shows unplugged, whatever the card says", () => {
  assert.deepEqual(cardLine(null, ready("P", null, "Bộ A"), false), { kind: "unplugged" });
});

test("USB still being checked shows checking", () => {
  assert.deepEqual(cardLine("checking", null, false), { kind: "checking" });
});

test("PC Remote shows ptp and ignores the card", () => {
  assert.deepEqual(cardLine(ptp, { kind: "absent" }, false), { kind: "ptp" });
});

test("unrecognised USB mode shows unknownMode", () => {
  assert.deepEqual(cardLine({ vendorId: 1356, productId: 0, mode: "unknown" }, null, false), { kind: "unknownMode" });
});

test("mass storage with no reading yet, or a read in progress, shows reading", () => {
  assert.deepEqual(cardLine(massStorage, null, false), { kind: "reading" });
});

test("mass storage with no card mounted shows absent", () => {
  assert.deepEqual(cardLine(massStorage, { kind: "absent" }, false), { kind: "absent" });
});

test("card without the Sony folder shows unformatted", () => {
  assert.deepEqual(cardLine(massStorage, { kind: "noSony" }, false), { kind: "unformatted" });
});

test("card with no M1-M4 shows noSlots", () => {
  assert.deepEqual(cardLine(massStorage, ready(null, null, null), false), { kind: "noSlots" });
});

test("broken card shows its error message", () => {
  assert.deepEqual(cardLine(massStorage, ready("P", "Lỗi thẻ", null), false), { kind: "broken", message: "Lỗi thẻ" });
});

test("ready card names the matched set", () => {
  assert.deepEqual(cardLine(massStorage, ready("P", null, "Bộ A"), false), {
    kind: "ready",
    family: "P",
    currentName: "Bộ A",
  });
});

test("ready card with no matching set has no current name", () => {
  assert.deepEqual(cardLine(massStorage, ready("N", null, null), false), { kind: "ready", family: "N", currentName: null });
});

test("mount wait with no reading yet shows mounting, not reading", () => {
  assert.deepEqual(cardLine(massStorage, null, true), { kind: "mounting" });
});

test("mount wait with no card yet shows mounting, not absent", () => {
  assert.deepEqual(cardLine(massStorage, { kind: "absent" }, true), { kind: "mounting" });
});

test("a card found during the mount wait shows its own state at once", () => {
  assert.deepEqual(cardLine(massStorage, ready("P", null, "Bộ A"), true), {
    kind: "ready",
    family: "P",
    currentName: "Bộ A",
  });
});

test("an unformatted card shows unformatted during the mount wait", () => {
  assert.deepEqual(cardLine(massStorage, { kind: "noSony" }, true), { kind: "unformatted" });
});

test("the mount wait does not change unplugged or PC Remote", () => {
  assert.deepEqual(cardLine(null, null, true), { kind: "unplugged" });
  assert.deepEqual(cardLine(ptp, { kind: "absent" }, true), { kind: "ptp" });
});

test("a read-only model names itself on the status line", () => {
  const reading: CardReading = { kind: "readOnly", uuid: "u", model: modelById("a7c2")!, folder: true, slots: [] };
  assert.deepEqual(cardLine(massStorage, reading, false), { kind: "readOnly", name: "A7C II" });
});

test("an unsupported model names itself on the status line", () => {
  const reading: CardReading = { kind: "unsupported", uuid: "u", model: modelById("a7iv")! };
  assert.deepEqual(cardLine(massStorage, reading, false), { kind: "unsupported", name: "A7 IV" });
});
