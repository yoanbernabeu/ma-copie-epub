import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlocked } from "../extension/src/guard.js";

test("une page normale servie par Cloudflare n'est pas un blocage", () => {
  const html = `<html><head><title>Table des matières - Exemple</title></head><body><main><a href="/x">x</a></main>
<script>(function(){var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js?ray=abc';document.head.appendChild(a);})();</script></body></html>`;
  assert.equal(isBlocked(200, html), false);
});

test("les codes de refus arrêtent la génération", () => {
  for (const s of [401, 403, 429, 503]) assert.equal(isBlocked(s, ""), true);
  assert.equal(isBlocked(404, ""), false);
});

test("une page de vérification anti-robot arrête la génération", () => {
  assert.equal(isBlocked(200, "<html><head><title>Just a moment...</title></head></html>"), true);
  assert.equal(isBlocked(200, "<script>window._cf_chl_opt={cvId:'3'}</script>"), true);
  assert.equal(isBlocked(200, '<div id="challenge-running"></div>'), true);
});
