import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture, fixturePages, unzip } from "./helpers.mjs";
import { buildEpub, dateFr, dateTimeFr } from "../extension/src/epub.js";
import { normalizeOwner, validateOwner } from "../extension/src/owner.js";
import { crc32 } from "../extension/src/zip.js";
import { uuidv5 } from "../extension/src/hash.js";

const date = new Date("2026-11-16T10:30:00Z");

async function build(pages) {
  return buildEpub({ pages: pages ?? (await fixturePages()), cover: new Uint8Array(fixture("cover.jpg")), date, version: "0.0.0-test", owner: "Camille Exemple & Cie" });
}

test("crc32 et uuidv5 conformes aux valeurs de référence", async () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  // Python : uuid.uuid5(uuid.NAMESPACE_URL, "https://example.org/")
  assert.equal(await uuidv5("https://example.org/"), "527dda32-a0de-5105-a042-cb475b5f7d11");
});

test("dateFr", () => {
  assert.equal(dateFr(new Date(2026, 10, 1)), "1er novembre 2026");
  assert.equal(dateFr(new Date(2026, 10, 16)), "16 novembre 2026");
});

test("structure de l'archive EPUB", async () => {
  const { bytes } = await build();
  const entries = await unzip(bytes);
  assert.equal(entries[0].name, "mimetype");
  assert.equal(entries[0].method, 0);
  assert.equal(entries[0].text(), "application/epub+zip");
  const names = entries.map((e) => e.name);
  for (const n of ["META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml", "OEBPS/toc.ncx",
    "OEBPS/style.css", "OEBPS/images/cover.jpg", "OEBPS/text/cover.xhtml", "OEBPS/text/garde.xhtml",
    "OEBPS/text/colophon.xhtml", "OEBPS/text/p01.xhtml", "OEBPS/text/p02-titre.xhtml", "OEBPS/text/p06.xhtml"]) {
    assert.ok(names.includes(n), `${n} manquant`);
  }
  assert.deepEqual(entries.find((e) => e.name.endsWith("cover.jpg")).data, new Uint8Array(fixture("cover.jpg")));
});

test("OPF : métadonnées, ordre de lecture avec sommaire en fin", async () => {
  const entries = await unzip((await build()).bytes);
  const opf = entries.find((e) => e.name === "OEBPS/content.opf").text();
  assert.match(opf, /<dc:title id="title">L’Avenir en commun \(copie personnelle\)<\/dc:title>/);
  assert.match(opf, /<dc:rights>Copie privée générée par l’utilisateur – ne pas rediffuser<\/dc:rights>/);
  assert.match(opf, /<dc:source>https:\/\/melenchon2027\.fr\/programme\/livre\/<\/dc:source>/);
  assert.match(opf, /<meta property="dcterms:modified">2026-11-16T10:30:00Z<\/meta>/);
  const order = [...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["cover", "garde", "p01", "p02-titre", "p02", "p03", "p04", "p05-titre", "p05", "p06", "colophon", "nav"]);
});

test("sommaire sur trois niveaux : partie > chapitre > section", async () => {
  const { bytes, toc } = await build();
  assert.deepEqual(toc.map((n) => [n.title, n.children.map((c) => c.title)]), [
    ["Introduction", []],
    ["Partie 1 – Le premier thème", ["Chapitre 1 : Les fondations", "Chapitre 2 : Les murs"]],
    ["Partie 2 – Le second thème", ["Chapitre 1 : Le toit"]],
  ]);
  assert.deepEqual(toc[1].children[0].children.map((s) => s.href),
    ["text/p03.xhtml#premiere-section", "text/p03.xhtml#s-2027-une-section-sans-identifiant"]);
  const nav = (await unzip(bytes)).find((e) => e.name === "OEBPS/nav.xhtml").text();
  assert.match(nav, /<a href="text\/p02-titre\.xhtml">Partie 1 – Le premier thème<\/a>/);
  assert.match(nav, /epub:type="landmarks"/);
});

test("page de garde : copie privée, projet indépendant, édition papier", async () => {
  const garde = (await unzip((await build()).bytes)).find((e) => e.name === "OEBPS/text/garde.xhtml").text();
  assert.match(garde, /pour son usage personnel exclusif/);
  assert.match(garde, /href="https:\/\/www\.legifrance\.gouv\.fr\/codes\/article_lc\/LEGIARTI000048603495"/);
  assert.match(garde, /Ne pas rediffuser/);
  assert.match(garde, /16 novembre 2026/);
  assert.match(garde, /Projet indépendant/);
  assert.match(garde, /édition papier/);
});

test("même texte, même identifiant et même fichier", async () => {
  const a = await build();
  const b = await build();
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.hashes.length, 6);
  const pages = await fixturePages();
  pages[5].html = pages[5].html.replace("Fin du livre", "Fin modifiée du livre");
  const c = await build(pages);
  assert.notEqual(a.sha256, c.sha256);
  const id = async (r) => (await unzip(r.bytes)).find((e) => e.name === "OEBPS/content.opf").text().match(/urn:uuid:[0-9a-f-]+/)[0];
  assert.equal(await id(a), await id(b));
  assert.notEqual(await id(a), await id(c));
});

test("nom de la personne : normalisé, validé", () => {
  assert.equal(normalizeOwner("  Camille \n  Exemple\t"), "Camille Exemple");
  assert.equal(validateOwner(" Cam "), "Cam");
  assert.throws(() => validateOwner(" x "), /Indiquez votre nom/);
  assert.throws(() => validateOwner("a".repeat(61)), /au plus 60/);
});

test("horodatage en français avec fuseau", () => {
  assert.match(dateTimeFr(new Date(2026, 10, 16, 14, 5)), /^16 novembre 2026 à 14 h 05 \(UTC[+−]\d+(:\d\d)?\)$/);
});

test("le nom figure sur la page de garde et le colophon, jamais dans les métadonnées", async () => {
  const entries = await unzip((await build()).bytes);
  const get = (n) => entries.find((e) => e.name === n).text();
  assert.match(get("OEBPS/text/garde.xhtml"), /Copie privée réalisée par Camille Exemple &amp; Cie le 16 novembre 2026 à \d+ h \d\d \(UTC/);
  assert.match(get("OEBPS/text/colophon.xhtml"), /Copie privée de Camille Exemple &amp; Cie/);
  for (const n of ["OEBPS/content.opf", "OEBPS/toc.ncx", "OEBPS/nav.xhtml"]) assert.doesNotMatch(get(n), /Camille/);
});

test("sans nom, pas de génération", async () => {
  await assert.rejects(buildEpub({ pages: await fixturePages(), cover: new Uint8Array(fixture("cover.jpg")), date, version: "x" }), /Nom/);
});
