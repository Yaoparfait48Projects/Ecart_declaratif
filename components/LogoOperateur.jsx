"use client";

import { useEffect, useState } from "react";
import { COULEUR_OPERATEUR, OPERATEURS } from "@/lib/constantes";

/**
 * Logo d'un opérateur, servi par /api/uploads.
 *
 * Convention de nommage : `logo-orange.*`, `logo-mtn.*`, `logo-moov.*`.
 * Tant qu'aucun fichier n'a été déposé, on affiche une pastille typographique
 * aux couleurs de l'opérateur — l'interface reste complète sans dépendre de
 * fichiers externes.
 */

/** Cache partagé : la liste des fichiers n'est demandée qu'une fois par session. */
let promesseListe = null;

export function chargerLogos() {
  if (!promesseListe) {
    promesseListe = fetch("/api/uploads")
      .then((r) => (r.ok ? r.json() : { fichiers: [] }))
      .then((d) => {
        const par = {};
        for (const op of OPERATEURS) {
          const attendu = `logo-${op.toLowerCase()}.`;
          const trouve = (d.fichiers ?? []).find((f) =>
            f.nom.toLowerCase().startsWith(attendu)
          );
          if (trouve) par[op] = trouve.url;
        }
        return par;
      })
      .catch(() => ({}));
  }
  return promesseListe;
}

/** Force un rechargement après un dépôt ou une suppression. */
export function invaliderLogos() {
  promesseListe = null;
}

export function useLogos() {
  const [logos, setLogos] = useState({});
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let vivant = true;
    chargerLogos().then((l) => {
      if (vivant) {
        setLogos(l);
        setCharge(true);
      }
    });
    return () => {
      vivant = false;
    };
  }, []);

  return { logos, charge, recharger: () => { invaliderLogos(); setCharge(false); } };
}

export default function LogoOperateur({ operateur, url, taille = 18, avecNom = false }) {
  const couleur = COULEUR_OPERATEUR[operateur] ?? "var(--texte-doux)";
  const [echec, setEchec] = useState(false);

  const visuel = url && !echec ? (
    <img
      src={url}
      alt={operateur}
      width={taille}
      height={taille}
      onError={() => setEchec(true)}
      style={{ width: taille, height: taille, objectFit: "contain",
               borderRadius: 3, display: "block" }}
    />
  ) : (
    <span
      aria-hidden="true"
      style={{
        width: taille, height: taille, borderRadius: "50%",
        background: couleur, color: "#0b0f16",
        fontSize: taille * 0.52, fontWeight: 700, lineHeight: `${taille}px`,
        textAlign: "center", display: "block", flexShrink: 0,
      }}
    >
      {operateur.charAt(0)}
    </span>
  );

  if (!avecNom) return visuel;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {visuel}
      <span style={{ color: couleur, fontWeight: 600 }}>{operateur}</span>
    </span>
  );
}
