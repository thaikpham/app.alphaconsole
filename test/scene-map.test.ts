/** Slot scene label to bundled photo (SPEC 5.2): table, aliases and fallback. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sceneFor } from "../src/home/sceneMap.ts";

test("each SPEC 5.2 scene maps to its image key", () => {
  assert.equal(sceneFor("Đời thường"), "street");
  assert.equal(sceneFor("Nắng gắt"), "street");
  assert.equal(sceneFor("Phố"), "street");
  assert.equal(sceneFor("Mưa"), "street");
  assert.equal(sceneFor("Chân dung"), "portrait");
  assert.equal(sceneFor("Bóng râm"), "portrait");
  assert.equal(sceneFor("Trong nhà"), "portrait");
  assert.equal(sceneFor("Cà phê"), "portrait");
  assert.equal(sceneFor("Cận mặt"), "portrait");
  assert.equal(sceneFor("Studio"), "portrait");
  assert.equal(sceneFor("Livestream"), "portrait");
  assert.equal(sceneFor("Hoàng hôn"), "sunset");
  assert.equal(sceneFor("Ngoại cảnh"), "sunset");
  assert.equal(sceneFor("Đêm"), "night");
  assert.equal(sceneFor("Đèn đường"), "night");
  assert.equal(sceneFor("Chợ đêm"), "night");
});

test("the LOOK aliases map to their target scene", () => {
  assert.equal(sceneFor("Lễ đường"), "portrait");
  assert.equal(sceneFor("Tiệc"), "street");
});

test("an unknown label falls back to the portrait photo", () => {
  assert.equal(sceneFor("Chụp với flash"), "portrait");
  assert.equal(sceneFor(""), "portrait");
});
