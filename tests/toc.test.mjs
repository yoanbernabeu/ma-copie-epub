import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture } from "./helpers.mjs";
import { kindOf, normPath, parseToc } from "../extension/src/toc.js";

test("normPath ne garde que les pages du livre sur le site", () => {
  assert.equal(normPath("/programme/livre/introduction"), "/programme/livre/introduction");
  assert.equal(normPath("https://melenchon2027.fr/programme/livre/a/chapitre1/"), "/programme/livre/a/chapitre1");
  assert.equal(normPath("/programme/livre/a/chapitre1#section"), "/programme/livre/a/chapitre1");
  assert.equal(normPath("/programme/livre/"), null);
  assert.equal(normPath("/programme/plans"), null);
  assert.equal(normPath("https://exemple.org/programme/livre/a"), null);
  assert.equal(normPath("http://melenchon2027.fr/programme/livre/a"), null);
});

test("kindOf déduit le type de page de l'URL", () => {
  assert.equal(kindOf("/programme/livre/introduction"), "introduction");
  assert.equal(kindOf("/programme/livre/partie-alpha"), "partie");
  assert.equal(kindOf("/programme/livre/partie-alpha/chapitre1"), "chapitre");
});

test("parseToc renvoie les pages dans l'ordre, dédupliquées, limitées à <main>", () => {
  const pages = parseToc(fixture("toc.html"));
  assert.deepEqual(pages.map((p) => [p.path, p.kind]), [
    ["/programme/livre/introduction", "introduction"],
    ["/programme/livre/partie-alpha", "partie"],
    ["/programme/livre/partie-alpha/chapitre1", "chapitre"],
    ["/programme/livre/partie-alpha/chapitre2", "chapitre"],
    ["/programme/livre/partie-beta", "partie"],
    ["/programme/livre/partie-beta/chapitre1", "chapitre"],
  ]);
  assert.equal(pages[0].url, "https://melenchon2027.fr/programme/livre/introduction");
});
