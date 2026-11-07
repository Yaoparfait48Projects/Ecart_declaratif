"use client";

import LogoOperateur from "./LogoOperateur";
import { COULEUR_OPERATEUR, nombre } from "@/lib/constantes";

export function Stat({ valeur, libelle, couleur }) {
  return (
    <div className="stat">
      <div className="valeur" style={couleur ? { color: couleur } : undefined}>
        {valeur}
      </div>
      <div className="libelle">{libelle}</div>
    </div>
  );
}

export function Bloc({ titre, extra, children }) {
  return (
    <div className="bloc">
      {titre && (
        <div className="bloc-titre">
          <span>{titre}</span>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

export function Curseur({ label, valeur, min, max, pas, format, onChange }) {
  return (
    <div className="champ">
      <label>
        {label} <b>{format ? format(valeur) : valeur}</b>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segments({ label, options, valeur, onChange, colorerOperateurs }) {
  return (
    <div className="champ">
      {label && <label>{label}</label>}
      <div className="segments">
        {options.map((o) => (
          <button
            key={o.id}
            className="segment"
            data-actif={valeur === o.id}
            data-op={colorerOperateurs ? o.id : undefined}
            onClick={() => onChange(o.id)}
          >
            {o.libelle}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Case({ label, coche, onChange }) {
  return (
    <label className="case">
      <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function LigneInfo({ label, valeur, badge }) {
  return (
    <div className="ligne-info">
      <span>{label}</span>
      {badge ? badge : <b>{valeur}</b>}
    </div>
  );
}

export function BarreOperateur({ operateur, valeur, libelle, max = 1, logo }) {
  const largeur = valeur === null || valeur === undefined
    ? 0
    : Math.max(2, Math.min(100, (valeur / max) * 100));
  return (
    <div className="barre-op">
      <div className="barre-op-entete">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <LogoOperateur operateur={operateur} url={logo} taille={14} />
          <span style={{ color: COULEUR_OPERATEUR[operateur], fontWeight: 600 }}>
            {operateur}
          </span>
        </span>
        <span style={{ color: "var(--texte-doux)" }}>{libelle}</span>
      </div>
      <div className="barre-fond">
        <div
          className="barre-valeur"
          style={{ width: `${largeur}%`, background: COULEUR_OPERATEUR[operateur] }}
        />
      </div>
    </div>
  );
}

export function Badge({ type, children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

/** Sparkline SVG autonome — évite d'embarquer une bibliothèque de graphiques. */
export function Courbe({ series, hauteur = 78, formatY }) {
  const toutes = series.flatMap((s) => s.valeurs.filter((v) => v !== null));
  if (!toutes.length) return null;
  const min = Math.min(...toutes);
  const max = Math.max(...toutes);
  const etendue = max - min || 1;
  const n = Math.max(...series.map((s) => s.valeurs.length));
  const l = 260;
  const marge = 4;

  const chemin = (valeurs) =>
    valeurs
      .map((v, i) => {
        if (v === null) return null;
        const x = marge + (i / Math.max(n - 1, 1)) * (l - 2 * marge);
        const y = hauteur - marge - ((v - min) / etendue) * (hauteur - 2 * marge);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .reduce((acc, p, i) => (i === 0 ? `M${p}` : `${acc} L${p}`), "");

  return (
    <div>
      <svg viewBox={`0 0 ${l} ${hauteur}`} style={{ width: "100%", height: hauteur }}>
        {series.map((s) => (
          <path
            key={s.nom}
            d={chemin(s.valeurs)}
            fill="none"
            stroke={s.couleur}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--texte-faible)",
          marginTop: 2,
        }}
      >
        <span>{formatY ? formatY(min) : nombre(min)}</span>
        <span>{formatY ? formatY(max) : nombre(max)}</span>
      </div>
      <div style={{ display: "flex", gap: 11, marginTop: 7, flexWrap: "wrap" }}>
        {series.map((s) => (
          <span
            key={s.nom}
            style={{ fontSize: 10.5, color: "var(--texte-doux)", display: "flex",
                     alignItems: "center", gap: 4 }}
          >
            <i
              style={{ width: 8, height: 2, background: s.couleur, borderRadius: 2,
                       display: "inline-block" }}
            />
            {s.nom}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Legende({ titre, rampe, bornes, entrees }) {
  const degrade = rampe
    ? `linear-gradient(90deg, ${rampe.map(([, c]) => c).join(", ")})`
    : null;
  return (
    <div className="legende">
      <h4>{titre}</h4>
      {degrade && (
        <>
          <div className="echelle" style={{ background: degrade }} />
          <div className="echelle-bornes">
            <span>{bornes?.[0]}</span>
            <span>{bornes?.[1]}</span>
          </div>
        </>
      )}
      {entrees?.map((e) => (
        <div className="legende-ligne" key={e.libelle}>
          <i className="pastille" style={{ background: e.couleur }} />
          {e.libelle}
        </div>
      ))}
    </div>
  );
}
