# PRD — Ma copie EPUB

## 1. Objectif

Une extension Chrome open source qui permet à chacun de générer, en un clic et dans son propre navigateur, un EPUB personnel du programme publié sur `https://melenchon2027.fr/programme/livre/`, pour le lire sur liseuse ou dans une application EPUB.

**Principe directeur : on distribue l'outil, jamais le texte.**

## 2. Cadre juridique

Le texte publié sous `/programme/livre/` est protégé par le droit d'auteur (« tous droits réservés »). Les mentions légales du site réservent sa reproduction, sous réserve des exceptions prévues par la loi, dont la copie privée.

L'extension repose sur l'exception de copie privée (art. L122-5 2° CPI) :

- **source licite** : le texte est lu sur le site officiel, en accès libre ;
- **copie réalisée par l'utilisateur** : son navigateur, sur sa machine, produit le fichier ;
- **usage strictement privé** : le fichier n'est ni partagé ni hébergé par le projet.

### Règles non négociables

1. **Zéro contenu embarqué** : ni le dépôt, ni le paquet, ni les tests, ni les artefacts de CI ne contiennent d'extrait du texte. Fixtures synthétiques uniquement.
2. **Source unique** : le texte est lu uniquement sur melenchon2027.fr, depuis le navigateur de l'utilisateur. Aucun serveur intermédiaire, cache, miroir ou CDN.
3. **Génération 100 % locale** : aucun envoi, aucun partage, aucune télémétrie.
4. **Pas de contournement technique** : on ne lit que ce qu'un visiteur voit.
5. **Périmètre strict** : seules les pages sous `/programme/livre/` sont lues.
6. **Pas d'usurpation** : nom générique, aucun logo ni visuel officiel, identité visuelle propre au projet. Le README et l'interface indiquent un projet indépendant, sans lien avec La France insoumise.
7. **Avertissement explicite** : la popup, la page de génération et la page de garde de l'EPUB rappellent que le fichier est une copie privée à ne pas rediffuser, et renvoient vers l'édition papier.
8. **Respect du site** : requêtes séquentielles, au moins 1 s entre deux pages, User-Agent du navigateur non modifié. Si le site refuse l'accès automatique (401, 403, 429, 503, page de vérification anti-robot), l'extension s'arrête et l'explique ; elle ne tente jamais de contourner un blocage.
9. **Ton neutre** : le dépôt et l'interface restent factuels et techniques.

Licence du code : MIT. Elle couvre le code uniquement, jamais le texte généré.

## 3. Utilisateurs et parcours

**Cible** : lecteurs non techniques, sur liseuse (Kobo, PocketBook, Kindle via Send to Kindle) ou application EPUB. Installation guidée en moins de 5 minutes, puis génération en un clic.

**Parcours nominal** :

1. L'utilisateur télécharge le ZIP de l'extension depuis les releases GitHub, le décompresse et le charge via `chrome://extensions` → Mode développeur → Charger l'extension non empaquetée.
2. Il clique sur l'icône : la popup affiche l'avertissement de copie privée, un lien vers l'édition papier et le bouton « Générer mon EPUB ».
3. Le clic ouvre la page de génération dans un nouvel onglet, avec progression (« Page 7 / 30 »).
4. Le navigateur télécharge `programme-2027_AAAA-MM-JJ.epub`.
5. La page affiche un résumé : pages récupérées et en échec, avertissements, taille, empreintes.

**Utilisateur secondaire** : un mainteneur qui adapte `src/config.js` quand le site change de maquette.

## 4. Périmètre fonctionnel

| ID | Exigence | Priorité |
|---|---|---|
| F1 | Bouton unique « Générer mon EPUB » | MVP |
| F2 | Découverte des pages depuis les liens du `<main>` de la table des matières sous `/programme/livre/`, dédupliqués, dans l'ordre du site. Type déduit de l'URL : `introduction`, partie (1 niveau), chapitre (2 niveaux) | MVP |
| F3 | Extraction du seul `<main>` de chaque page ; s'il est absent, échec explicite, sans heuristique de repli | MVP |
| F4 | Nettoyage : icônes, liens « suivant », sommaires internes des parties, attributs et classes du thème retirés ; classes sémantiques des mesures conservées ; liens internes réécrits vers l'EPUB, autres liens en absolu ; balises inattendues signalées puis remplacées par leur contenu | MVP |
| F5 | Structure : page d'ouverture dédiée par partie, en-tête d'ouverture par chapitre (numéro, titre, filet), sections internes en `h2` | MVP |
| F6 | EPUB 3 valide EPUBCheck. Sommaire 3 niveaux (partie → chapitre → section) en fin de livre, landmarks `cover` / `bodymatter` / `toc`, `toc.ncx` | MVP |
| F7 | Progression, bouton Annuler, messages d'erreur clairs avec lien vers la dernière version | MVP |
| F8 | Page de garde : « copie privée réalisée par [nom] le [date, heure, fuseau], pour son usage personnel exclusif — ne pas rediffuser », URL source, « projet indépendant », lien vers l'édition papier | MVP |
| F8b | Avant la génération, champ obligatoire « Votre nom » (pseudonyme accepté, 2 à 60 caractères). Le nom est inscrit sur la couverture (« Copie personnelle de … »), la page de garde et le colophon, jamais dans les métadonnées. Il n'est ni envoyé ni conservé. | MVP |
| F9 | Couverture JPEG 1600×2560 générée dans le navigateur, composition typographique, aucun visuel officiel | MVP |
| F10 | Résumé : pages récupérées / en échec, avertissements, taille, SHA-256 de chaque page et du fichier | MVP |
| F10b | Après le téléchargement, bloc « Et maintenant ? » : comment ouvrir le fichier sur Kobo, Kindle, téléphone, ordinateur | MVP |
| F11 | Options : taille de police, liens externes | v2 |
| F12 | Export Markdown ou HTML | v2 |
| F13 | Version Firefox | v2 |

