"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { VUE_INITIALE } from "@/lib/constantes";

const STYLE_SOMBRE = "mapbox://styles/mapbox/dark-v11";
const STYLE_CLAIR = "mapbox://styles/mapbox/light-v11";

/**
 * Carte Mapbox pilotée par les props.
 *
 * `couches` décrit ce qu'il faut afficher : chaque entrée porte ses données
 * GeoJSON déjà filtrées et l'expression de style à appliquer. Le composant se
 * contente de synchroniser Mapbox avec cette description — toute la logique
 * métier reste en amont.
 */
export default function Carte({
  couches,
  regions,
  theme,
  surSelection,
  selection,
}) {
  const conteneur = useRef(null);
  const carte = useRef(null);
  const popup = useRef(null);
  const pret = useRef(false);
  const dernieresCouches = useRef([]);

  // --- initialisation, une seule fois -------------------------------------
  useEffect(() => {
    if (carte.current || !conteneur.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: conteneur.current,
      style: theme === "light" ? STYLE_CLAIR : STYLE_SOMBRE,
      ...VUE_INITIALE,
      attributionControl: { compact: true },
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    m.addControl(new mapboxgl.ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-right");

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 11,
    });

    m.on("load", () => {
      pret.current = true;
      appliquer(m, dernieresCouches.current, regions);
    });

    carte.current = m;
    return () => {
      m.remove();
      carte.current = null;
      pret.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- changement de thème : recharge le fond puis réapplique les couches --
  useEffect(() => {
    const m = carte.current;
    if (!m || !pret.current) return;
    pret.current = false;
    m.setStyle(theme === "light" ? STYLE_CLAIR : STYLE_SOMBRE);
    m.once("styledata", () => {
      pret.current = true;
      appliquer(m, dernieresCouches.current, regions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // --- synchronisation des données ----------------------------------------
  useEffect(() => {
    dernieresCouches.current = couches;
    const m = carte.current;
    if (!m || !pret.current) return;
    appliquer(m, couches, regions);
  }, [couches, regions]);

  // --- interactions --------------------------------------------------------
  useEffect(() => {
    const m = carte.current;
    if (!m) return;

    const surEntree = (e) => {
      m.getCanvas().style.cursor = "pointer";
      const p = e.features[0].properties;
      const titre = p.localite || p.ADM4_FR || "Localité";
      const detail = p.sous_prefecture || p.region || "";
      popup.current
        .setLngLat(e.lngLat)
        .setHTML(
          `<strong>${titre}</strong>${
            detail ? `<br/><span style="opacity:.65">${detail}</span>` : ""
          }`
        )
        .addTo(m);
    };
    const surSortie = () => {
      m.getCanvas().style.cursor = "";
      popup.current.remove();
    };
    const surClic = (e) => {
      const p = e.features[0].properties;
      surSelection?.(p);
    };

    const ids = couches.map((c) => `${c.id}-points`);
    ids.forEach((id) => {
      m.on("mouseenter", id, surEntree);
      m.on("mousemove", id, surEntree);
      m.on("mouseleave", id, surSortie);
      m.on("click", id, surClic);
    });
    return () => {
      ids.forEach((id) => {
        m.off("mouseenter", id, surEntree);
        m.off("mousemove", id, surEntree);
        m.off("mouseleave", id, surSortie);
        m.off("click", id, surClic);
      });
    };
  }, [couches, surSelection]);

  // --- centrage sur la sélection ------------------------------------------
  useEffect(() => {
    const m = carte.current;
    if (!m || !pret.current || !selection?.__coords) return;
    m.easeTo({ center: selection.__coords, zoom: Math.max(m.getZoom(), 9), duration: 750 });
  }, [selection]);

  return <div className="carte" ref={conteneur} />;
}

/** Recrée sources et couches à partir de la description fournie. */
function appliquer(m, couches, regions) {
  // Contours régionaux, en fond.
  if (regions && !m.getSource("regions")) {
    m.addSource("regions", { type: "geojson", data: regions });
    m.addLayer({
      id: "regions-contour",
      type: "line",
      source: "regions",
      paint: {
        "line-color": "rgba(148,163,184,0.35)",
        "line-width": 0.7,
      },
    });
  }

  const attendus = new Set();
  couches.forEach((couche) => {
    const idSource = couche.id;
    const idPoints = `${couche.id}-points`;
    const idHalo = `${couche.id}-halo`;
    attendus.add(idPoints);
    attendus.add(idHalo);

    if (m.getSource(idSource)) {
      m.getSource(idSource).setData(couche.donnees);
    } else {
      m.addSource(idSource, { type: "geojson", data: couche.donnees });
    }

    if (!m.getLayer(idHalo)) {
      m.addLayer({
        id: idHalo,
        type: "circle",
        source: idSource,
        paint: {
          "circle-radius": couche.rayonHalo ?? 13,
          "circle-color": couche.couleur,
          "circle-opacity": 0.13,
          "circle-blur": 0.55,
        },
      });
    }
    if (!m.getLayer(idPoints)) {
      m.addLayer({
        id: idPoints,
        type: "circle",
        source: idSource,
        paint: {
          "circle-radius": couche.rayon,
          "circle-color": couche.couleur,
          "circle-opacity": 0.9,
          "circle-stroke-width": 0.7,
          "circle-stroke-color": "rgba(255,255,255,0.5)",
        },
      });
    }
    // Le style peut changer sans que la couche soit recréée.
    m.setPaintProperty(idPoints, "circle-color", couche.couleur);
    m.setPaintProperty(idPoints, "circle-radius", couche.rayon);
    m.setPaintProperty(idHalo, "circle-color", couche.couleur);
    m.setPaintProperty(idHalo, "circle-radius", couche.rayonHalo ?? 13);
    m.setLayoutProperty(idPoints, "visibility", couche.visible === false ? "none" : "visible");
    m.setLayoutProperty(idHalo, "visibility",
      couche.visible === false || !couche.halo ? "none" : "visible");
  });

  // Retire les couches qui ne sont plus demandées.
  const style = m.getStyle();
  if (!style) return;
  style.layers
    .filter((c) => (c.id.endsWith("-points") || c.id.endsWith("-halo")) && !attendus.has(c.id))
    .forEach((c) => {
      if (m.getLayer(c.id)) m.removeLayer(c.id);
    });
}
