"use client";

import { Badge, BarreOperateur, LigneInfo } from "./Elements";
import { OPERATEURS, nombre, pourcent } from "@/lib/constantes";

function niveauRisque(v) {
  if (v >= 0.7) return { type: "danger", texte: "Risque élevé" };
  if (v >= 0.4) return { type: "alerte", texte: "Risque modéré" };
  return { type: "succes", texte: "Risque faible" };
}

export default function Fiche({ volet, propriete, onFermer, logos = {} }) {
  if (!propriete) return null;
  const p = propriete;

  return (
    <div className="fiche">
      <div className="fiche-entete">
        <button className="fiche-fermer" onClick={onFermer} aria-label="Fermer">
          ×
        </button>
        <h3>{p.localite ?? "Localité"}</h3>
        <p>
          {[p.sous_prefecture, p.region, p.district].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="fiche-corps">
        {volet === "risque" && <CorpsRisque p={p} logos={logos} />}
        {volet === "blanches" && <CorpsBlanche p={p} />}
        {volet === "qos" && <CorpsQos p={p} logos={logos} />}
      </div>
    </div>
  );
}

function CorpsRisque({ p, logos }) {
  const risques = OPERATEURS.map((o) => p[`risque_${o}`]).filter(
    (v) => v !== null && v !== undefined
  );
  const max = risques.length ? Math.max(...risques) : 0;
  const n = niveauRisque(max);

  return (
    <>
      <div style={{ marginBottom: 13 }}>
        <Badge type={n.type}>{n.texte}</Badge>{" "}
        {p.nb_retraits > 0 && (
          <Badge type="danger">
            {p.nb_retraits} retrait{p.nb_retraits > 1 ? "s" : ""} confirmé
            {p.nb_retraits > 1 ? "s" : ""} en 2026
          </Badge>
        )}
      </div>

      <LigneInfo label="Population" valeur={nombre(p.pop)} />

      <div style={{ margin: "13px 0 4px", fontSize: 10.5, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--texte-faible)" }}>
        Risque par opérateur
      </div>
      {OPERATEURS.map((op) => {
        const r = p[`risque_${op}`];
        if (r === null || r === undefined) return null;
        return (
          <BarreOperateur
            key={op}
            operateur={op}
            logo={logos?.[op]}
            valeur={r}
            libelle={`${pourcent(r, 0)}${p[`retire_${op}`] ? " · retiré en 2026" : ""}`}
          />
        );
      })}

      <div style={{ margin: "13px 0 4px", fontSize: 10.5, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--texte-faible)" }}>
        Distance au site le plus proche
      </div>
      {OPERATEURS.map((op) => {
        const d = p[`dist_${op}`];
        if (d === null || d === undefined) return null;
        return <LigneInfo key={op} label={op} valeur={`${d.toFixed(1)} km`} />;
      })}
    </>
  );
}

function CorpsBlanche({ p }) {
  return (
    <>
      <div style={{ marginBottom: 13 }}>
        <Badge type={p.rang <= 50 ? "danger" : p.rang <= 200 ? "alerte" : "neutre"}>
          Priorité n° {p.rang}
        </Badge>{" "}
        <Badge type="neutre">{p.profil}</Badge>
      </div>

      <LigneInfo label="Population" valeur={nombre(p.pop)} />
      <LigneInfo label="Population à 10 km" valeur={nombre(p.pop_dans_10km)} />
      <LigneInfo label="Site le plus proche" valeur={`${p.dist_site?.toFixed(1)} km`} />
      <LigneInfo label="Fibre la plus proche" valeur={`${p.dist_fibre?.toFixed(1)} km`} />
      <LigneInfo label="Zones blanches à 10 km" valeur={nombre(p.zb_10km)} />
      <LigneInfo
        label="École"
        badge={
          <Badge type={p.ecole === 1 ? "succes" : "neutre"}>
            {p.ecole === 1 ? "présente" : p.ecole === 0 ? "absente" : "inconnu"}
          </Badge>
        }
      />
      <LigneInfo
        label="Centre de santé"
        badge={
          <Badge type={p.centre_sante === 1 ? "succes" : "neutre"}>
            {p.centre_sante === 1 ? "présent" : p.centre_sante === 0 ? "absent" : "inconnu"}
          </Badge>
        }
      />
      <LigneInfo
        label="Électrification"
        badge={
          <Badge type={p.electrification === 1 ? "succes" : "neutre"}>
            {p.electrification === 1 ? "oui" : p.electrification === 0 ? "non" : "inconnu"}
          </Badge>
        }
      />
      {p.acces_difficile === 1 && (
        <LigneInfo label="Accès" badge={<Badge type="alerte">difficile</Badge>} />
      )}

      <div style={{ margin: "14px 0 6px", fontSize: 10.5, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--texte-faible)" }}>
        Décomposition du score
      </div>
      {[
        ["Enjeu démographique", p.enjeu_demographique, "#38bdf8"],
        ["Faisabilité", p.faisabilite, "#34d399"],
        ["Enjeu social", p.enjeu_social, "#a78bfa"],
        ["Mutualisation", p.mutualisation, "#fbbf24"],
      ].map(([libelle, valeur, couleur]) => (
        <div key={libelle} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        fontSize: 11.5, marginBottom: 3 }}>
            <span style={{ color: "var(--texte-doux)" }}>{libelle}</span>
            <b>{valeur?.toFixed(2)}</b>
          </div>
          <div className="barre-fond">
            <div className="barre-valeur"
                 style={{ width: `${(valeur ?? 0) * 100}%`, background: couleur }} />
          </div>
        </div>
      ))}
    </>
  );
}

function CorpsQos({ p, logos }) {
  return (
    <>
      <LigneInfo label="Population" valeur={nombre(p.pop)} />
      <LigneInfo label="Qualité moyenne" valeur={p.qualite_moyenne?.toFixed(3)} />

      <div style={{ margin: "13px 0 4px", fontSize: 10.5, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--texte-faible)" }}>
        Qualité mesurée par opérateur
      </div>
      {OPERATEURS.map((op) => {
        const q = p[`qualite_${op}`];
        if (q === null || q === undefined) return null;
        const nc = p[`nc_${op}`];
        return (
          <BarreOperateur
            key={op}
            operateur={op}
            logo={logos?.[op]}
            valeur={q}
            libelle={`${q.toFixed(2)}${nc ? ` · ${nc} non-conformité${nc > 1 ? "s" : ""}` : ""}`}
          />
        );
      })}

      <p className="note" style={{ marginTop: 13 }}>
        Score composite normalisé par campagne, sur les indicateurs voix, data et SMS
        mesurés lors des campagnes terrain de l&apos;ARTCI.
      </p>
    </>
  );
}
