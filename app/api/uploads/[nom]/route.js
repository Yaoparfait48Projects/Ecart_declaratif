/**
 * /api/uploads/[nom]
 *   GET    — sert un fichier déposé
 *   DELETE — supprime un fichier déposé
 *
 * Le nom reçu est toujours reconstruit avant usage (cf. lib/uploads.js) :
 * aucune valeur issue de l'URL n'atteint le système de fichiers telle quelle.
 */
import fs from "node:fs/promises";

import { cheminSur, empreinte, entetesLecture, typePour } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function erreur(message, statut) {
  return Response.json({ erreur: message }, { status: statut });
}

export async function GET(requete, { params }) {
  const { nom } = await params;
  const chemin = cheminSur(nom);
  // Un nom refusé et un fichier absent donnent la même réponse : inutile
  // d'indiquer à un appelant lequel des deux cas il a déclenché.
  if (!chemin) return erreur("Fichier introuvable.", 404);

  let octets;
  try {
    octets = await fs.readFile(chemin);
  } catch {
    return erreur("Fichier introuvable.", 404);
  }

  const type = typePour(chemin);
  if (!type) return erreur("Fichier introuvable.", 404);

  // Revalidation : on évite de retransmettre un fichier que le client a déjà.
  const etag = empreinte(octets);
  if (requete.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(octets, { headers: entetesLecture(type, octets) });
}

export async function DELETE(requete, { params }) {
  const { nom } = await params;
  const chemin = cheminSur(nom);
  if (!chemin) return erreur("Fichier introuvable.", 404);

  try {
    await fs.unlink(chemin);
    return Response.json({ supprime: true, nom }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e.code === "ENOENT") return erreur("Fichier introuvable.", 404);
    console.error("[uploads] suppression impossible :", e);
    return erreur("Suppression impossible.", 500);
  }
}
