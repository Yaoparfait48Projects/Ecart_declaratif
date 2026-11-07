# Observatoire de la couverture mobile — tableau de bord

Interface cartographique interactive des trois volets du mémoire.
Next.js 15 · React 19 · Mapbox GL JS · JSX (pas de TypeScript).

## Démarrage

1. **Jeton Mapbox** — créer `.env.local` à la racine de `dashboard/` :

   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.votre_jeton
   ```

   Jeton public gratuit sur [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/).
   Sans lui, l'application affiche un écran d'explication au lieu de la carte.

2. **Données** — si `public/data/` est vide :

   ```bash
   python3 ../analyse/scripts/10_export_web.py
   ```

3. **Lancer** :

   ```bash
   npm install && npm run dev
   ```

   L'application écoute sur <http://localhost:3100>.

## Les trois volets

| Onglet | Contenu | Source |
|---|---|---|
| **Risque de surdéclaration** | 7 543 localités scorées par le modèle, filtrables par opérateur, seuil de risque, population et région. Superposition possible de la liste des 171 contrôles recommandés. | Déclarations opérateurs + modèle |
| **Zones blanches** | 886 localités priorisées, avec décomposition du score en quatre dimensions et filtrage par profil type. | Déclarations opérateurs 2026 |
| **Qualité de service** | 122 localités mesurées, qualité par opérateur et évolution sur les 7 campagnes. | **Mesures terrain ARTCI** |

## Architecture

```
app/
  layout.jsx        métadonnées, feuilles de style
  page.jsx          orchestration : état, filtres, calcul des couches
  globals.css       système de design (thèmes sombre et clair)
components/
  Carte.jsx         Mapbox, piloté par une description déclarative des couches
  Panneaux.jsx      un panneau de filtres et d'indicateurs par volet
  Fiche.jsx         fiche détaillée d'une localité au clic
  Elements.jsx      briques réutilisables (stat, curseur, badge, courbe SVG…)
lib/
  constantes.js     opérateurs, rampes de couleurs, formatage français
  filtres.js        filtrage des GeoJSON et expressions de rayon
public/data/        GeoJSON et JSON produits par 10_export_web.py
```

Le composant `Carte` ne contient aucune logique métier : `page.jsx` lui transmet
des couches déjà filtrées, avec leur expression de style. Ajouter une vue revient
donc à produire une nouvelle description de couche, sans toucher à Mapbox.

Les graphiques sont des SVG écrits à la main (`Courbe` dans `Elements.jsx`) :
aucune bibliothèque de visualisation n'est embarquée.

## Points d'attention

- **La carte n'est pas rendue côté serveur** (`dynamic` avec `ssr: false`) :
  Mapbox manipule directement le DOM.
- `risque_surdeclaration.geojson` pèse 3,3 Mo. Le chargement mesuré est de ~40 ms
  en local ; prévoir une compression côté serveur pour un déploiement distant.
- Le volet qualité de service repose sur un **échantillon urbain** (chefs-lieux).
  L'interface le rappelle explicitement — ces résultats ne valent pas pour
  l'ensemble du pays.
