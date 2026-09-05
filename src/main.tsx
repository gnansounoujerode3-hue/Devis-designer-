import { Component, StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import VendorPage from "./components/VendorPage";

/* ============================================================
   ROUTE CACHÉE — ESPACE VENDEUR
   La page réservée au propriétaire est accessible uniquement
   via l'URL  <origine>/#/vendeur  (aucune liaison dans l'app).
   ============================================================ */
const isVendorRoute = () => window.location.hash.startsWith("#/vendeur");

function Root() {
  const [vendor, setVendor] = useState(isVendorRoute);
  useEffect(() => {
    const onHash = () => setVendor(isVendorRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (vendor) return <VendorPage />;
  return <App />;
}

/* ============================================================
   PATCH GLOBAL ANTI-CRASH
   Neutralise l'erreur DOM classique :
   « Échec de l'exécution de 'removeChild' : le nœud à supprimer
   n'est pas un enfant de ce nœud ».
   Au lieu de lever une exception qui casse l'application,
   on ignore silencieusement l'opération (comportement inoffensif).
   ============================================================ */
(function patchRemoveChild() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig: any = Element.prototype.removeChild;
    if (!orig.__ddPatched) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Element.prototype.removeChild = function (child: any): any {
        if (child && child.parentNode !== this) {
          return child;
        }
        return orig.call(this, child);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Element.prototype.removeChild as any).__ddPatched = true;
    }
  } catch { /* si le patch échoue, on continue sans lui */ }
})();

/* Garde-fou : en cas d'erreur de rendu, affiche un message au lieu d'une page blanche */
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown) {
    console.error("Erreur applicative:", err);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  handleWipe = () => {
    try {
      // Purge des données potentiellement corrompues (garde les réglages sombre)
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('devis_') || k.startsWith('dd_')) localStorage.removeItem(k);
      });
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", fontFamily: "Inter, system-ui, sans-serif", padding: 20 }}>
          <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Une erreur est survenue</h1>
            <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>
              Un problème inattendu a empêché l'affichage. Vos données sont toujours en sécurité.
            </p>
            <button
              onClick={this.handleReset}
              style={{ background: "#0057FF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginRight: 8 }}
            >
              Recharger
            </button>
            <button
              onClick={this.handleWipe}
              style={{ background: "transparent", color: "#888", border: "1px solid #444", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Réinitialiser les données
            </button>
            <p style={{ color: "#666", fontSize: 11, marginTop: 14 }}>
              « Réinitialiser » efface les documents et réglages de ce navigateur (utilisez-le en dernier recours, après avoir exporté une sauvegarde si possible).
            </p>
            <div style={{ marginTop: 12, background: "#111", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", textAlign: "left" }}>
              <div style={{ color: "#888", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>DÉTAIL TECHNIQUE :</div>
              <div style={{ color: "#ff6b6b", fontSize: 11, fontFamily: "monospace", wordBreak: "break-word" }}>{this.state.message}</div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>
);
