/**
 * /api/uploads
 *   GET  — liste les fichiers déposés
 *   POST — dépose un fichier (multipart/form-data, champ « fichier »)
 *
 * Le stockage est le dossier `uploads/` à la racine du projet, hors de
 * `public/` : aucun fichier n'est servi statiquement, tout passe par ici.
 */
import fs from "node:fs/promises";

import {
  TAILLE_MAX,
  assurerDossier,
  cheminSur,
  extensionsAutorisees,
  listerFichiers,
  nomSur,
  validerContenu,
} from "@/lib/uploads";

// Ces routes touchent au système de fichiers : jamais de pré-rendu ni de cache.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function erreur(message, statut) {
  return Response.json({ erreur: message }, { status: statut });
}

export async function GET() {
  try {
    const fichiers = await listerFichiers();
    return Response.json(
      { fichiers, total: fichiers.length, extensions: extensionsAutorisees(),
        tailleMax: TAILLE_MAX },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[uploads] listage impossible :", e);
    return erreur("Listage impossible.", 500);
  }
}

export async function POST(requete) {
  // On refuse d'emblée un corps annoncé trop gros, avant de le lire.
  const annonce = Number(requete.headers.get("content-length") ?? 0);
  if (annonce > TAILLE_MAX * 1.1) {
    return erreur(`Fichier trop volumineux (maximum ${TAILLE_MAX / 1024 / 1024} Mo).`, 413);
  }

  let formulaire;
  try {
    formulaire = await requete.formData();
  } catch {
    return erreur("Requête invalide : multipart/form-data attendu.", 400);
  }

  const fichier = formulaire.get("fichier");
  if (!fichier || typeof fichier === "string" || typeof fichier.arrayBuffer !== "function") {
    return erreur("Champ « fichier » manquant.", 400);
  }

  // Le nom souhaité peut être imposé (utile pour les logos : logo-orange.png).
  const nomDemande = formulaire.get("nom");
  const source = typeof nomDemande === "string" && nomDemande.trim()
    ? nomDemande
    : fichier.name;

  const nom = nomSur(source);
  if (!nom) {
    return erreur(
      `Nom ou extension invalide. Extensions acceptées : ${extensionsAutorisees().join(", ")}.`,
      400
    );
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  const verdict = validerContenu(nom, octets);
  if (!verdict.ok) return erreur(verdict.motif, 415);

  const chemin = cheminSur(nom);
  if (!chemin) return erreur("Chemin de destination refusé.", 400);

  try {
    await assurerDossier();
    const remplace = await fs
      .access(chemin)
      .then(() => true)
      .catch(() => false);

    if (remplace && formulaire.get("remplacer") !== "1") {
      return erreur(
        `Le fichier « ${nom} » existe déjà. Renvoyez avec remplacer=1 pour l'écraser.`,
        409
      );
    }

    // `mode` restreint les droits : lecture/écriture pour le propriétaire seul.
    await fs.writeFile(chemin, octets, { mode: 0o600 });

    return Response.json(
      {
        nom,
        taille: octets.length,
        type: verdict.type.mime,
        url: `/api/uploads/${encodeURIComponent(nom)}`,
        remplace,
      },
      { status: remplace ? 200 : 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[uploads] écriture impossible :", e);
    return erreur("Écriture impossible.", 500);
  }
}
