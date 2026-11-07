export const OPERATEURS = ["ORANGE", "MTN", "MOOV"];

export const COULEUR_OPERATEUR = {
  ORANGE: "#f97316",
  MTN: "#eab308",
  MOOV: "#3b82f6",
};

export const VOLETS = [
  { id: "risque", libelle: "Risque de surdéclaration" },
  { id: "blanches", libelle: "Zones blanches" },
  { id: "qos", libelle: "Qualité de service" },
];

/** Vue initiale centrée sur la Côte d'Ivoire. */
export const VUE_INITIALE = {
  center: [-5.55, 7.55],
  zoom: 5.75,
  minZoom: 4.5,
  maxZoom: 14,
};

/** Rampe rouge→vert utilisée pour le risque (fort = rouge). */
export const RAMPE_RISQUE = [
  [0, "#16a34a"],
  [0.25, "#84cc16"],
  [0.5, "#facc15"],
  [0.75, "#f97316"],
  [1, "#dc2626"],
];

/**
 * Rampe pour la priorité des zones blanches.
 * La luminosité croît avec la priorité : sur un fond de carte sombre, les
 * localités à traiter en premier doivent ressortir, pas s'effacer.
 */
// Les bornes suivent la plage réelle des scores (0,33 à 0,78) et non 0-1,
// sans quoi tous les points tomberaient dans la même teinte.
export const RAMPE_PRIORITE = [
  [0.34, "#42200a"],
  [0.46, "#8f4f0c"],
  [0.56, "#d97706"],
  [0.66, "#f59e0b"],
  [0.76, "#fde047"],
];

/** Rampe pour la qualité mesurée (fort = bonne qualité). */
export const RAMPE_QUALITE = [
  [0.15, "#dc2626"],
  [0.35, "#f97316"],
  [0.5, "#facc15"],
  [0.62, "#84cc16"],
  [0.75, "#16a34a"],
];

export function interpoler(rampe) {
  return ["interpolate", ["linear"], ["coalesce", ["get", "__valeur"], 0],
    ...rampe.flat()];
}

export function nombre(valeur, decimales = 0) {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "—";
  return valeur.toLocaleString("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function pourcent(valeur, decimales = 0) {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "—";
  return `${(valeur * 100).toFixed(decimales)} %`;
}
