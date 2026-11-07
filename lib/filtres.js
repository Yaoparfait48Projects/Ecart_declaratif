import { OPERATEURS } from "./constantes";

/** Filtre un FeatureCollection et injecte `__valeur`, la grandeur qui pilote la couleur. */
export function preparer(fc, { valeur, garder }) {
  if (!fc) return { type: "FeatureCollection", features: [] };
  const features = [];
  for (const ft of fc.features) {
    if (garder && !garder(ft.properties)) continue;
    features.push({
      ...ft,
      properties: { ...ft.properties, __valeur: valeur(ft.properties) },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Liste triée des valeurs distinctes d'un champ, pour alimenter un menu déroulant. */
export function valeursDistinctes(fc, champ) {
  if (!fc) return [];
  const set = new Set();
  for (const ft of fc.features) {
    const v = ft.properties[champ];
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Risque retenu selon l'opérateur sélectionné ("TOUS" = maximum sur les trois). */
export function risquePour(p, operateur) {
  if (operateur === "TOUS") {
    const valeurs = OPERATEURS.map((o) => p[`risque_${o}`]).filter(
      (v) => v !== null && v !== undefined
    );
    return valeurs.length ? Math.max(...valeurs) : 0;
  }
  return p[`risque_${operateur}`] ?? 0;
}

/** Qualité retenue selon l'opérateur ("TOUS" = minimum, on veut voir le maillon faible). */
export function qualitePour(p, operateur) {
  if (operateur === "TOUS") {
    const valeurs = OPERATEURS.map((o) => p[`qualite_${o}`]).filter(
      (v) => v !== null && v !== undefined
    );
    return valeurs.length ? Math.min(...valeurs) : null;
  }
  return p[`qualite_${operateur}`] ?? null;
}

/** Rayon proportionnel à la population, borné pour rester lisible à tous les zooms. */
export function rayonParPopulation(champ = "pop", petit = 3, grand = 16) {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    5,
    ["interpolate", ["linear"], ["sqrt", ["max", ["get", champ], 1]], 1, petit, 120, grand * 0.55],
    10,
    ["interpolate", ["linear"], ["sqrt", ["max", ["get", champ], 1]], 1, petit * 1.8, 120, grand],
  ];
}
