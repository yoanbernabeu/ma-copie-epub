# Ma copie EPUB

[![CI](https://github.com/yoanbernabeu/ma-copie-epub/actions/workflows/ci.yml/badge.svg)](https://github.com/yoanbernabeu/ma-copie-epub/actions/workflows/ci.yml) [![Structure du site](https://github.com/yoanbernabeu/ma-copie-epub/actions/workflows/check-site.yml/badge.svg)](https://github.com/yoanbernabeu/ma-copie-epub/actions/workflows/check-site.yml)

Extension Chrome qui génère **dans votre navigateur** une copie EPUB personnelle du programme publié sur <https://melenchon2027.fr/programme/livre/>, pour le lire sur liseuse (Kobo, PocketBook, Kindle…) ou dans une application de lecture.

> **Site et guide d'installation illustré : <https://yoanbernabeu.github.io/ma-copie-epub/>**
>
> Un projet [YoanDev](https://yoandev.co). **Projet indépendant**, sans lien avec La France insoumise. Ce dépôt ne contient **aucun extrait du texte** : il distribue uniquement un outil.

## Cadre juridique

Le texte publié sur le site est protégé par le droit d'auteur. Les mentions légales du site réservent sa reproduction, sous réserve des exceptions prévues par la loi, dont la **copie privée** (article L122-5 2° du Code de la propriété intellectuelle).

L'extension s'inscrit dans ce cadre :

- **la source est licite** : le texte est lu sur le site officiel, tel qu'un visiteur le voit, sans contourner aucune protection ;
- **la copie est faite par l'utilisateur** : c'est son navigateur, sur sa machine, qui lit les pages et assemble le fichier ;
- **l'usage est strictement privé** : le fichier n'est ni hébergé, ni partagé, ni envoyé où que ce soit. Il ne doit pas être rediffusé.

L'édition papier est disponible en librairie aux [Éditions La Dispute](https://ld-es.fr/catalogue/la-dispute/l-avenir-en-commun).

## Installer l'extension

L'extension n'est pas publiée sur le Chrome Web Store. Elle s'installe en quelques minutes depuis GitHub :

1. Téléchargez le fichier `ma-copie-epub.zip` de la [dernière version](https://github.com/yoanbernabeu/ma-copie-epub/releases/latest).
2. Décompressez-le dans un dossier que vous garderez (par exemple `Documents/ma-copie-epub`).
3. Ouvrez `chrome://extensions` dans la barre d'adresse.
4. Activez le **Mode développeur** (interrupteur en haut à droite).
5. Cliquez sur **Charger l'extension non empaquetée** et choisissez le dossier décompressé.
6. Épinglez l'extension : icône en forme de pièce de puzzle, puis l'épingle à côté de « Ma copie EPUB ».

Fonctionne avec Chrome et les navigateurs basés sur Chromium (Edge, Brave, Vivaldi, Opera), version 120 ou plus récente. Les navigateurs mobiles n'acceptent pas les extensions.

**Mettre à jour** : remplacez le contenu du dossier par celui de la nouvelle version, puis cliquez sur ↻ (Recharger) sur la carte de l'extension dans `chrome://extensions`.

## Générer son EPUB

1. Cliquez sur l'icône de l'extension, puis sur **Générer mon EPUB**.
2. Indiquez votre nom (ou un pseudonyme) : il est inscrit sur la couverture et la page de garde de votre copie, avec la date et l'heure de création. Il n'est envoyé nulle part ni conservé.
3. Un onglet s'ouvre et lit les pages une par une (une page par seconde, pour ne pas surcharger le site). Comptez environ une minute.
4. Le fichier `programme-2027_AAAA-MM-JJ.epub` est téléchargé. Le résumé affiche le nombre de pages, la taille et l'empreinte SHA-256 du fichier.

**Sur votre liseuse** :

- **Kobo, PocketBook, Vivlio** : branchez la liseuse à l'ordinateur et copiez le fichier dans sa mémoire.
- **Kindle** : envoyez le fichier avec [Send to Kindle](https://www.amazon.fr/sendtokindle).
- **Ordinateur** : Apple Livres, [Thorium Reader](https://thorium.edrlab.org/fr/) ou Calibre.

## Vie privée

Aucune donnée collectée. L'extension ne contacte que `melenchon2027.fr`, n'a accès à aucun autre site, ne lit pas vos onglets et n'envoie rien. Permissions : uniquement l'accès à `https://melenchon2027.fr/*`.

## Pour les mainteneurs

```
extension/            dossier chargé tel quel par Chrome (aucune étape de build)
  manifest.json
  popup.html/.js      avertissement et bouton
  generator.html/.js  lecture des pages, progression, téléchargement
  src/config.js       ← seul fichier à modifier si le site change de maquette
  src/toc.js          table des matières → liste ordonnée des pages
  src/extract.js      isolement de <main>, nettoyage, structure
  src/epub.js         assemblage EPUB 3 (OPF, nav, NCX, page de garde)
  src/cover.js        couverture JPEG générée (OffscreenCanvas)
  src/zip.js          écrivain ZIP minimal (deflate natif)
tests/                tests sur pages synthétiques (aucun texte réel)
scripts/              EPUB de test, vérification du site, empaquetage
docs/PRD.md           spécification
```

```sh
npm install
npm test               # tests unitaires (Node 24)
npm run fixture-epub   # dist/fixture.epub à partir des pages synthétiques
epubcheck dist/fixture.epub
npm run check-site     # vérifie la structure du site réel (n'affiche aucun texte)
npm run package        # dist/ma-copie-epub.zip
```

Si le site change de maquette, la génération s'arrête avec un message explicite plutôt que de produire un fichier incomplet. Le workflow « Structure du site » le détecte chaque semaine.

**Publier une version** : mettre à jour `version` dans `extension/manifest.json` et `package.json`, puis pousser un tag `vX.Y.Z`. La CI teste, valide l'EPUB de test avec EPUBCheck, joint le ZIP à la release avec son empreinte SHA-256, puis déploie le site sur GitHub Pages en y affichant cette empreinte. Le site n'est déployé qu'au moment d'une version, pour que le lien de téléchargement et l'empreinte correspondent toujours. (À la première mise en place : *Settings → Pages → Source : GitHub Actions*.)

Si le site source refuse l'accès automatique (codes 401, 403, 429, 503 ou page de vérification anti-robot), l'extension s'arrête avec un message explicite et ne tente jamais de contourner le blocage.

**Règle absolue** : aucune contribution ne doit ajouter au dépôt un extrait du texte (fixtures, captures, exemples). Les tests utilisent uniquement des pages inventées qui reproduisent la structure HTML du site.

## Contribuer : issue d'abord

Les pull requests ne sont pas acceptées : elles sont fermées automatiquement. Ouvrez une [issue](https://github.com/yoanbernabeu/ma-copie-epub/issues/new/choose) pour signaler un problème ou proposer une idée ; le mainteneur l'implémente. **Ne collez jamais d'extrait du programme dans une issue.** Détails dans [CONTRIBUTING.md](CONTRIBUTING.md), failles de sécurité dans [SECURITY.md](SECURITY.md).

## Automatisations

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| `ci.yml` | chaque push, chaque tag `vX.Y.Z` | Tests, validation EPUBCheck de l'EPUB de test, ZIP de l'extension. Sur un tag : release GitHub avec le ZIP et son empreinte, puis déploiement du site sur GitHub Pages. |
| `check-site.yml` | chaque lundi | Vérifie la structure du site source et compare le texte à la version de référence (compteurs uniquement). Ouvre une issue si la structure change ou si le texte diffère. |
| `close-pull-requests.yml` | à l'ouverture d'une PR | Ferme la PR avec un message renvoyant vers les issues (sauf Dependabot). |
| Dependabot | chaque mois | Mises à jour des actions GitHub et des dépendances npm. |

## Licence

Le code est sous licence [MIT](LICENSE). Elle ne couvre que le code, jamais le texte généré. La police Bricolage Grotesque est sous licence [SIL Open Font License](extension/fonts/OFL.txt).
