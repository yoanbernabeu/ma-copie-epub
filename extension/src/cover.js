import { BOOK } from "./config.js";

const W = 1600;
const H = 2560;
const RED = "#e4312b";
const LIGHT = "#fff6ec";
const PLUM = "#3b1240";

async function loadFonts() {
  const faces = [
    new FontFace("Bricolage", `url(${chrome.runtime.getURL("fonts/bricolage-grotesque-latin-500-normal.woff2")})`, { weight: "500" }),
    new FontFace("Bricolage", `url(${chrome.runtime.getURL("fonts/bricolage-grotesque-latin-800-normal.woff2")})`, { weight: "800" }),
  ];
  for (const f of faces) document.fonts.add(await f.load());
}

/** Couverture typographique JPEG 1600×2560 (Kindle ignore les couvertures SVG). */
export async function makeCover(owner) {
  await loadFonts();
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PLUM;
  ctx.beginPath();
  ctx.arc(W - 90, H - 30, 850, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 66px Bricolage";
  ctx.fillText(BOOK.author, 140, 236);

  ctx.fillStyle = LIGHT;
  ctx.font = "800 232px Bricolage";
  ctx.letterSpacing = "-7px";
  BOOK.coverTitle.forEach((line, i) => ctx.fillText(line, 140, 760 + i * 214));
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 82px Bricolage";
  const subTop = 760 + BOOK.coverTitle.length * 214 + 110;
  BOOK.coverSubtitle.forEach((line, i) => ctx.fillText(line, 140, subTop + i * 98));

  // « Copie personnelle de … » : réduit la taille si le nom est long
  const line = `Copie personnelle de ${owner}`;
  let size = 50;
  do {
    ctx.font = `500 ${size}px Bricolage`;
    size -= 2;
  } while (ctx.measureText(line).width > W - 280 && size > 24);
  ctx.fillText(line, 140, H - 218);
  ctx.font = "500 50px Bricolage";
  ctx.fillText("Ne pas rediffuser", 140, H - 150);

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
  return new Uint8Array(await blob.arrayBuffer());
}
