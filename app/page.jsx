"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Fiche from "@/components/Fiche";
import GestionLogos from "@/components/GestionLogos";
import { Legende } from "@/components/Elements";
import { useLogos } from "@/components/LogoOperateur";
import { PanneauBlanches, PanneauQos, PanneauRisque } from "@/components/Panneaux";
import {
  RAMPE_PRIORITE,
  RAMPE_QUALITE,
  RAMPE_RISQUE,
  VOLETS,
  interpoler,
} from "@/lib/constantes";
import {
  preparer,
  qualitePour,
  rayonParPopulation,
  risquePour,
  valeursDistinctes,
} from "@/lib/filtres";

// Mapbox manipule le DOM directement : pas de rendu côté serveur.
const Carte = dynamic(() => import("@/components/Carte"), { ssr: false });

const FICHIERS = {
  risque: "risque_surdeclaration.geojson",
  blanches: "zones_blanches.geojson",
  qos: "qos_localites.geojson",
  ciblage: "ciblage_controles.geojson",
  regions: "regions.geojson",
  synthese: "synthese.json",
};

const FILTRES_INITIAUX = {
  risque: { operateur: "TOUS", seuil: 0.4, popMin: 0, region: "", confirmes: false, ciblage: false },
  blanches: { rangMax: 886, popMin: 0, distMax: 25, region: "", profil: "", equipements: false },
  qos: { operateur: "TOUS", seuil: 0.8, region: "" },
};

