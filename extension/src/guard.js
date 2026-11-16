// Détecte un refus d'accès du site : l'extension s'arrête alors, sans jamais
// tenter de contourner le blocage.

export const BLOCKED_STATUSES = new Set([401, 403, 429, 503]);

// Signatures d'une page de vérification anti-robot (et non d'une page normale :
// Cloudflare insère /cdn-cgi/challenge-platform/scripts/jsd/main.js dans
// toutes les pages, ce script seul ne signifie donc pas un blocage).
const CHALLENGE_PATTERNS = [
  /<title>\s*(Just a moment|Un instant|Attention Required|Access denied)/i,
  /window\._cf_chl_opt/,
  /id="challenge-(form|running|stage)"/,
  /\/cdn-cgi\/challenge-platform\/h\/[bg]\/orchestrate\//,
];

/** true si la réponse est un refus d'accès ou une page de vérification. */
export function isBlocked(status, html = "") {
  if (BLOCKED_STATUSES.has(status)) return true;
  return CHALLENGE_PATTERNS.some((re) => re.test(html));
}
