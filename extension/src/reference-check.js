import { sha256 } from "./hash.js";
import { REFERENCE } from "./reference.js";

/** Empreinte du texte d'une page : contenu textuel de <main>, espaces normalisés. */
export async function textFingerprint(main) {
  return sha256(main.textContent.replace(/\s+/g, " ").trim());
}

/** Clé d'une page dans la référence : empreinte de son chemin (aucun titre en clair). */
export async function pathKey(path) {
  return (await sha256(path.replace(/\/+$/, ""))).slice(0, 16);
}

/**
 * Compare les pages récupérées aux empreintes de la version de référence.
 * @param {{path: string, fingerprint: string}[]} pages
 * @returns {Promise<{identical: boolean, changed: string[], added: string[], missing: number, reference: object}>}
 */
export async function compareWithReference(pages, reference = REFERENCE) {
  const changed = [];
  const added = [];
  const seen = new Set();
  for (const p of pages) {
    const k = await pathKey(p.path);
    seen.add(k);
    if (!(k in reference.pages)) added.push(p.path);
    else if (reference.pages[k] !== p.fingerprint) changed.push(p.path);
  }
  const missing = Object.keys(reference.pages).filter((k) => !seen.has(k)).length;
  return { identical: !changed.length && !added.length && !missing, changed, added, missing, reference };
}
