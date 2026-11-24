// Two-Sentence Horror — make.fun entry (v3)
// Writes exactly one two-sentence horror story to entry.txt.
// Validation gate (inside this file): the story must be 1-400 chars,
// exactly two sentences, valid UTF-8, no trailing newline. After writing,
// the file is read back and verified byte-identical to what was written;
// any gate failure exits non-zero. Output dir comes from the
// MAKEFUN_OUTPUT_DIR environment variable (default "/output").

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// --- the story -----------------------------------------------------------
const SENTENCE_1 =
  "Every night, my daughter leaves a full glass of water outside my bedroom door, even though her own room is at the far end of the hall and she is afraid of the dark.";
const SENTENCE_2 =
  "When I finally asked her why, she whispered that the water is not for me — it is for the tall man who stands at the foot of my bed, waiting for it to be empty.";

const STORY = `${SENTENCE_1} ${SENTENCE_2}`;

// --- output directory ----------------------------------------------------
function resolveOutputDir(): string {
  const raw = process.env.MAKEFUN_OUTPUT_DIR;
  const dir = raw && raw.trim().length > 0 ? raw.trim() : "/output";
  return dir;
}

// --- validation gate -----------------------------------------------------
function countSentences(text: string): number {
  // A sentence ends at a terminal mark (. ! ?) followed by a space or the
  // end of the string. The story uses no ellipses or abbreviations, so
  // this count is exact.
  const marks = text.match(/[.!?](?=\s|$)/g);
  return marks ? marks.length : 0;
}

function runGate(text: string): void {
  const failures: string[] = [];

  if (text.length < 1 || text.length > 400) {
    failures.push(`char count ${text.length} is outside 1-400`);
  }
  const sentences = countSentences(text);
  if (sentences !== 2) {
    failures.push(`sentence count ${sentences} is not exactly 2`);
  }
  if (text.trim().length === 0) {
    failures.push("story is only whitespace");
  }
  if (text.endsWith("\n") || text.endsWith("\r")) {
    failures.push("story ends with a trailing newline");
  }
  // UTF-8 round-trip: encoding then decoding must reproduce the string.
  const roundTrip = Buffer.from(text, "utf8").toString("utf8");
  if (roundTrip !== text) {
    failures.push("story is not valid UTF-8");
  }

  if (failures.length > 0) {
    console.error(`GATE FAIL: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("GATE PASS");
}

// --- digests --------------------------------------------------------------
function digest(text: string): { bytes: number; sha256: string } {
  const buf = Buffer.from(text, "utf8");
  return {
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

// --- main -----------------------------------------------------------------
const outDir = resolveOutputDir();
mkdirSync(outDir, { recursive: true });

runGate(STORY);

const expected = digest(STORY);
console.log(`chars: ${STORY.length}`);
console.log(`bytes: ${expected.bytes}`);
console.log(`sha256: ${expected.sha256}`);

const outPath = join(outDir, "entry.txt");
writeFileSync(outPath, STORY, "utf8");
console.log(`Wrote ${outPath}`);

// Read the file back and verify it is byte-identical to what was written.
const readBack = readFileSync(outPath, "utf8");
const actual = digest(readBack);
if (readBack !== STORY || actual.sha256 !== expected.sha256) {
  console.error(
    `VERIFY FAIL: read-back mismatch (expected sha256 ${expected.sha256}, got ${actual.sha256})`
  );
  process.exit(1);
}
console.log(`VERIFY PASS: read-back sha256 ${actual.sha256} matches`);
