import { ALLOWED_TAGS, BASE, KEEP_CLASSES, PREFIX, REMOVE_SELECTORS, TITLE_PATTERN } from "./config.js";
import { serialize } from "./xhtml.js";

export const textOf = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

export function slugify(s) {
  const slug = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return "section";
  return /^[a-z]/.test(slug) ? slug : `s-${slug}`;
}

/** « Partie 1 – Titre » -> ["Partie 1", "Titre"] */
export function splitTitle(title) {
  const m = title.match(TITLE_PATTERN);
  return m ? [m[1], m[2]] : ["", title];
}

/** Isole le <main> d'une page HTML. Échoue si la structure a changé. */
export function mainOf(html, url) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const main = doc.querySelector("main");
  if (!main || !textOf(main)) {
    throw new Error(`Contenu introuvable (pas de <main>) dans ${url} : la structure du site a peut-être changé.`);
  }
  return main;
}

function rename(el, tag) {
  const doc = el.ownerDocument;
  const n = doc.createElement(tag);
  for (const a of el.attributes) n.setAttribute(a.name, a.value);
  while (el.firstChild) n.appendChild(el.firstChild);
  el.replaceWith(n);
  return n;
}

function unwrap(el) {
  el.replaceWith(...el.childNodes);
}

function make(doc, tag, attrs = {}, text) {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}

/** En-tête d'ouverture : petit numéro, grand titre, filet. */
function opener(doc, numero, titre, h1Id) {
  const header = make(doc, "header", { class: "ouverture" });
  if (numero) header.append(make(doc, "p", { class: "numero" }, numero));
  header.append(make(doc, "h1", { id: h1Id }, titre));
  header.append(make(doc, "hr", { class: "filet" }));
  return header;
}

export class Book {
  /** @param {{path: string, kind: string}[]} pages */
  constructor(pages) {
    this.pathToFile = new Map(pages.map((p, i) => [p.path, `text/p${String(i + 1).padStart(2, "0")}.xhtml`]));
    this.warnings = [];
  }

  rewriteHref(href) {
    if (href.startsWith("#")) return href;
    let u;
    try {
      u = new URL(href, BASE + PREFIX);
    } catch {
      return null;
    }
    if (!/^(https?|mailto):$/.test(u.protocol)) return null;
    if (u.origin === new URL(BASE).origin) {
      const target = this.pathToFile.get(u.pathname.replace(/\/+$/, ""));
      if (target) return "../" + target + u.hash;
    }
    return u.href;
  }

  clean(main, src) {
    for (const sel of REMOVE_SELECTORS) for (const el of main.querySelectorAll(sel)) el.remove();
    // Balises inattendues : signalées puis remplacées par leur contenu
    for (const el of [...main.querySelectorAll("*")]) {
      if (!ALLOWED_TAGS.has(el.localName)) {
        this.warnings.push(`${src} : balise inattendue <${el.localName}>`);
        unwrap(el);
      }
    }
    for (const el of main.querySelectorAll("*")) {
      const id = el.getAttribute("id");
      const href = el.localName === "a" ? el.getAttribute("href") : null;
      const classes = (el.getAttribute("class") || "").split(/\s+/).filter((c) => KEEP_CLASSES.has(c));
      for (const a of [...el.attributes]) el.removeAttribute(a.name);
      if (id) el.setAttribute("id", id);
      if (href) {
        const h = this.rewriteHref(href);
        if (h) el.setAttribute("href", h);
      }
      if (classes.length) el.setAttribute("class", classes.join(" "));
    }
    for (const span of [...main.querySelectorAll("span:not([class])")]) unwrap(span);
    for (const li of main.querySelectorAll("li")) {
      const kids = [...li.childNodes].filter((k) => !(k.nodeType === 3 && !k.nodeValue.trim()));
      if (kids.length === 1 && kids[0].nodeType === 1 && kids[0].localName === "ul") li.setAttribute("class", "groupe");
    }
    for (const h6 of [...main.querySelectorAll("div.mesure-cle > h6")]) {
      const p = rename(h6, "p");
      p.setAttribute("class", "label");
    }
    // Les liens a sans href deviennent du texte
    for (const a of [...main.querySelectorAll("a:not([href])")]) unwrap(a);
  }

  /**
   * Transforme le <main> d'une page.
   * @returns {{title: string, body: string, sections: [string, string][], titlePage: string|null}}
   */
  pageBody(page, main, src) {
    const doc = main.ownerDocument;
    this.clean(main, src);
    const sections = [];
    const usedIds = new Set([...main.querySelectorAll("[id]")].map((e) => e.id));
    const ensureId = (el) => {
      if (el.id) return el.id;
      let id = slugify(textOf(el));
      for (let n = 2; usedIds.has(id); n++) id = `${slugify(textOf(el))}-${n}`;
      usedIds.add(id);
      el.setAttribute("id", id);
      return id;
    };
    let title;
    let titlePage = null;

    if (page.kind === "introduction") {
      const h1 = main.querySelector("h1");
      if (!h1) throw new Error(`${src} : titre de l'introduction introuvable.`);
      title = textOf(h1);
      const firstP = main.querySelector("p");
      if (firstP && textOf(firstP) === title) firstP.remove(); // doublon du titre
      const header = opener(doc, "", title);
      const signature = main.querySelector("p");
      if (signature && signature.querySelector("em") && textOf(signature).startsWith("de ")) {
        signature.setAttribute("class", "signature");
        header.querySelector("hr").before(signature);
      }
      h1.replaceWith(header);
      for (const h2 of main.querySelectorAll("h2")) sections.push([ensureId(h2), textOf(h2)]);
    } else if (page.kind === "partie") {
      const h = main.querySelector("h2");
      if (!h) throw new Error(`${src} : titre de la partie introuvable.`);
      title = textOf(h);
      h.remove();
      // Le sommaire de la partie fait doublon avec celui de la liseuse
      for (const nav of [...main.querySelectorAll("nav")]) nav.remove();
      const [numero, titre] = splitTitle(title);
      const box = make(doc, "section", { class: "page-partie", "epub:type": "part" });
      box.append(opener(doc, numero, titre));
      titlePage = serialize(box);
    } else {
      const header = main.querySelector("header");
      const h1 = header?.querySelector("h1");
      if (!h1) throw new Error(`${src} : titre du chapitre introuvable.`);
      title = textOf(h1);
      const [numero, titre] = splitTitle(title);
      header.replaceWith(opener(doc, numero, titre, h1.id));
      for (const h3 of [...main.querySelectorAll("h3")]) {
        const h2 = rename(h3, "h2");
        sections.push([ensureId(h2), textOf(h2)]);
      }
    }

    const section = rename(main, "section");
    for (const a of [...section.attributes]) section.removeAttribute(a.name);
    const epubType = { chapitre: "chapter", partie: "preamble", introduction: "introduction" }[page.kind];
    section.setAttribute("class", page.kind);
    section.setAttribute("epub:type", epubType);
    return { title, body: serialize(section), sections, titlePage };
  }
}
