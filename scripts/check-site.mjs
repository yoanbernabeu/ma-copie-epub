// Vérifie que la structure du site correspond toujours à src/config.js.
// N'enregistre ni n'affiche aucun texte : seulement des compteurs.
import { JSDOM } from "jsdom";
import { DELAY_MS, TOC_URL } from "../extension/src/config.js";

globalThis.DOMParser = new JSDOM("").window.DOMParser;
const { parseToc } = await import("../extension/src/toc.js");
const { Book, mainOf } = await import("../extension/src/extract.js");
const { compareWithReference, textFingerprint } = await import("../extension/src/reference-check.js");

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  return res.text();
}

const pages = parseToc(await get(TOC_URL));
const kinds = pages.reduce((acc, p) => ({ ...acc, [p.kind]: (acc[p.kind] || 0) + 1 }), {});
console.log(`Table des matières : ${pages.length} pages`, kinds);
if (!pages.length) throw new Error("Aucune page trouvée dans la table des matières.");

// Toutes les pages, en séquence (une par seconde)
const book = new Book(pages);
const prints = [];
for (const page of pages) {
  await new Promise((r) => setTimeout(r, DELAY_MS));
  const html = await get(page.url);
  prints.push({ path: page.path, fingerprint: await textFingerprint(mainOf(html, page.url)) });
  book.pageBody(page, mainOf(html, page.url), page.url);
}
console.log(`Structure : ${pages.length} pages lues et transformées sans erreur`);
const cmp = await compareWithReference(prints);
console.log(cmp.identical
  ? `Texte identique à la version de référence du ${cmp.reference.dateFr}`
  : `Texte différent de la version de référence : ${cmp.changed.length} modifiée(s), ${cmp.added.length} ajoutée(s), ${cmp.missing} retirée(s)`);
if (book.warnings.length) {
  console.log("Balises inattendues :", [...new Set(book.warnings.map((w) => w.split(" : ")[1]))]);
}
console.log("Structure du site conforme.");
