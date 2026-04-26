import test from "node:test";
import assert from "node:assert/strict";
import { generateUUID } from "./uuid.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("generateUUID returns a valid UUID v4", () => {
  const value = generateUUID();
  assert.match(value, UUID_V4_REGEX);
});

test("generateUUID returns different values across calls", () => {
  const a = generateUUID();
  const b = generateUUID();
  assert.notEqual(a, b);
});