export default function Page() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [volet, setVolet] = useState("risque");
  const [theme, setTheme] = useState("dark");
  const [filtres, setFiltres] = useState(FILTRES_INITIAUX);
  const [selection, setSelection] = useState(null);
  // Logos servis par /api/uploads ; repli typographique tant qu'ils sont absents.
  const { logos, recharger: rechargerLogos } = useLogos();

  const jetonManquant = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    let annule = false;
    Promise.all(
      Object.entries(FICHIERS).map(([cle, fichier]) =>
        fetch(`/data/${fichier}`)
          .then((r) => {
            if (!r.ok) throw new Error(`${fichier} : ${r.status}`);
            return r.json();
          })
          .then((v) => [cle, v])
      )
    )
      .then((entrees) => {
        if (!annule) setDonnees(Object.fromEntries(entrees));
      })
      .catch((e) => {
        if (!annule) setErreur(e.message);
      });
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fermer la fiche quand on change d'onglet : elle décrit un autre jeu de données.
  useEffect(() => setSelection(null), [volet]);

  const majFiltres = useCallback(
    (valeurs) => setFiltres((f) => ({ ...f, [volet]: valeurs })),
    [volet]
  );

  const surSelection = useCallback((p) => {
    setSelection(p);
  }, []);

  /* ------------------------------------------------ couches et statistiques */

  const { couches, stats, legende } = useMemo(() => {
    if (!donnees) return { couches: [], stats: {}, legende: null };

    if (volet === "risque") {
      const f = filtres.risque;
      const fc = preparer(donnees.risque, {
        valeur: (p) => risquePour(p, f.operateur),
        garder: (p) => {
          if (risquePour(p, f.operateur) < f.seuil) return false;
          if ((p.pop ?? 0) < f.popMin) return false;
          if (f.region && p.region !== f.region) return false;
          if (f.confirmes && !(p.nb_retraits > 0)) return false;
          return true;
        },
      });
      const valeurs = fc.features.map((x) => x.properties.__valeur);
      const couches = [
        {
          id: "risque",
          donnees: fc,
          couleur: interpoler(RAMPE_RISQUE),
          rayon: rayonParPopulation("pop", 3, 15),
          halo: true,
          rayonHalo: 11,
        },
      ];
      if (f.ciblage) {
        couches.push({
          id: "ciblage",
          donnees: preparer(donnees.ciblage, { valeur: () => 1 }),
          couleur: "#38bdf8",
          rayon: 6.5,
          halo: true,
          rayonHalo: 17,
        });
      }
      return {
        couches,
        stats: {
          affichees: fc.features.length,
          aRisque: valeurs.filter((v) => v > 0.5).length,
          population: fc.features.reduce((s, x) => s + (x.properties.pop ?? 0), 0),
          risqueMoyen: valeurs.length
            ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length
            : 0,
        },
        legende: {
          titre: "Risque de surdéclaration",
          rampe: RAMPE_RISQUE,
          bornes: ["0 %", "100 %"],
          entrees: f.ciblage
            ? [{ couleur: "#38bdf8", libelle: "Contrôle recommandé" }]
            : null,
        },
      };
    }

    if (volet === "blanches") {
      const f = filtres.blanches;
      const fc = preparer(donnees.blanches, {
        valeur: (p) => p.score,
        garder: (p) => {
          if (p.rang > f.rangMax) return false;
          if ((p.pop ?? 0) < f.popMin) return false;
          if ((p.dist_site ?? 99) > f.distMax) return false;
          if (f.region && p.region !== f.region) return false;
          if (f.profil && p.profil !== f.profil) return false;
          if (f.equipements && !(p.ecole === 1 || p.centre_sante === 1)) return false;
          return true;
        },
      });
      const pops = fc.features.map((x) => x.properties.pop ?? 0).sort((a, b) => a - b);
      const dists = fc.features
        .map((x) => x.properties.dist_site)
        .filter((v) => v != null)
        .sort((a, b) => a - b);
      const mediane = (t) => (t.length ? t[Math.floor(t.length / 2)] : null);
      return {
        couches: [
          {
            id: "blanches",
            donnees: fc,
            couleur: interpoler(RAMPE_PRIORITE),
            rayon: rayonParPopulation("pop", 4, 18),
            halo: true,
            rayonHalo: 13,
          },
        ],
        stats: {
          affichees: fc.features.length,
          population: pops.reduce((a, b) => a + b, 0),
          popMediane: mediane(pops),
          distMediane: mediane(dists),
        },
        legende: {
          titre: "Priorité de couverture",
          rampe: RAMPE_PRIORITE,
          bornes: ["faible", "élevée"],
          entrees: [{ couleur: "#94a3b8", libelle: "taille = population" }],
        },
      };
    }

    const f = filtres.qos;
    const fc = preparer(donnees.qos, {
      valeur: (p) => qualitePour(p, f.operateur) ?? 0,
      garder: (p) => {
        const q = qualitePour(p, f.operateur);
        if (q === null || q === undefined) return false;
        if (q > f.seuil) return false;
        if (f.region && p.region !== f.region) return false;
        return true;
      },
    });
    const valeurs = fc.features.map((x) => x.properties.__valeur);
    return {
      couches: [
        {
          id: "qos",
          donnees: fc,
          couleur: interpoler(RAMPE_QUALITE),
          rayon: rayonParPopulation("pop", 5, 20),
          halo: true,
          rayonHalo: 15,
        },
      ],
      stats: {
        affichees: fc.features.length,
        malDesservies: valeurs.filter((v) => v < 0.4).length,
        population: fc.features.reduce((s, x) => s + (x.properties.pop ?? 0), 0),
        qualiteMoyenne: valeurs.length
          ? valeurs.reduce((a, b) => a + b, 0) / valeurs.length
          : null,
      },
      legende: {
        titre: "Qualité mesurée",
        rampe: RAMPE_QUALITE,
        bornes: ["mauvaise", "bonne"],
      },
    };
  }, [donnees, volet, filtres]);

  const regionsDisponibles = useMemo(() => {
    if (!donnees) return [];
    return valeursDistinctes(donnees[volet] ?? donnees.risque, "region");
  }, [donnees, volet]);

  const profilsDisponibles = useMemo(
    () => (donnees ? valeursDistinctes(donnees.blanches, "profil") : []),
    [donnees]
  );

  /* ------------------------------------------------------------- rendu */

  if (jetonManquant) return <JetonAbsent />;

  return (
    <div className="app">
      <header className="entete">
        <div className="marque">
          <div className="logo">CI</div>
          <div>
            <h1>Observatoire de la couverture mobile</h1>
            <p>Côte d&apos;Ivoire · données ARTCI 2021-2026</p>
          </div>
        </div>

        <nav className="onglets">
          {VOLETS.map((v) => (
            <button
              key={v.id}
              className="onglet"
              data-actif={volet === v.id}
              onClick={() => setVolet(v.id)}
            >
              {v.libelle}
            </button>
          ))}
        </nav>

        <button
          className="bouton-icone"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Changer de thème"
          title="Changer de thème"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </header>

      <div className="corps">
        <aside className="panneau">
          {!donnees && !erreur && (
            <div className="chargement">
              <div className="rotor" />
              Chargement des données…
            </div>
          )}
          {erreur && (
            <div className="note" style={{ borderLeftColor: "var(--danger)" }}>
              Impossible de charger les données : {erreur}
              <br />
              Exécutez <code>python3 analyse/scripts/10_export_web.py</code>.
            </div>
          )}
          {donnees && volet === "risque" && (
            <PanneauRisque
              f={filtres.risque}
              setF={majFiltres}
              regions={regionsDisponibles}
              stats={stats}
              synthese={donnees.synthese}
            />
          )}
          {donnees && volet === "blanches" && (
            <PanneauBlanches
              f={filtres.blanches}
              setF={majFiltres}
              regions={regionsDisponibles}
              profils={profilsDisponibles}
              stats={stats}
            />
          )}
          {donnees && volet === "qos" && (
            <PanneauQos
              f={filtres.qos}
              setF={majFiltres}
              regions={regionsDisponibles}
              stats={stats}
              synthese={donnees.synthese}
            />
          )}
          {donnees && <GestionLogos logos={logos} onChangement={rechargerLogos} />}
        </aside>

        <main className="zone-carte">
          <Carte
            couches={couches}
            regions={donnees?.regions}
            theme={theme}
            surSelection={surSelection}
            selection={selection}
          />
          {legende && <Legende {...legende} />}
          <Fiche
            volet={volet}
            propriete={selection}
            logos={logos}
            onFermer={() => setSelection(null)}
          />
        </main>
      </div>
    </div>
  );
}

function JetonAbsent() {
  return (
    <div className="avertissement">
      <div className="boite">
        <h2 style={{ fontSize: 17, marginBottom: 9 }}>Jeton Mapbox requis</h2>
        <p style={{ color: "var(--texte-doux)", fontSize: 13 }}>
          La carte a besoin d&apos;un jeton public Mapbox. Créez un fichier{" "}
          <b>.env.local</b> à la racine de <b>dashboard/</b> :
        </p>
        <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.votre_jeton</code>
        <p style={{ color: "var(--texte-faible)", fontSize: 12 }}>
          Jeton gratuit sur account.mapbox.com/access-tokens, puis relancez{" "}
          <b>npm run dev</b>.
        </p>
      </div>
    </div>
  );
}
