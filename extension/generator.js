import { DELAY_MS, LAW_URL, PAPER_EDITION, RELEASES_URL, TIMEOUT_MS, TOC_URL } from "./src/config.js";
import { makeCover } from "./src/cover.js";
import { buildEpub } from "./src/epub.js";
import { mainOf } from "./src/extract.js";
import { compareWithReference, textFingerprint } from "./src/reference-check.js";
import { isBlocked } from "./src/guard.js";
import { validateOwner } from "./src/owner.js";
import { parseToc } from "./src/toc.js";

const $ = (id) => document.getElementById(id);
const version = chrome.runtime.getManifest().version;

$("version").textContent = version;
$("releases").href = RELEASES_URL;
$("law").href = LAW_URL;
$("paper").href = PAPER_EDITION.url;
$("paper").textContent = PAPER_EDITION.label;

let controller = null;
let lastFile = null;
let owner = "";

function setStatus(text, kind = "") {
  $("status").textContent = text;
  $("status").className = `status ${kind}`.trim();
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    }, { once: true });
  });
}

async function getText(url, signal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(url, {
    signal: AbortSignal.any([signal, timeout]),
    credentials: "omit",
    redirect: "follow",
  });
  // Si le site refuse l'accès automatique (blocage, limite de débit, page de
  // vérification anti-robot), l'extension s'arrête : elle ne lit que ce que
  // voit un visiteur et ne contourne aucune protection.
  const text = await res.text();
  if (isBlocked(res.status, text)) {
    const err = new Error(BLOCKED);
    err.detail = res.ok ? "page de vérification" : `code ${res.status}`;
    throw err;
  }
  if (!res.ok) throw new Error(`Le site a répondu ${res.status} pour ${url}.`);
  return text;
}

const BLOCKED = "Le site refuse actuellement l’accès automatique. Par respect pour le site, l’extension s’arrête et ne tente pas de contourner ce blocage. Réessayez plus tard.";

function fileName(date) {
  const p = (n) => String(n).padStart(2, "0");
  return `programme-2027_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.epub`;
}

function download(file) {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Compare le texte récupéré à la version de référence (empreintes seulement).
// Information factuelle : elle ne change rien à l'usage du fichier.
async function showReference(fetched) {
  try {
    const pages = [];
    for (const { page, html } of fetched) pages.push({ path: page.path, fingerprint: await textFingerprint(mainOf(html, page.url)) });
    const r = await compareWithReference(pages);
    const where = `celui publié sur le site le ${r.reference.dateFr}, alors sous licence ${r.reference.license}`;
    const diffs = [...r.changed, ...r.added];
    $("ref-text").textContent = r.identical
      ? `Le texte récupéré est identique à ${where}.`
      : `Le texte récupéré diffère de ${where}${diffs.length ? ` : ${diffs.length} page(s) modifiée(s) ou ajoutée(s)` : ""}${r.missing ? `, ${r.missing} page(s) retirée(s)` : ""}.`;
    $("ref-text").className = r.identical ? "ref-text same" : "ref-text diff";
    $("ref-details").hidden = diffs.length === 0;
    $("ref-list").replaceChildren(...diffs.map((p) => Object.assign(document.createElement("li"), { textContent: p })));
    $("reference").hidden = false;
  } catch {
    $("reference").hidden = true;
  }
}

function showSummary({ ok, failed, size, name, sha, warnings, hashes }) {
  $("summary").hidden = false;
  $("s-pages").textContent = String(ok);
  $("s-failed").textContent = String(failed);
  $("s-size").textContent = size ? `${Math.round(size / 1024)} Ko` : "—";
  $("s-file").textContent = name || "—";
  $("s-sha").textContent = sha || "—";
  $("warnings").hidden = warnings.length === 0;
  $("warnings-list").replaceChildren(...warnings.map((w) => Object.assign(document.createElement("li"), { textContent: w })));
  $("hashes").replaceChildren(...hashes.map((h) => {
    const li = document.createElement("li");
    li.textContent = `${h.url} — ${h.sha256}`;
    return li;
  }));
}

async function run() {
  $("start").hidden = true;
  $("run").hidden = false;
  controller = new AbortController();
  const { signal } = controller;
  $("cancel").hidden = false;
  $("retry").hidden = true;
  $("download").hidden = true;
  $("summary").hidden = true;
  $("next").hidden = true;
  $("reference").hidden = true;
  $("detail").textContent = "";
  $("progress").value = 0;

  const fetched = [];
  let total = 0;
  try {
    setStatus("Lecture de la table des matières…");
    const pages = parseToc(await getText(TOC_URL, signal));
    if (pages.length === 0) throw new Error("Aucune page trouvée dans la table des matières : la structure du site a peut-être changé.");
    total = pages.length;
    $("progress").max = total + 1;

    for (const [i, page] of pages.entries()) {
      await sleep(DELAY_MS, signal);
      setStatus(`Page ${i + 1} / ${total}`);
      $("detail").textContent = page.url;
      fetched.push({ page, html: await getText(page.url, signal) });
      $("progress").value = i + 1;
    }

    setStatus("Comparaison avec la version de référence…");
    await showReference(fetched);

    setStatus("Assemblage du fichier…");
    $("detail").textContent = "";
    const date = new Date();
    const cover = await makeCover(owner);
    const epub = await buildEpub({ pages: fetched, cover, date, version, owner });
    $("progress").value = total + 1;

    lastFile = { name: fileName(date), blob: new Blob([epub.bytes], { type: "application/epub+zip" }) };
    download(lastFile);
    setStatus("Votre EPUB est prêt. Le téléchargement a démarré.", "ok");
    $("download").hidden = false;
    $("next").hidden = false;
    showSummary({
      ok: fetched.length, failed: 0, size: epub.bytes.length, name: lastFile.name,
      sha: epub.sha256, warnings: epub.warnings, hashes: epub.hashes,
    });
  } catch (err) {
    if (signal.aborted && signal.reason?.name !== "TimeoutError") {
      setStatus("Génération annulée.");
    } else {
      setStatus("La génération a échoué.", "error");
      const msg = err?.name === "TimeoutError" ? "Le site ne répond pas (délai dépassé). Réessayez plus tard." : err?.message || String(err);
      if (msg === BLOCKED) {
        $("detail").textContent = `${msg} (${err.detail})`;
      } else {
        $("detail").replaceChildren(
          document.createTextNode(`${msg} Si le problème persiste, vérifiez que vous avez la `),
          Object.assign(document.createElement("a"), { href: RELEASES_URL, target: "_blank", rel: "noopener", textContent: "dernière version de l’extension" }),
          document.createTextNode(` (version installée : ${version}).`),
        );
      }
      if (total) showSummary({ ok: fetched.length, failed: total - fetched.length, warnings: [], hashes: [] });
    }
    $("retry").hidden = false;
  } finally {
    $("cancel").hidden = true;
    controller = null;
  }
}

$("cancel").addEventListener("click", () => controller?.abort(new DOMException("Annulé", "AbortError")));
$("retry").addEventListener("click", run);
$("download").addEventListener("click", () => lastFile && download(lastFile));

// La génération démarre une fois le nom indiqué. Il n'est pas mémorisé.
$("start").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    owner = validateOwner($("owner").value);
  } catch (err) {
    $("owner-error").textContent = err.message;
    $("owner-error").hidden = false;
    $("owner").setAttribute("aria-invalid", "true");
    $("owner").focus();
    return;
  }
  $("owner-error").hidden = true;
  $("owner").removeAttribute("aria-invalid");
  run();
});
$("owner").focus();
