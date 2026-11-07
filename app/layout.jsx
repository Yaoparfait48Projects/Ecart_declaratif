// L'ordre compte : mapbox-gl.css définit `.mapboxgl-map { position: relative }`,
// qui écraserait le positionnement absolu de `.carte` s'il était chargé en dernier.
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata = {
  title: "Observatoire de la couverture mobile — Côte d'Ivoire",
  description:
    "Priorisation des zones blanches, qualité de service mesurée et risque de surdéclaration de couverture.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
