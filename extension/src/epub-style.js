// Feuille de style de l'EPUB. Contraintes Kindle : taille de base explicite,
// pas de marges sur body, ni @media ni unités vw/vh, rien sous 0,85em,
// pas de texte gris. Aucune police embarquée.
export const EPUB_CSS = `html { font-size: 100%; }

body {
  font-size: 1em;
  margin: 0;
  padding: 0;
  line-height: 1.5;
  text-align: justify;
}

h1, h2, h3 {
  text-align: left;
  line-height: 1.25;
  page-break-after: avoid;
}

h1 { font-size: 1.6em; margin: 2em 0 1em; }
h2 { font-size: 1.25em; margin: 1.8em 0 0.6em; }

p { margin: 0 0 0.8em; }

header.ouverture {
  margin: 2em 0 2em;
  text-align: center;
  page-break-after: avoid;
}
header.ouverture .numero {
  margin: 0 0 0.6em;
  font-size: 0.9em;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-align: center;
  color: #c62a24;
}
header.ouverture h1 {
  margin: 0;
  font-size: 1.7em;
  font-weight: normal;
  text-align: center;
}
header.ouverture .signature { margin: 0.8em 0 0; text-align: center; }
hr.filet {
  width: 3em;
  margin: 1.2em auto 0;
  border: 0;
  border-top: 2px solid #c62a24;
}

section.page-partie header.ouverture { margin-top: 6em; }
section.page-partie .numero { font-size: 1em; }
section.page-partie h1 { font-size: 2.1em; line-height: 1.2; }

section.partie { margin-top: 2em; }

ul { margin: 0 0 1em; padding-left: 1.4em; }
li { text-align: left; }
li.mesure, li.sous_mesure { margin-bottom: 0.45em; }
li.groupe { list-style: none; }
li.groupe > ul { margin-top: 0.2em; }
li.sous_mesure { list-style-type: circle; }

.mesure-cle {
  margin: 1.2em 0;
  padding: 0.2em 0 0.2em 0.9em;
  border-left: 0.3em solid #c62a24;
  page-break-inside: avoid;
}
.mesure-cle .label {
  margin: 0 0 0.3em;
  font-size: 0.9em;
  font-weight: bold;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #c62a24;
}
.mesure-cle p { margin-bottom: 0; font-weight: bold; text-align: left; }

.siecle { font-variant: small-caps; }

body.cover-page { margin: 0; padding: 0; text-align: center; }
section.cover { margin: 0; padding: 0; height: 100%; }
section.cover svg { display: block; width: 100%; height: 100%; }

nav ol { list-style: none; padding-left: 1em; text-align: left; }
nav > ol { padding-left: 0; }

section.garde { margin-top: 3em; text-align: left; }
section.garde p { margin: 0 0 0.9em; }
section.garde .avertissement {
  padding: 0.6em 0.8em;
  border: 2px solid #c62a24;
  font-weight: bold;
}
.colophon { text-align: left; }
.colophon h1 { font-size: 1.3em; }
`;
