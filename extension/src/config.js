// Seul fichier à modifier quand le site change de maquette.
// Il ne contient que des adresses, des sélecteurs et des réglages :
// aucun extrait du texte.

export const BASE = "https://melenchon2027.fr";
export const PREFIX = "/programme/livre/";
export const TOC_URL = `${BASE}${PREFIX}`;

// Politesse envers le serveur : une requête à la fois, au moins 1 s d'écart.
export const DELAY_MS = 1000;
export const TIMEOUT_MS = 30000;

// Métadonnées du livre (titres et auteur, pas de contenu).
export const BOOK = {
  title: "L’Avenir en commun",
  subtitle: "Le programme de la Nouvelle France",
  author: "La France insoumise",
  language: "fr",
  // Lignes du titre sur la couverture générée
  coverTitle: ["L’Avenir", "en commun"],
  coverSubtitle: ["Le programme de", "la Nouvelle France"],
};

export const PAPER_EDITION = {
  label: "Éditions La Dispute",
  url: "https://ld-es.fr/catalogue/la-dispute/l-avenir-en-commun",
};

// Article L122-5 du Code de la propriété intellectuelle (copie privée)
export const LAW_URL = "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048603495";

export const RELEASES_URL = "https://github.com/yoanbernabeu/ma-copie-epub/releases/latest";

// Éléments retirés avant tout traitement
export const REMOVE_SELECTORS = ["span[class*=fa-]", "a.next", "script", "style", "form", "iframe"];

// Classes du site conservées (elles portent la mise en forme des mesures)
export const KEEP_CLASSES = new Set(["mesure-cle", "mesure", "sous_mesure", "siecle"]);

// Balises attendues dans le contenu. Les autres sont signalées, puis
// remplacées par leur contenu.
export const ALLOWED_TAGS = new Set([
  "section", "div", "nav", "header", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "em", "strong", "b", "i", "sup", "sub", "span", "br",
  "blockquote",
]);

// « Partie 1 – Titre » / « Chapitre 1 : Titre »
export const TITLE_PATTERN = /^((?:Partie|Chapitre)\s+\d+)\s*[–:\-]\s*(.+)$/;
