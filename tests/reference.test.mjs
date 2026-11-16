import assert from "node:assert/strict";
import { test } from "node:test";
import { fixturePages } from "./helpers.mjs";
import { mainOf } from "../extension/src/extract.js";
import { compareWithReference, pathKey, textFingerprint } from "../extension/src/reference-check.js";
import { REFERENCE } from "../extension/src/reference.js";

test("la référence ne contient que des empreintes (aucun texte en clair)", () => {
  const entries = Object.entries(REFERENCE.pages);
  assert.equal(entries.length, 30);
  for (const [k, v] of entries) {
    assert.match(k, /^[0-9a-f]{16}$/);
    assert.match(v, /^[0-9a-f]{64}$/);
  }
});

test("l'empreinte du texte ignore les espaces et le balisage", async () => {
  const a = mainOf("<main><p>Un   texte</p>\n<p>d’exemple</p></main>", "x");
  const b = mainOf('<main class="autre"><div><span>Un texte</span> d’exemple</div></main>', "x");
  assert.equal(await textFingerprint(a), await textFingerprint(b));
  const c = mainOf("<main><p>Un texte d’exemple.</p></main>", "x");
  assert.notEqual(await textFingerprint(a), await textFingerprint(c));
});

test("comparaison : identique, modifiée, ajoutée, retirée", async () => {
  const pages = await Promise.all((await fixturePages()).map(async ({ page, html }) => ({
    path: page.path, fingerprint: await textFingerprint(mainOf(html, page.url)),
  })));
  const ref = { dateFr: "1er janvier 2026", license: "CC", pages: {} };
  for (const p of pages) ref.pages[await pathKey(p.path)] = p.fingerprint;

  assert.equal((await compareWithReference(pages, ref)).identical, true);

  const modified = pages.map((p, i) => (i === 2 ? { ...p, fingerprint: "0".repeat(64) } : p));
  const r1 = await compareWithReference(modified, ref);
  assert.equal(r1.identical, false);
  assert.deepEqual(r1.changed, [pages[2].path]);

  const r2 = await compareWithReference(pages.slice(1), ref);
  assert.equal(r2.missing, 1);
  const r3 = await compareWithReference([...pages, { path: "/programme/livre/nouvelle", fingerprint: "1".repeat(64) }], ref);
  assert.deepEqual(r3.added, ["/programme/livre/nouvelle"]);
});
