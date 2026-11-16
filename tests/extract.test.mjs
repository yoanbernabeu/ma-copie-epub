import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture, fixturePages } from "./helpers.mjs";
import { Book, mainOf, slugify, splitTitle } from "../extension/src/extract.js";

async function render(index) {
  const pages = await fixturePages();
  const book = new Book(pages.map((p) => p.page));
  const { page, html } = pages[index];
  return { book, ...book.pageBody(page, mainOf(html, page.url), page.url) };
}

test("mainOf échoue explicitement sans <main>", () => {
  assert.throws(() => mainOf(fixture("no-main.html"), "https://melenchon2027.fr/x"), /pas de <main>/);
});

test("splitTitle et slugify", () => {
  assert.deepEqual(splitTitle("Partie 1 – Le premier thème"), ["Partie 1", "Le premier thème"]);
  assert.deepEqual(splitTitle("Chapitre 2 : Les murs"), ["Chapitre 2", "Les murs"]);
  assert.deepEqual(splitTitle("Introduction"), ["", "Introduction"]);
  assert.equal(slugify("Première section"), "premiere-section");
  assert.equal(slugify("2027 : une année"), "s-2027-une-annee");
});

test("introduction : titre dédoublonné, signature dans l'en-tête, nettoyage", async () => {
  const { title, body, sections } = await render(0);
  assert.equal(title, "Introduction");
  assert.deepEqual(sections, []);
  assert.match(body, /^<section class="introduction" epub:type="introduction">/);
  assert.match(body, /<header class="ouverture"><h1>Introduction<\/h1><p class="signature"><em>de Camille Exemple<\/em><\/p><hr class="filet"\/><\/header>/);
  assert.equal((body.match(/>Introduction</g) || []).length, 1);
  assert.doesNotMatch(body, /style=|onclick|wp-block|<script|Pied de page|Menu/);
  assert.match(body, /&amp; des caractères spéciaux comme « guillemets » et &lt;chevrons&gt;/);
  assert.match(body, /href="\.\.\/text\/p03\.xhtml#premiere-section"/);
  assert.match(body, /href="https:\/\/exemple\.org\/page"/);
});

test("partie : page d'ouverture séparée, sommaire interne et liens « suivant » retirés", async () => {
  const { title, body, sections, titlePage } = await render(1);
  assert.equal(title, "Partie 1 – Le premier thème");
  assert.deepEqual(sections, []);
  assert.equal(titlePage,
    '<section class="page-partie" epub:type="part"><header class="ouverture"><p class="numero">Partie 1</p><h1>Le premier thème</h1><hr class="filet"/></header></section>');
  assert.doesNotMatch(body, /<nav|Suivant|fa-leaf|<h2/);
  assert.match(body, /Texte d’ouverture inventé/);
});

test("chapitre : en-tête d'ouverture, sections en h2, mesures conservées", async () => {
  const { book, title, body, sections } = await render(2);
  assert.equal(title, "Chapitre 1 : Les fondations");
  assert.deepEqual(sections, [
    ["premiere-section", "Première section"],
    ["s-2027-une-section-sans-identifiant", "2027 : une section sans identifiant"],
  ]);
  assert.match(body, /<header class="ouverture"><p class="numero">Chapitre 1<\/p><h1 id="chapitre1">Les fondations<\/h1><hr class="filet"\/><\/header>/);
  assert.match(body, /<h2 id="premiere-section">Première section<\/h2>/);
  assert.match(body, /<div class="mesure-cle">\s*<p class="label">Mesure clé<\/p>/);
  assert.match(body, /<li class="mesure">Première proposition d’exemple<\/li>/);
  assert.match(body, /<li class="groupe"><ul><li class="sous_mesure">/);
  assert.match(body, /<span class="siecle">xxi<\/span><sup>e<\/sup>/);
  assert.doesNotMatch(body, /<h3|<img|<figure|section-title|Partie 1/);
  assert.match(body, /Légende/); // contenu des balises inattendues conservé
  assert.deepEqual(book.warnings.map((w) => w.split(" : ")[1]).sort(),
    ["balise inattendue <figcaption>", "balise inattendue <figure>", "balise inattendue <img>"]);
});
