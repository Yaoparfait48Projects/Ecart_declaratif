"use client";

import { useRef, useState } from "react";
import { Bloc } from "./Elements";
import LogoOperateur, { invaliderLogos } from "./LogoOperateur";
import { COULEUR_OPERATEUR, OPERATEURS } from "@/lib/constantes";

/**
 * Dépôt et suppression des logos d'opérateurs, via /api/uploads.
 *
 * Le fichier est enregistré sous un nom imposé (`logo-orange.png`…) afin que
 * l'application le retrouve sans avoir à mémoriser le nom d'origine.
 */
export default function GestionLogos({ logos, onChangement }) {
  const [enCours, setEnCours] = useState(null);
  const [message, setMessage] = useState(null);
  const champs = useRef({});

  async function deposer(operateur, fichier) {
    if (!fichier) return;
    const extension = (fichier.name.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
    const donnees = new FormData();
    donnees.append("fichier", fichier);
    donnees.append("nom", `logo-${operateur.toLowerCase()}${extension}`);
    donnees.append("remplacer", "1");

    setEnCours(operateur);
    setMessage(null);
    try {
      const reponse = await fetch("/api/uploads", { method: "POST", body: donnees });
      const corps = await reponse.json();
      if (!reponse.ok) {
        setMessage({ type: "erreur", texte: corps.erreur ?? "Dépôt refusé." });
      } else {
        setMessage({ type: "succes", texte: `${operateur} : logo enregistré.` });
        invaliderLogos();
        onChangement?.();
      }
    } catch {
      setMessage({ type: "erreur", texte: "Le serveur n'a pas répondu." });
    } finally {
      setEnCours(null);
      if (champs.current[operateur]) champs.current[operateur].value = "";
    }
  }

  async function supprimer(operateur) {
    const url = logos[operateur];
    if (!url) return;
    const nom = decodeURIComponent(url.split("/").pop());
    setEnCours(operateur);
    try {
      const reponse = await fetch(`/api/uploads/${encodeURIComponent(nom)}`, {
        method: "DELETE",
      });
      if (reponse.ok) {
        setMessage({ type: "succes", texte: `${operateur} : logo supprimé.` });
        invaliderLogos();
        onChangement?.();
      } else {
        setMessage({ type: "erreur", texte: "Suppression impossible." });
      }
    } catch {
      setMessage({ type: "erreur", texte: "Le serveur n'a pas répondu." });
    } finally {
      setEnCours(null);
    }
  }

  return (
    <Bloc titre="Logos des opérateurs">
      {OPERATEURS.map((op) => (
        <div key={op} className="ligne-logo">
          <LogoOperateur operateur={op} url={logos[op]} taille={22} />
          <span style={{ color: COULEUR_OPERATEUR[op], fontWeight: 600, fontSize: 12.5,
                         flex: 1 }}>
            {op}
          </span>
          <label className="bouton-fichier">
            {logos[op] ? "Remplacer" : "Déposer"}
            <input
              ref={(el) => { champs.current[op] = el; }}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg"
              disabled={enCours === op}
              onChange={(e) => deposer(op, e.target.files?.[0])}
            />
          </label>
          {logos[op] && (
            <button
              className="bouton-discret"
              onClick={() => supprimer(op)}
              disabled={enCours === op}
              title="Supprimer le logo"
              aria-label={`Supprimer le logo ${op}`}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {message && (
        <p className="note" style={{
          marginTop: 10,
          borderLeftColor: message.type === "erreur" ? "var(--danger)" : "var(--succes)",
        }}>
          {message.texte}
        </p>
      )}
      <p className="note" style={{ marginTop: 10 }}>
        PNG, JPG, WebP ou SVG, 4 Mo maximum. Les fichiers sont stockés dans{" "}
        <b>uploads/</b> à la racine du projet — hors de <b>public/</b> — et servis
        uniquement par l&apos;API, après validation du type réel.
      </p>
    </Bloc>
  );
}
