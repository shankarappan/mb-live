import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChartView,
  planChartTranspose,
  resolveAuthoritativeSourceKey,
  rewriteChartToKey,
} from "@/lib/chart";

const OPEN_ROAD = `{key: G}
[G]Rolling out
[C]Under city [D]lights
[G/B]Keep the [Em]tempo
`;

const WITH_MID_KEY = `{key: G}
[G]Start here
{key: A}
[A]Modulated
[D/F#]Slash
`;

const MULTILINGUAL = `{key: G}
[G]Amazing grace
[C]மண்ட்ரம் வந்த
[D]මන්ද්‍රම් වන්දා
{comment: stage note}
[N.C.]break
[Gsus4]hold
[Cmaj7]colour
[F#m7]sharp minor
[Bbadd9]flat add
[Bdim]dim
[Xyz]bogus
`;

describe("create arrangement transpose (planChartTranspose)", () => {
  it("1. G → A transposes every recognised chord", () => {
    const result = planChartTranspose(OPEN_ROAD, "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plan.sameKey, false);
    assert.equal(result.plan.targetKey, "A");
    assert.match(result.plan.body, /\{key: A\}/);
    assert.match(result.plan.body, /\[A\]Rolling/);
    assert.match(result.plan.body, /\[D\]Under/);
    assert.match(result.plan.body, /\[E\]lights/);
    assert.match(result.plan.body, /\[A\/C#\]Keep/);
    assert.match(result.plan.body, /\[F#m\]tempo/);
    assert.ok(result.plan.chordsChanged >= 5);
    assert.equal(result.plan.chordsDetected, result.plan.chordsChanged);
  });

  it("2. G → D handles sharps/flats consistently", () => {
    const result = planChartTranspose(
      "{key: G}\n[G] [F#m] [C] [Bb]",
      "G",
      "D",
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    // D major prefers sharps
    assert.match(result.plan.body, /\[D\]/);
    assert.match(result.plan.body, /\[C#m\]/);
    assert.match(result.plan.body, /\[G\]/);
    assert.match(result.plan.body, /\[F\]/); // Bb + 7 semitones → F
  });

  it("3. Minor-key transposition works (Am → Em)", () => {
    const result = planChartTranspose(
      "{key: Am}\n[Am]Night [F]Signal [G]out [C]there",
      "Am",
      "Em",
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.plan.body, /\{key: Em\}/);
    assert.match(result.plan.body, /\[Em\]Night/);
    assert.match(result.plan.body, /\[C\]Signal/);
    assert.match(result.plan.body, /\[D\]out/);
    assert.match(result.plan.body, /\[G\]there/);
  });

  it("4. Slash chord root and bass both transpose", () => {
    const result = planChartTranspose("[D/F#]line", "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.plan.body, /\[E\/G#\]/);
  });

  it("5. Mid-song key changes retain the concert interval", () => {
    const result = planChartTranspose(WITH_MID_KEY, "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    // Opening key G→A; mid-song A→B (+2)
    assert.match(result.plan.body, /\{key: A\}/);
    assert.match(result.plan.body, /\{key: B\}/);
    assert.match(result.plan.body, /\[B\]Modulated/);
    assert.match(result.plan.body, /\[E\/G#\]Slash/);
  });

  it("6. Lyrics and formatting are unchanged", () => {
    const result = planChartTranspose(MULTILINGUAL, "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.plan.body, /Amazing grace/);
    assert.match(result.plan.body, /மண்ட்ரம் வந்த/);
    assert.match(result.plan.body, /මන්ද්‍රම් වන්දා/);
    assert.match(result.plan.body, /\{comment: stage note\}/);
    assert.match(result.plan.body, /\[N\.C\.\]break/);
  });

  it("7. Source arrangement body is not mutated by the planner", () => {
    const original = OPEN_ROAD;
    const snapshot = original.slice();
    planChartTranspose(original, "G", "A");
    assert.equal(original, snapshot);
    assert.match(original, /\{key: G\}/);
    assert.match(original, /\[G\]Rolling/);
  });

  it("8. Saved body and chart_source_key agree", () => {
    const result = planChartTranspose(OPEN_ROAD, "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const { body, targetKey } = result.plan;
    assert.equal(targetKey, "A");
    assert.match(body, /\{key: A\}/);
    const view = buildChartView({
      source: body,
      sourceKey: targetKey,
      displayKey: targetKey,
      mode: "standard",
    });
    assert.equal(view.concertKey, "A");
    const text = JSON.stringify(view.blocks);
    assert.match(text, /"display":"A"/);
    assert.doesNotMatch(text, /"display":"G"/);
  });

  it("9. Invalid or missing keys fail safely", () => {
    assert.equal(planChartTranspose(OPEN_ROAD, null, "A").ok, false);
    assert.equal(planChartTranspose(OPEN_ROAD, "", "A").ok, false);
    assert.equal(planChartTranspose(OPEN_ROAD, "G", "").ok, false);
    assert.equal(planChartTranspose(OPEN_ROAD, "G", "H").ok, false);
    assert.equal(planChartTranspose(OPEN_ROAD, "Nope", "A").ok, false);
    const bad = planChartTranspose(OPEN_ROAD, null, "A");
    if (!bad.ok) assert.match(bad.error, /Source concert key/i);
  });

  it("10. Same key creates an unchanged independent copy plan", () => {
    const result = planChartTranspose(OPEN_ROAD, "G", "G");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plan.sameKey, true);
    assert.equal(result.plan.chordsChanged, 0);
    assert.equal(result.plan.body, OPEN_ROAD);
  });

  it("11. Stand/set view of new arrangement shows target key chords", () => {
    const created = planChartTranspose(OPEN_ROAD, "G", "A");
    assert.equal(created.ok, true);
    if (!created.ok) return;
    // Simulate stand loading the new arrangement (saved key = chart_source_key)
    const stand = buildChartView({
      source: created.plan.body,
      sourceKey: created.plan.targetKey,
      displayKey: created.plan.targetKey,
      mode: "standard",
    });
    assert.equal(stand.concertKey, "A");
    const text = JSON.stringify(stand.blocks);
    assert.match(text, /"display":"A"/);
    assert.match(text, /"display":"D"/);
  });

  it("12. Chart body rewrite does not touch PDF metadata concerns", () => {
    // PDF files are arrangement_id-scoped separately; transpose only returns text.
    const result = planChartTranspose(OPEN_ROAD, "G", "D");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(typeof result.plan.body, "string");
    assert.ok(!("pdf" in result.plan));
  });

  it("warns on unrecognised chord-like brackets and leaves them unchanged", () => {
    const result = planChartTranspose(MULTILINGUAL, "G", "A");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(
      result.plan.warnings.some((w) => w.token === "Xyz"),
      `expected Xyz warning, got ${JSON.stringify(result.plan.warnings)}`,
    );
    assert.ok(result.plan.body.includes("[Xyz]"));
    assert.ok(result.plan.body.includes("[Asus4]"), result.plan.body);
    assert.ok(result.plan.body.includes("[Dmaj7]"), result.plan.body);
    assert.ok(
      result.plan.body.includes("[G#m7]"),
      `missing G#m7 in:\n${result.plan.body}`,
    );
    assert.ok(result.plan.body.includes("[Cadd9]"), result.plan.body);
  });

  it("resolveAuthoritativeSourceKey prefers chart_source_key over client guesses", () => {
    assert.equal(
      resolveAuthoritativeSourceKey({
        chart_source_key: "G",
        default_key: "A",
        body: "{key: D}\n[D]x",
      }),
      "G",
    );
    assert.equal(
      resolveAuthoritativeSourceKey({
        chart_source_key: null,
        default_key: null,
        body: "{key: Bb}\n[Bb]x",
      }),
      "Bb",
    );
  });

  it("rewriteChartToKey matches planChartTranspose output", () => {
    const planned = planChartTranspose(OPEN_ROAD, "G", "A");
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    const rewritten = rewriteChartToKey(OPEN_ROAD, "G", "A");
    assert.equal(rewritten.key, "A");
    assert.equal(rewritten.body, planned.plan.body);
  });
});
