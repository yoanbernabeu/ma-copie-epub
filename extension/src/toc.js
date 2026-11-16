import { BASE, PREFIX, TOC_URL } from "./config.js";

/** Chemin normalisé d'un lien vers une page du livre, ou null. */
export function normPath(href) {
  let u;
  try {
    u = new URL(href, TOC_URL);
  } catch {
    return null;
  }
  if (u.origin !== new URL(BASE).origin) return null;
  const path = u.pathname.replace(/\/+$/, "");
  if (!path.startsWith(PREFIX) || path === PREFIX.replace(/\/$/, "")) return null;
  return path;
}

/** introduction, partie (1 niveau) ou chapitre (2 niveaux). */
export function kindOf(path) {
  const parts = path.slice(PREFIX.length).split("/");
  if (parts.length === 1 && parts[0] === "introduction") return "introduction";
  return parts.length === 1 ? "partie" : "chapitre";
}

/** Liste ordonnée et dédupliquée des pages, à partir du HTML de la table des matières. */
export function parseToc(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scope = doc.querySelector("main") || doc.body;
  const seen = new Set();
  const pages = [];
  for (const a of scope.querySelectorAll("a[href]")) {
    const path = normPath(a.getAttribute("href"));
    if (path && !seen.has(path)) {
      seen.add(path);
      pages.push({ path, url: BASE + path, kind: kindOf(path) });
    }
  }
  return pages;
}
