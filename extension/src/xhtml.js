// Sérialisation XHTML maison : sortie déterministe, seuls les attributs
// autorisés, entités échappées, éléments vides fermés.

const VOID = new Set(["br", "hr"]);
const ATTRS = ["id", "class", "href", "epub:type"];

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serialize(node) {
  if (node.nodeType === 3) return esc(node.nodeValue).replace(/&quot;/g, '"');
  if (node.nodeType !== 1) return "";
  const tag = node.localName;
  let out = `<${tag}`;
  for (const name of ATTRS) {
    const v = node.getAttribute(name);
    if (v !== null && v !== "") out += ` ${name}="${esc(v)}"`;
  }
  if (VOID.has(tag)) return out + "/>";
  out += ">";
  for (const child of node.childNodes) out += serialize(child);
  return out + `</${tag}>`;
}

export function page(title, body, { css = "../style.css", bodyClass = "" } = {}) {
  const cls = bodyClass ? ` class="${bodyClass}"` : "";
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="fr" lang="fr">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<link rel="stylesheet" type="text/css" href="${css}"/>
</head>
<body${cls}>
${body}
</body>
</html>
`;
}

/** Lève une erreur si le document XML est mal formé. */
export function assertWellFormed(name, xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error(`XML mal formé dans ${name} : ${err.textContent.trim().slice(0, 200)}`);
}
