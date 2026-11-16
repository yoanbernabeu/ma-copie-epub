// Nom (ou pseudonyme) inscrit sur la copie. Il reste dans le fichier : il
// n'est ni envoyé ni conservé par l'extension.

export const OWNER_MIN = 2;
export const OWNER_MAX = 60;

/** Retire les espaces superflues et les caractères de contrôle. */
export function normalizeOwner(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nom normalisé, ou erreur explicite s'il est trop court ou trop long. */
export function validateOwner(raw) {
  const owner = normalizeOwner(raw);
  if (owner.length < OWNER_MIN) throw new Error("Indiquez votre nom (ou un pseudonyme) : il sera inscrit sur votre copie.");
  if (owner.length > OWNER_MAX) throw new Error(`Votre nom doit faire au plus ${OWNER_MAX} caractères.`);
  return owner;
}
