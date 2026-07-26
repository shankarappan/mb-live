import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChartView,
  chordToNashville,
  chordToRoman,
  parseChordToken,
  rewriteChartToKey,
  semitoneDelta,
  transposeChord,
} from "@/lib/chart/index";

describe("transpose", () => {
  it("computes semitone delta", () => {
    assert.equal(semitoneDelta("G", "A"), 2);
    assert.equal(semitoneDelta("C", "G"), 7);
  });

  it("transposes chord tokens", () => {
    const g = parseChordToken("G");
    const a = transposeChord(g, 2, false);
    assert.equal(a.raw, "A");
    const gm = parseChordToken("Gm7/Bb");
    const am = transposeChord(gm, 2, true);
    assert.equal(am.raw, "Am7/C");
  });

  it("buildChartView temp transpose does not require rewrite", () => {
    const source = "{key: G}\n[G]Hello [C]world";
    const view = buildChartView({
      source,
      sourceKey: "G",
      displayKey: "A",
      mode: "standard",
    });
    const text = JSON.stringify(view.blocks);
    assert.match(text, /"display":"A"/);
    assert.match(text, /"display":"D"/);
  });

  it("shape view drops by capo frets", () => {
    const view = buildChartView({
      source: "{key: A}\n[A]Line",
      sourceKey: "A",
      displayKey: "A",
      shapeView: true,
      capoFret: 2,
      mode: "standard",
    });
    const text = JSON.stringify(view.blocks);
    assert.match(text, /"display":"G"/);
  });
});

describe("modes", () => {
  it("lyrics-only strips chords", () => {
    const view = buildChartView({
      source: "[G]Hello [C]there",
      sourceKey: "G",
      mode: "lyrics",
    });
    const line = view.blocks[0] && view.blocks[0].type !== "comment" && view.blocks[0].type !== "keyChange"
      ? view.blocks[0].lines[0]
      : null;
    assert.ok(line);
    assert.equal(line!.lyrics.replace(/\s+/g, " ").trim(), "Hello there");
    assert.equal(line!.hasChords, false);
  });

  it("nashville and roman derive from concert key", () => {
    const g = parseChordToken("G");
    assert.equal(chordToNashville(g, "G"), "1");
    assert.equal(chordToRoman(g, "G"), "I");
    const em = parseChordToken("Em");
    assert.equal(chordToNashville(em, "G"), "6m");
    assert.equal(chordToRoman(em, "G"), "vi");
  });
});

describe("rewrite", () => {
  it("permanently rewrites master to new concert key", () => {
    const { body, key } = rewriteChartToKey("{key: G}\n[G]Hi [C]there", "G", "A");
    assert.equal(key, "A");
    assert.match(body, /\{key: A\}/);
    assert.match(body, /\[A\]Hi/);
    assert.match(body, /\[D\]there/);
  });
});
