// Construit dist/fixture.epub à partir des pages synthétiques de tests/fixtures,
// pour le valider avec EPUBCheck en CI. Aucun texte réel n'est utilisé.
import { mkdirSync, writeFileSync } from "node:fs";
import { fixture, fixturePages } from "../tests/helpers.mjs";
import { buildEpub } from "../extension/src/epub.js";

const { bytes, warnings } = await buildEpub({
  pages: await fixturePages(),
  cover: new Uint8Array(fixture("cover.jpg")),
  date: new Date(),
  version: "fixture",
  owner: "Personne Exemple",
});
mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/fixture.epub", import.meta.url), bytes);
console.log(`dist/fixture.epub (${bytes.length} octets, ${warnings.length} avertissement(s))`);
