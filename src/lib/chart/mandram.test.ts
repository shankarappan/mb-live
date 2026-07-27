import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildChartView,
  isSectionHeading,
  isStandaloneChordLine,
  isValidChordToken,
  parseChordProDocument,
  parseChordToken,
  planChartTranspose,
} from "@/lib/chart";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANDRAM = readFileSync(
  join(__dirname, "fixtures/mandram-vandha.txt"),
  "utf8",
);

describe("strict chord token validation", () => {
  it("rejects ordinary words that begin with A–G", () => {
    for (const word of ["End", "Gnd", "Amazing", "Band", "Bridge"]) {
      assert.equal(isValidChordToken(word), false, word);
      assert.equal(parseChordToken(word).literal, true, word);
    }
  });

  it("accepts real chord tokens used in Mandram", () => {
    for (const chord of ["Dm", "F", "Bb", "C", "A7", "Dsus2", "A"]) {
      assert.equal(isValidChordToken(chord), true, chord);
      assert.equal(parseChordToken(chord).literal, false, chord);
    }
  });

  it("recognises section headings", () => {
    for (const h of [
      "Intro",
      "Verse",
      "Verse 1",
      "Verse 2",
      "Chorus",
      "Pre-Chorus",
      "Bridge",
      "Instrumental",
      "Interlude",
      "Outro",
      "End",
    ]) {
      assert.equal(isSectionHeading(h), true, h);
    }
  });

  it("detects traditional standalone chord lines", () => {
    assert.equal(isStandaloneChordLine("Dm"), true);
    assert.equal(isStandaloneChordLine("Dm F Bb C A7"), true);
    assert.equal(isStandaloneChordLine("Dm      F           Bb   C           A7"), true);
    assert.equal(isStandaloneChordLine("Dm Dsus2"), true);
    assert.equal(isStandaloneChordLine("Dm C F"), true);
    assert.equal(isStandaloneChordLine("A"), true);
    assert.equal(isStandaloneChordLine("A Dm A"), true);
    assert.equal(isStandaloneChordLine("A                    Dm     A"), true);
    assert.equal(isStandaloneChordLine("Mandram vandha thendralukku"), false);
    assert.equal(isStandaloneChordLine("[End]"), false);
  });
});

describe("Mandram Vandha regression fixture", () => {
  it("parses sections without treating [End] as a chord", () => {
    const doc = parseChordProDocument(MANDRAM);
    const sectionNames = doc.blocks
      .filter((b) => b.type === "section")
      .map((b) => (b.type === "section" ? b.name : ""));
    assert.deepEqual(sectionNames, ["Intro", "Verse 1", "Verse 2", "End"]);

    const allRaws: string[] = [];
    for (const block of doc.blocks) {
      if (block.type !== "section" && block.type !== "paragraph") continue;
      for (const line of block.lines) {
        for (const seg of line.segments) {
          if (seg.type === "chord") allRaws.push(seg.chord.raw);
        }
      }
    }
    assert.ok(!allRaws.includes("End"));
    assert.ok(!allRaws.includes("Gnd"));
    assert.ok(allRaws.includes("Dm"));
    assert.ok(allRaws.includes("Dsus2"));
    assert.ok(allRaws.includes("A7"));
  });

  it("Dm → Fm transposes Mandram chords correctly and preserves lyrics", () => {
    const result = planChartTranspose(MANDRAM, "Dm", "Fm");
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.ok(result.plan.chordsDetected > 1);
    assert.ok(
      result.plan.chordsDetected >= 40,
      `expected many Mandram chords, got ${result.plan.chordsDetected}`,
    );
    assert.equal(
      result.plan.warnings.some((w) => /end/i.test(w.token)),
      false,
    );

    const unique = new Map<string, string>();
    for (const p of result.plan.pairs) {
      if (p.warning) continue;
      if (!unique.has(p.before)) unique.set(p.before, p.after);
    }

    assert.equal(unique.get("Dm"), "Fm");
    assert.equal(unique.get("F"), "Ab");
    assert.equal(unique.get("Bb"), "Db");
    assert.equal(unique.get("C"), "Eb");
    assert.equal(unique.get("A7"), "C7");
    assert.equal(unique.get("Dsus2"), "Fsus2");
    assert.equal(unique.get("A"), "C");

    assert.match(result.plan.body, /\[Intro\]/);
    assert.match(result.plan.body, /\[Verse 1\]/);
    assert.match(result.plan.body, /\[Verse 2\]/);
    assert.match(result.plan.body, /\[End\]/);
    assert.doesNotMatch(result.plan.body, /\[Gnd\]/);
    assert.match(result.plan.body, /Mandram vandha thendralukku manjam vara/);
    assert.match(result.plan.body, /Boopaalamae koodadhennum vaanam undo soll/);
    assert.match(result.plan.body, /Yennodu nee vandhaal/);

    // Standalone chord line spacing preserved with transposed tokens
    assert.match(
      result.plan.body,
      /Fm\s+Ab\s+Db\s+Eb\s+C7/,
    );
    assert.match(result.plan.body, /Fm\s+Fsus2/);

    const view = buildChartView({
      source: result.plan.body,
      sourceKey: "Fm",
      displayKey: "Fm",
      mode: "standard",
    });
    const text = JSON.stringify(view.blocks);
    assert.match(text, /"display":"Fm"/);
    assert.match(text, /"display":"Ab"/);
    assert.doesNotMatch(text, /"display":"Dm"/);
  });

  it("blocks create when a key change is requested but no chords exist", () => {
    const result = planChartTranspose(
      "[Intro]\nSome lyrics only\n[End]\nMore lyrics\n",
      "Dm",
      "Fm",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /no safe transposable chords/i);
  });

  it("allows same-key independent copy even without chords", () => {
    const body = "[Intro]\nOnly lyrics\n[End]\n";
    const result = planChartTranspose(body, "Dm", "Dm");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plan.sameKey, true);
    assert.equal(result.plan.chordsDetected, 0);
    assert.equal(result.plan.body, body);
  });
});
