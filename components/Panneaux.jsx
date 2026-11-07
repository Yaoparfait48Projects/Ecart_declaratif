"use client";

import { Bloc, Case, Courbe, Curseur, Segments, Stat } from "./Elements";
import { COULEUR_OPERATEUR, nombre, pourcent } from "@/lib/constantes";

const OPTIONS_OPERATEUR = [
  { id: "TOUS", libelle: "Tous" },
  { id: "ORANGE", libelle: "Orange" },
  { id: "MTN", libelle: "MTN" },
  { id: "MOOV", libelle: "Moov" },
];

function SelecteurRegion({ regions, valeur, onChange }) {
  return (
    <div className="champ">
      <label>Région</label>
      <select value={valeur} onChange={(e) => onChange(e.target.value)}>
        <option value="">Toutes les régions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ volet 3 */

export function PanneauRisque({ f, setF, regions, stats, synthese }) {
  const m = synthese?.modele;
  return (
    <>
      <div className="grille-stats">
        <Stat valeur={nombre(stats.affichees)} libelle="localités affichées" />
        <Stat
          valeur={nombre(stats.aRisque)}
          libelle="à risque élevé (> 50 %)"
          couleur="var(--danger)"
        />
        <Stat valeur={nombre(stats.population)} libelle="habitants concernés" />
        <Stat
          valeur={pourcent(stats.risqueMoyen, 0)}
          libelle="risque moyen"
          couleur="var(--alerte)"
        />
      </div>

      <Bloc titre="Filtres">
        <Segments
          label="Opérateur"
          options={OPTIONS_OPERATEUR}
          valeur={f.operateur}
          onChange={(v) => setF({ ...f, operateur: v })}
          colorerOperateurs
        />
        <Curseur
          label="Risque minimum"
          valeur={f.seuil}
          min={0}
          max={0.95}
          pas={0.05}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(v) => setF({ ...f, seuil: v })}
        />
        <Curseur
          label="Population minimale"
          valeur={f.popMin}
          min={0}
          max={3000}
          pas={100}
          format={(v) => nombre(v)}
          onChange={(v) => setF({ ...f, popMin: v })}
        />
        <SelecteurRegion
          regions={regions}
          valeur={f.region}
          onChange={(v) => setF({ ...f, region: v })}
        />
        <Case
          label="Uniquement les cas confirmés en 2026"
          coche={f.confirmes}
          onChange={(v) => setF({ ...f, confirmes: v })}
        />
        <Case
          label="Afficher la liste de contrôle recommandée"
          coche={f.ciblage}
          onChange={(v) => setF({ ...f, ciblage: v })}
        />
      </Bloc>

      {m && (
        <Bloc titre="Performance du modèle">
          <div className="grille-stats">
            <Stat valeur={m.pr_auc.toFixed(3)} libelle="PR-AUC" couleur="var(--accent)" />
            <Stat valeur={m.roc_auc.toFixed(3)} libelle="ROC-AUC" couleur="var(--accent)" />
            <Stat
              valeur={pourcent(m.precision_at_171, 0)}
              libelle="précision sur 171 contrôles"
              couleur="var(--succes)"
            />
            <Stat valeur={pourcent(m.taux_base, 0)} libelle="taux de base (hasard)" />
          </div>
          <p className="note" style={{ marginTop: 11 }}>
            Validation croisée par régions. La règle naïve fondée sur la seule distance
            au site atteint {m.naif_pr_auc.toFixed(3)} de PR-AUC.
          </p>
        </Bloc>
      )}

      <Bloc titre="Ce qui explique le risque">
        {Object.entries(synthese?.importance ?? {})
          .slice(0, 7)
          .map(([nom, valeur], i, tableau) => (
            <div key={nom} style={{ marginBottom: 7 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                <span style={{ color: "var(--texte-doux)" }}>{nom}</span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{valeur.toFixed(3)}</b>
              </div>
              <div className="barre-fond">
                <div
                  className="barre-valeur"
                  style={{
                    width: `${(valeur / tableau[0][1]) * 100}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          ))}
      </Bloc>
    </>
  );
}

/* ------------------------------------------------------------------ volet 1 */

export function PanneauBlanches({ f, setF, regions, profils, stats }) {
  return (
    <>
      <div className="grille-stats">
        <Stat valeur={nombre(stats.affichees)} libelle="zones blanches affichées" />
        <Stat
          valeur={nombre(stats.population)}
          libelle="habitants sans couverture"
          couleur="var(--danger)"
        />
        <Stat valeur={nombre(stats.popMediane)} libelle="population médiane" />
        <Stat
          valeur={`${stats.distMediane?.toFixed(1) ?? "—"} km`}
          libelle="distance médiane au site"
          couleur="var(--alerte)"
        />
      </div>

      <Bloc titre="Filtres">
        <Curseur
          label="Rang maximal de priorité"
          valeur={f.rangMax}
          min={25}
          max={886}
          pas={25}
          format={(v) => (v >= 886 ? "tous" : `top ${v}`)}
          onChange={(v) => setF({ ...f, rangMax: v })}
        />
        <Curseur
          label="Population minimale"
          valeur={f.popMin}
          min={0}
          max={2000}
          pas={50}
          format={(v) => nombre(v)}
          onChange={(v) => setF({ ...f, popMin: v })}
        />
        <Curseur
          label="Distance maximale à un site"
          valeur={f.distMax}
          min={2}
          max={25}
          pas={1}
          format={(v) => `${v} km`}
          onChange={(v) => setF({ ...f, distMax: v })}
        />
        <SelecteurRegion
          regions={regions}
          valeur={f.region}
          onChange={(v) => setF({ ...f, region: v })}
        />
        <div className="champ">
          <label>Profil</label>
          <select value={f.profil} onChange={(e) => setF({ ...f, profil: e.target.value })}>
            <option value="">Tous les profils</option>
            {profils.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <Case
          label="Avec école ou centre de santé"
          coche={f.equipements}
          onChange={(v) => setF({ ...f, equipements: v })}
        />
      </Bloc>

      <Bloc titre="Méthode">
        <p className="note">
          Score multicritère : enjeu démographique 40 %, faisabilité technique 25 %,
          enjeu social 20 %, mutualisation 15 %. Les pondérations relèvent d&apos;un
          arbitrage explicite. Le classement au rang près est sensible ; c&apos;est
          l&apos;ensemble désigné qui est stable (recouvrement de 87 % sur le top 200).
        </p>
      </Bloc>
    </>
  );
}

/* ------------------------------------------------------------------ volet 2 */

export function PanneauQos({ f, setF, regions, stats, synthese }) {
  const evolution = synthese?.qos_evolution ?? [];
  return (
    <>
      <div className="grille-stats">
        <Stat valeur={nombre(stats.affichees)} libelle="localités mesurées" />
        <Stat
          valeur={nombre(stats.malDesservies)}
          libelle="sous le seuil de qualité"
          couleur="var(--danger)"
        />
        <Stat valeur={nombre(stats.population)} libelle="habitants concernés" />
        <Stat
          valeur={stats.qualiteMoyenne?.toFixed(2) ?? "—"}
          libelle="qualité moyenne"
          couleur="var(--succes)"
        />
      </div>

      <Bloc titre="Filtres">
        <Segments
          label="Opérateur"
          options={OPTIONS_OPERATEUR}
          valeur={f.operateur}
          onChange={(v) => setF({ ...f, operateur: v })}
          colorerOperateurs
        />
        <Curseur
          label="Qualité maximale affichée"
          valeur={f.seuil}
          min={0.15}
          max={0.8}
          pas={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setF({ ...f, seuil: v })}
        />
        <SelecteurRegion
          regions={regions}
          valeur={f.region}
          onChange={(v) => setF({ ...f, region: v })}
        />
      </Bloc>

      {evolution.length > 0 && (
        <Bloc titre="Qualité moyenne par campagne">
          <Courbe
            hauteur={82}
            formatY={(v) => v.toFixed(2)}
            series={["ORANGE", "MTN", "MOOV"].map((op) => ({
              nom: op,
              couleur: COULEUR_OPERATEUR[op],
              valeurs: evolution.map((e) => e[`qualite_${op}`]),
            }))}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9.5,
              color: "var(--texte-faible)",
              marginTop: 4,
            }}
          >
            <span>{evolution[0]?.campagne}</span>
            <span>{evolution[evolution.length - 1]?.campagne}</span>
          </div>
        </Bloc>
      )}

      <Bloc titre="Nature des données">
        <p className="note">
          Seul bloc reposant sur des mesures terrain de l&apos;ARTCI, et non sur des
          déclarations. L&apos;échantillon vise les chefs-lieux : ces résultats ne sont
          pas extrapolables aux 8 757 localités du pays.
        </p>
      </Bloc>
    </>
  );
}
