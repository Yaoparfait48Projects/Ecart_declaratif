/**
 * Accès contrôlé au dossier `uploads/` situé à la RACINE DU PROJET.
 *
 * Ce dossier est délibérément hors de `dashboard/public/` : Next.js ne sert
 * statiquement que `public/`, donc aucun fichier déposé ici n'est joignable
 * autrement que par les routes `/api/uploads`, qui valident systématiquement
 * le nom, le type réel et la taille.
 *
 * Toute la logique de sécurité est regroupée ici pour qu'aucune route ne
 * puisse l'oublier.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Racine du stockage. `dashboard/` est le répertoire de travail du serveur. */
export const DOSSIER_UPLOADS =
  process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), "..", "uploads");

/** 4 Mo : largement suffisant pour un logo ou une capture. */
export const TAILLE_MAX = 4 * 1024 * 1024;

/**
 * Liste blanche stricte. L'extension seule ne prouve rien — chaque entrée
 * porte la signature binaire attendue, vérifiée à l'écriture.
 */
const TYPES_AUTORISES = [
  {
    extension: ".png",
    mime: "image/png",
    signature: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    extension: ".jpg",
    mime: "image/jpeg",
    signature: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    extension: ".webp",
    mime: "image/webp",
    signature: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  {
    extension: ".svg",
    mime: "image/svg+xml",
    // Le SVG est du XML : pas de signature binaire fiable. On exige une
    // balise <svg> et on refuse tout contenu actif (cf. contenuSvgDangereux).
    signature: (b) => /<svg[\s>]/i.test(b.subarray(0, 4096).toString("utf8")),
  },
];

/** `.jpeg` est accepté en entrée mais normalisé en `.jpg`. */
const ALIAS_EXTENSION = { ".jpeg": ".jpg" };

/**
 * Un SVG est un document exécutable : scripts, gestionnaires d'événements et
 * références externes y sont possibles. On refuse le fichier plutôt que de
 * tenter un nettoyage, qui serait contournable.
 */
function contenuSvgDangereux(texte) {
  const motifs = [
    /<script[\s>]/i,
    /<foreignObject[\s>]/i,
    /\son\w+\s*=/i,          // onload, onclick…
    /javascript\s*:/i,
    /<!ENTITY/i,              // entités externes (XXE)
    /<iframe[\s>]/i,
    /<embed[\s>]/i,
    /<object[\s>]/i,
  ];
  return motifs.some((m) => m.test(texte));
}

/**
 * Normalise un nom fourni par le client en un nom de fichier sûr.
 * Retourne `null` si rien d'exploitable n'en ressort.
 *
 * On ne se contente pas de retirer les « ../ » : on reconstruit le nom à
 * partir d'un alphabet restreint, ce qui neutralise aussi les séparateurs
 * exotiques, les caractères de contrôle et les octets nuls.
 */
export function nomSur(nomBrut) {
  if (typeof nomBrut !== "string" || nomBrut.length === 0) return null;

  // `basename` élimine toute composante de chemin, y compris sous Windows.
  const base = path.basename(nomBrut.replace(/\\/g, "/"));
  const extensionBrute = path.extname(base).toLowerCase();
  const extension = ALIAS_EXTENSION[extensionBrute] ?? extensionBrute;
  if (!TYPES_AUTORISES.some((t) => t.extension === extension)) return null;

  const tronc = base
    .slice(0, base.length - extensionBrute.length)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  if (!tronc) return null;
  return `${tronc}${extension}`;
}

/**
 * Résout un nom en chemin absolu, en garantissant qu'il reste dans le dossier.
 * Double protection : nom reconstruit, puis vérification du chemin résolu.
 */
export function cheminSur(nom) {
  const sur = nomSur(nom);
  if (!sur) return null;
  const complet = path.resolve(DOSSIER_UPLOADS, sur);
  const racine = path.resolve(DOSSIER_UPLOADS) + path.sep;
  if (!complet.startsWith(racine)) return null;
  return complet;
}

export function typePour(nom) {
  const extension = path.extname(nom).toLowerCase();
  return TYPES_AUTORISES.find((t) => t.extension === extension) ?? null;
}

export function extensionsAutorisees() {
  return TYPES_AUTORISES.map((t) => t.extension);
}

/**
 * Valide le contenu d'un fichier avant écriture.
 * Retourne `{ ok: true }` ou `{ ok: false, motif }`.
 */
export function validerContenu(nom, octets) {
  const type = typePour(nom);
  if (!type) return { ok: false, motif: "Type de fichier non autorisé." };
  if (octets.length === 0) return { ok: false, motif: "Fichier vide." };
  if (octets.length > TAILLE_MAX) {
    return { ok: false, motif: `Fichier trop volumineux (maximum ${TAILLE_MAX / 1024 / 1024} Mo).` };
  }
  if (!type.signature(octets)) {
    return {
      ok: false,
      motif: "Le contenu ne correspond pas à l'extension annoncée.",
    };
  }
  if (type.extension === ".svg") {
    const texte = octets.toString("utf8");
    if (contenuSvgDangereux(texte)) {
      return { ok: false, motif: "SVG contenant du contenu actif (script, iframe ou entité externe)." };
    }
  }
  return { ok: true, type };
}

/** Crée le dossier au premier usage. */
export async function assurerDossier() {
  await fs.mkdir(DOSSIER_UPLOADS, { recursive: true });
}

/** Liste les fichiers déposés, en ignorant tout ce qui n'est pas un fichier valide. */
export async function listerFichiers() {
  await assurerDossier();
  const entrees = await fs.readdir(DOSSIER_UPLOADS, { withFileTypes: true });
  const fichiers = [];
  for (const entree of entrees) {
    if (!entree.isFile() || entree.name.startsWith(".")) continue;
    if (!typePour(entree.name)) continue;
    const infos = await fs.stat(path.join(DOSSIER_UPLOADS, entree.name));
    fichiers.push({
      nom: entree.name,
      taille: infos.size,
      type: typePour(entree.name).mime,
      modifie: infos.mtime.toISOString(),
      url: `/api/uploads/${encodeURIComponent(entree.name)}`,
    });
  }
  return fichiers.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Empreinte utilisée comme ETag, pour éviter de retransmettre un fichier inchangé. */
export function empreinte(octets) {
  return `"${createHash("sha256").update(octets).digest("hex").slice(0, 32)}"`;
}

/**
 * En-têtes de réponse pour la lecture d'un fichier.
 * `nosniff` empêche le navigateur de deviner un type différent ; la CSP et
 * l'attribut sandbox neutralisent un SVG qui aurait franchi la validation.
 */
export function entetesLecture(type, octets) {
  return {
    "Content-Type": type.mime,
    "Content-Length": String(octets.length),
    "Cache-Control": "public, max-age=300, must-revalidate",
    "ETag": empreinte(octets),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "Content-Disposition": "inline",
  };
}
