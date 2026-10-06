import assert from "node:assert/strict";
import { DEFAULT_SEGMENTS, generateCodes, type SegmentConfig } from "./generate.ts";

const defaults = generateCodes(DEFAULT_SEGMENTS);
assert.equal(defaults.ok, true);
if (!defaults.ok) throw new Error(defaults.error);
assert.equal(defaults.count, 17);
assert.equal(defaults.codes[0], "403.04.1.1");
assert.equal(defaults.codes[1], "403.05.1.1");
assert.equal(defaults.codes[16], "403.20.1.1");

const nested: SegmentConfig[] = [
  { start: 403, end: 405, mode: "fixed", step: 1, digits: 0 },
  { start: 4, end: 5, mode: "inc", step: 1, digits: 2 },
  { start: 1, end: 9, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 3, mode: "inc", step: 1, digits: 0 },
];
const nestedResult = generateCodes(nested);
assert.equal(nestedResult.ok, true);
if (!nestedResult.ok) throw new Error(nestedResult.error);
assert.deepEqual(nestedResult.codes, [
  "403.04.1.1",
  "403.04.1.2",
  "403.04.1.3",
  "403.05.1.1",
  "403.05.1.2",
  "403.05.1.3",
]);

const decreasing = generateCodes([
  { start: 2, end: 1, mode: "dec", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
]);
assert.equal(decreasing.ok, true);
if (!decreasing.ok) throw new Error(decreasing.error);
assert.deepEqual(decreasing.codes, ["2.1.1.1", "1.1.1.1"]);

const invalidRange = generateCodes([
  { start: 5, end: 1, mode: "inc", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
]);
assert.equal(invalidRange.ok, false);

const tooMany = generateCodes([
  { start: 1, end: 50, mode: "inc", step: 1, digits: 0 },
  { start: 1, end: 50, mode: "inc", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
]);
assert.equal(tooMany.ok, false);
if (tooMany.ok) throw new Error("expected limit");
assert.match(tooMany.error, /1000/);

console.log("generate checks passed");
