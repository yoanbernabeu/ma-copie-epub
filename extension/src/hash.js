const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256(data) {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}

// Espace de noms URL de la RFC 4122
const NS_URL = "6ba7b8119dad11d180b400c04fd430c8";

/** UUID v5 (SHA-1) : un même nom donne toujours le même identifiant. */
export async function uuidv5(name) {
  const ns = Uint8Array.from(NS_URL.match(/../g), (h) => parseInt(h, 16));
  const n = enc.encode(name);
  const buf = new Uint8Array(ns.length + n.length);
  buf.set(ns);
  buf.set(n, ns.length);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", buf)).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const s = hex(h);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
