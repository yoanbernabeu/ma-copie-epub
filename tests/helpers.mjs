// Environnement DOM pour Node (le navigateur fournit ces API nativement).
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("");
globalThis.DOMParser = window.DOMParser;

const FIX = new URL("./fixtures/", import.meta.url);
export const fixture = (name) => readFileSync(new URL(name, FIX), name.endsWith(".jpg") ? undefined : "utf8");

/** Pages de la table des matières associées à leur fixture HTML. */
export async function fixturePages() {
  const { parseToc } = await import("../extension/src/toc.js");
  const pages = parseToc(fixture("toc.html"));
  return pages.map((page) => {
    const name = page.path.replace("/programme/livre/", "").replace("/", "-") + ".html";
    return { page, html: fixture(name) };
  });
}

/** Lecture minimale d'un ZIP (entrées stockées ou deflate). */
export async function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const method = view.getUint16(pos + 8, true);
    const size = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 30, pos + 30 + nameLen));
    const start = pos + 30 + nameLen + extraLen;
    let data = bytes.subarray(start, start + size);
    if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    entries.push({ name, method, data, text: () => new TextDecoder().decode(data) });
    pos = start + size;
  }
  return entries;
}