**Hors périmètre** : hébergement ou partage du texte, synchronisation liseuse, autres sections du site, publication sur un store d'extensions.

## 5. Spécifications techniques

### Socle

Manifest V3, JavaScript vanilla (ES modules), sans framework ni étape de build : le dossier `extension/` se charge tel quel. Chrome 120 minimum.

### Manifest

- `host_permissions` : `https://melenchon2027.fr/*` uniquement.
- `permissions` : aucune. Téléchargement via `<a download>` et URL blob.
- Pas de content script, `tabs`, `scripting`, `storage`, `<all_urls>`. CSP par défaut, aucun code distant, aucun `eval`.

### Architecture

| Fichier | Rôle |
|---|---|
| `popup.html` / `popup.js` | Avertissement, lien édition papier, bouton qui ouvre `generator.html` dans un onglet |
| `generator.html` / `generator.js` | Orchestration : requêtes séquentielles, progression, annulation, assemblage, téléchargement, résumé |
| `src/config.js` | URL, préfixe, délai, métadonnées du livre, classes conservées, balises autorisées, sélecteurs à retirer, motif des titres |
| `src/toc.js` | Liste ordonnée `{path, url, kind}` |
| `src/extract.js` | Isolement de `<main>`, nettoyage, réécriture des liens, en-têtes d'ouverture, sections |
| `src/xhtml.js` | Sérialisation XHTML déterministe, gabarit de page, contrôle de bonne formation |
| `src/epub.js` | OPF, nav, NCX, page de garde, colophon, ZIP |
| `src/cover.js` | Couverture JPEG (`OffscreenCanvas`, police Bricolage Grotesque embarquée dans l'extension) |
| `src/zip.js` | ZIP minimal : CRC32, `CompressionStream('deflate-raw')`, `mimetype` en premier non compressé, dates fixes |
| `src/hash.js` | SHA-256, UUID v5 |

### Format EPUB

```
mimetype
META-INF/container.xml
OEBPS/content.opf
OEBPS/nav.xhtml
OEBPS/toc.ncx
OEBPS/style.css
OEBPS/images/cover.jpg
OEBPS/text/cover.xhtml
OEBPS/text/garde.xhtml
OEBPS/text/pNN.xhtml          (+ pNN-titre.xhtml pour les parties)
OEBPS/text/colophon.xhtml
```

Ordre de lecture : couverture → page de garde → texte → colophon → sommaire.

**Métadonnées** : `dc:title` « … (copie personnelle) », `dc:creator` La France insoumise, `dc:language` fr, `dc:source` URL de la table des matières, `dc:rights` « Copie privée générée par l'utilisateur – ne pas rediffuser », `dcterms:modified` date de génération, `dc:identifier` UUID v5 dérivé de la source et des empreintes des pages (même texte → même identifiant), métadonnées d'accessibilité schema.org.

**Mise en forme** : CSS compatible Kindle (taille de base 100 %, pas de marges sur `body`, ni `@media` ni `vw/vh`, rien sous 0,85em, pas de texte gris), interlignage 1,5, sauts de page avant parties et chapitres, mesures clés signalées par un filet latéral. Aucune police embarquée dans l'EPUB. Cible < 300 Ko.

### Identité visuelle

Palette propre au projet : rouge `#e4312b` (foncé `#a81c18`, texte EPUB `#c62a24`), prune `#3b1240`, crème `#fff6ec`, encre `#22101f`. Police Bricolage Grotesque (OFL) pour l’interface et la couverture. Aucun logo, symbole, photo ni slogan de La France insoumise.

### Tests et CI

- Tests unitaires (Node 24, `node:test`, jsdom) sur pages synthétiques reproduisant la structure du site.
- EPUBCheck en CI sur l'EPUB construit à partir des fixtures.
- Vérification hebdomadaire de la structure du site réel (compteurs uniquement, aucun texte enregistré ni affiché).
- Tag `vX.Y.Z` → ZIP de l'extension joint à la release GitHub.

## 6. Distribution

### Site
Page unique (GitHub Pages, même direction artistique que l'extension) : cadre légal en tête (texte de l'article L122-5 2° et lien Légifrance), bénéfices de l'EPUB, bloc « ce que l'extension peut / ne peut pas faire », tutoriel illustré en 7 étapes, aide aux erreurs fréquentes, FAQ, mentions légales (LCEN). Sur téléphone, le bouton de téléchargement est remplacé par « À faire sur un ordinateur » et « M'envoyer le lien » ; sur Firefox ou Safari, un message invite à ouvrir la page dans Chrome ou Edge. Image de partage Open Graph. Aucun cookie, aucune statistique.

### Extension

Uniquement via GitHub : ZIP de l'extension dans les releases, code source dans le dépôt. Guide d'installation pas à pas dans le README (Chrome et navigateurs Chromium), mise à jour par remplacement du dossier puis « Recharger ».

## 7. Risques

| Risque | Mitigation |
|---|---|
| L'installation en mode développeur rebute les non-techniciens | Guide pas à pas, ZIP prêt à l'emploi |
| Pas de mise à jour automatique | Version affichée sur la page de génération ; en cas d'échec, lien vers la dernière release (aucune vérification automatique, qui impliquerait une requête vers GitHub) |
| Le site change de maquette | Échec explicite, configuration centralisée, vérification hebdomadaire en CI |
| Le site bloque les requêtes automatisées | Requêtes séquentielles espacées, User-Agent normal, message clair |
| Pas d'extension sur mobile | Assumé pour le MVP |
