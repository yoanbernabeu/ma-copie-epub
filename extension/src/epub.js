import { BOOK, LAW_URL, PAPER_EDITION, TOC_URL } from "./config.js";
import { EPUB_CSS } from "./epub-style.js";
import { Book, mainOf } from "./extract.js";
import { sha256, uuidv5 } from "./hash.js";
import { assertWellFormed, esc, page } from "./xhtml.js";
import { zip } from "./zip.js";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre"];

export function dateFr(d) {
  const day = d.getDate();
  return `${day === 1 ? "1er" : day} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 16 novembre 2026 à 14 h 32 (UTC+1) », dans le fuseau de l'ordinateur. */
export function dateTimeFr(d) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "−";
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const utc = `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
  return `${dateFr(d)} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")} (${utc})`;
}

const isoSeconds = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Assemble l'EPUB.
 * @param {object} o
 * @param {{page: {path: string, url: string, kind: string}, html: string}[]} o.pages  pages HTML récupérées, dans l'ordre
 * @param {Uint8Array} o.cover  couverture JPEG 1600×2560
 * @param {Date} o.date  date de génération
 * @param {string} o.version  version de l'extension
 * @param {string} o.owner  nom ou pseudonyme de la personne qui fait la copie
 */
export async function buildEpub({ pages, cover, date, version, owner }) {
  if (!owner) throw new Error("Nom de la personne qui fait la copie manquant.");
  const book = new Book(pages.map((p) => p.page));
  const files = new Map();
  const hashes = [];

  const mains = pages.map(({ page: p, html }) => mainOf(html, p.url));
  for (const [i, main] of mains.entries()) {
    hashes.push({ url: pages[i].page.url, sha256: await sha256(main.outerHTML) });
  }
  const bookId = await uuidv5(TOC_URL + (await sha256(hashes.map((h) => h.sha256).join(""))));

  const toc = [];
  const spine = [];
  for (const [i, main] of mains.entries()) {
    const p = pages[i].page;
    const n = String(i + 1).padStart(2, "0");
    const { title, body, sections, titlePage } = book.pageBody(p, main, p.url);
    const name = `text/p${n}.xhtml`;
    let href = name;
    if (titlePage) {
      href = `text/p${n}-titre.xhtml`;
      files.set(`OEBPS/${href}`, page(title, titlePage));
      spine.push(href);
    }
    files.set(`OEBPS/${name}`, page(title, body));
    spine.push(name);
    const node = {
      title,
      href,
      kind: p.kind,
      children: sections.map(([id, t]) => ({ title: t, href: `${name}#${id}`, children: [] })),
    };
    const last = toc[toc.length - 1];
    if (p.kind === "chapitre" && last?.kind === "partie") last.children.push(node);
    else toc.push(node);
  }

  const { title, subtitle, author, language } = BOOK;
  const fullTitle = `${title} (copie personnelle)`;
  const genFr = dateFr(date);
  const genTimeFr = dateTimeFr(date);
  const modified = isoSeconds(date);

  files.set("OEBPS/images/cover.jpg", cover);
  const coverAlt = esc(`${title} – ${subtitle}`);
  files.set("OEBPS/text/cover.xhtml", page("Couverture", `<section class="cover" epub:type="cover">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100%" height="100%" viewBox="0 0 1600 2560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${coverAlt}">
<title>${coverAlt}</title>
<image width="1600" height="2560" xlink:href="../images/cover.jpg"/>
</svg>
</section>`, { bodyClass: "cover-page" }));

  files.set("OEBPS/text/garde.xhtml", page("Copie privée", `<section class="garde" epub:type="frontmatter">
<p class="avertissement">Copie privée réalisée par ${esc(owner)} le ${esc(genTimeFr)}, pour son usage personnel exclusif. Ne pas rediffuser.</p>
<p>Ce fichier a été fabriqué dans le navigateur de ${esc(owner)}, à partir du texte publié par ${esc(author)} sur <a href="${esc(TOC_URL)}">${esc(TOC_URL)}</a>, au titre de l’exception de copie privée (<a href="${esc(LAW_URL)}">article L122-5 2° du Code de la propriété intellectuelle</a>) : copie réalisée à partir d’une source licite, strictement réservée à l’usage privé du copiste et non destinée à une utilisation collective.</p>
<p>Le texte reste la propriété de ses auteurs. L’édition papier est disponible en librairie (<a href="${esc(PAPER_EDITION.url)}">${esc(PAPER_EDITION.label)}</a>).</p>
<p><strong>Projet indépendant</strong>, sans lien avec ${esc(author)}.</p>
<p><a href="colophon.xhtml">À propos de cette copie</a></p>
</section>`));

  files.set("OEBPS/text/colophon.xhtml", page("À propos de cette copie", `<section class="colophon" epub:type="colophon">
<h1>À propos de cette copie</h1>
<p><strong>${esc(title)}</strong> — ${esc(subtitle)}<br/>${esc(author)}</p>
<p>Copie privée de ${esc(owner)}, réalisée le ${esc(genTimeFr)}.</p>
<p>Source : <a href="${esc(TOC_URL)}">${esc(TOC_URL)}</a>, lue le ${esc(genFr)}.</p>
<p>Copie privée générée par l’extension Ma copie EPUB ${esc(version)}. Mise en forme pour liseuse : couverture typographique, page de garde, table des matières. Le texte n’est pas modifié.</p>
<p><strong>Projet indépendant</strong>, sans lien avec ${esc(author)}. Ne pas rediffuser.</p>
</section>`));

  const navOl = (nodes, depth = 0) => {
    const pad = "  ".repeat(depth);
    const out = [`${pad}<ol>`];
    for (const n of nodes) {
      out.push(`${pad}  <li><a href="${n.href}">${esc(n.title)}</a>`);
      if (n.children.length) out.push(navOl(n.children, depth + 2));
      out.push(`${pad}  </li>`);
    }
    out.push(`${pad}</ol>`);
    return out.join("\n");
  };
  const navNodes = [
    { title: "Couverture", href: "text/cover.xhtml", children: [] },
    ...toc,
    { title: "À propos de cette copie", href: "text/colophon.xhtml", children: [] },
  ];
  files.set("OEBPS/nav.xhtml", page("Table des matières",
    `<nav epub:type="toc" id="toc"><h1>Table des matières</h1>\n${navOl(navNodes)}\n</nav>\n` +
    `<nav epub:type="landmarks" hidden="hidden"><ol>` +
    `<li><a epub:type="cover" href="text/cover.xhtml">Couverture</a></li>` +
    `<li><a epub:type="bodymatter" href="${spine[0]}">Début</a></li>` +
    `<li><a epub:type="toc" href="#toc">Table des matières</a></li>` +
    `</ol></nav>`, { css: "style.css" }));

  let counter = 0;
  const ncxPoints = (nodes) => nodes.map((n) => {
    counter += 1;
    return `<navPoint id="np${counter}" playOrder="${counter}"><navLabel><text>${esc(n.title)}</text></navLabel>` +
      `<content src="${n.href}"/>${ncxPoints(n.children)}</navPoint>`;
  }).join("");
  files.set("OEBPS/toc.ncx", `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="fr">
<head><meta name="dtb:uid" content="urn:uuid:${bookId}"/><meta name="dtb:depth" content="3"/></head>
<docTitle><text>${esc(fullTitle)}</text></docTitle>
<navMap>${ncxPoints(navNodes)}</navMap>
</ncx>
`);

  files.set("OEBPS/style.css", EPUB_CSS);

  // Le sommaire complet est en fin d'ouvrage : les liseuses l'utilisent pour
  // leur menu de navigation quelle que soit sa position.
  const readingOrder = ["text/cover.xhtml", "text/garde.xhtml", ...spine, "text/colophon.xhtml", "nav.xhtml"];
  const ids = new Map([
    ["text/cover.xhtml", "cover"], ["text/garde.xhtml", "garde"],
    ["nav.xhtml", "nav"], ["text/colophon.xhtml", "colophon"],
  ]);
  const items = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="css" href="style.css" media-type="text/css"/>',
    '<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
    '<item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml" properties="svg"/>',
    '<item id="garde" href="text/garde.xhtml" media-type="application/xhtml+xml"/>',
    '<item id="colophon" href="text/colophon.xhtml" media-type="application/xhtml+xml"/>',
  ];
  for (const name of spine) {
    const id = name.slice(5, -6); // text/p01.xhtml -> p01
    ids.set(name, id);
    items.push(`<item id="${id}" href="${name}" media-type="application/xhtml+xml"/>`);
  }
  const itemrefs = readingOrder.map((n) => `<itemref idref="${ids.get(n)}"/>`).join("\n    ");

  files.set("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="fr">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${bookId}</dc:identifier>
    <dc:title id="title">${esc(fullTitle)}</dc:title>
    <meta refines="#title" property="title-type">main</meta>
    <dc:title id="subtitle">${esc(subtitle)}</dc:title>
    <meta refines="#subtitle" property="title-type">subtitle</meta>
    <dc:creator id="author">${esc(author)}</dc:creator>
    <meta refines="#author" property="role" scheme="marc:relators">aut</meta>
    <dc:language>${language}</dc:language>
    <dc:source>${esc(TOC_URL)}</dc:source>
    <dc:rights>Copie privée générée par l’utilisateur – ne pas rediffuser</dc:rights>
    <meta property="dcterms:modified">${modified}</meta>
    <meta name="cover" content="cover-image"/>
    <meta property="schema:accessMode">textual</meta>
    <meta property="schema:accessMode">visual</meta>
    <meta property="schema:accessModeSufficient">textual</meta>
    <meta property="schema:accessibilityFeature">structuralNavigation</meta>
    <meta property="schema:accessibilityFeature">tableOfContents</meta>
    <meta property="schema:accessibilityFeature">readingOrder</meta>
    <meta property="schema:accessibilityFeature">alternativeText</meta>
    <meta property="schema:accessibilityFeature">displayTransformability</meta>
    <meta property="schema:accessibilityHazard">none</meta>
    <meta property="schema:accessibilitySummary">Texte sans mise en page fixe : taille, police, interlignage et contraste sont réglables par le lecteur. Titres hiérarchisés (parties, chapitres, sections), table des matières complète, ordre de lecture linéaire, langue déclarée (français). La seule image, la couverture, a un texte alternatif. Compatible avec la synthèse vocale et les lecteurs d’écran.</meta>
  </metadata>
  <manifest>
    ${items.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${itemrefs}
  </spine>
</package>
`);

  files.set("META-INF/container.xml", `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`);

  for (const [name, data] of files) {
    if (typeof data === "string" && /\.(xhtml|opf|ncx|xml)$/.test(name)) assertWellFormed(name, data);
  }

  const entries = [{ name: "mimetype", data: "application/epub+zip", store: true }];
  for (const name of [...files.keys()].sort()) {
    entries.push({ name, data: files.get(name), store: name.endsWith(".jpg") });
  }
  const bytes = await zip(entries);
  return { bytes, warnings: book.warnings, hashes, sha256: await sha256(bytes), toc };
}
