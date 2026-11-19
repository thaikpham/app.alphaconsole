/** First-launch flag (onboarding.json text): only a saved {"seen": true} counts as seen. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOnboardingSeen, serializeOnboardingSeen } from "../src/storage/onboarding.ts";

test("a saved flag reads back as seen", () => {
  assert.equal(parseOnboardingSeen(serializeOnboardingSeen()), true);
  assert.equal(parseOnboardingSeen('{"seen":true}'), true);
});

test("a missing or unreadable file means not seen", () => {
  assert.equal(parseOnboardingSeen(null), false);
  assert.equal(parseOnboardingSeen(""), false);
  assert.equal(parseOnboardingSeen('{"seen":'), false);
  assert.equal(parseOnboardingSeen("null"), false);
  assert.equal(parseOnboardingSeen("true"), false);
});

test("any value other than true for seen is not seen", () => {
  assert.equal(parseOnboardingSeen('{"seen":false}'), false);
  assert.equal(parseOnboardingSeen('{"seen":"true"}'), false);
  assert.equal(parseOnboardingSeen('{"seen":1}'), false);
  assert.equal(parseOnboardingSeen("{}"), false);
});

test("the saved text is the documented shape", () => {
  assert.equal(serializeOnboardingSeen(), '{"seen":true}');
});
