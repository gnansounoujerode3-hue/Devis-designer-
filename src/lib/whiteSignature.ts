import { useEffect, useState } from 'react';

/* ============================================================
   Signatures en encre blanche — pour les templates à fond sombre
   (ex : template Corporate, papier #161616).
   ------------------------------------------------------------
   Les signatures sont des PNG à encre noire sur fond
   transparent. Sur un fond sombre elles seraient invisibles :
   on en génère une version à encre BLANCHE (canal alpha
   conservé) via canvas, mise en cache.
   Cette version blanche est utilisée dans le DOM du template,
   donc elle est automatique dans l'aperçu, l'export PDF,
   l'export SVG et le fichier d'envoi pour signature.
   ============================================================ */

const cache = new Map<string, string | null>();

/** Convertit une signature (dataURL PNG) en encre blanche, en conservant la transparence. */
export function toWhiteSignature(dataUrl: string): Promise<string | null> {
  if (cache.has(dataUrl)) return Promise.resolve(cache.get(dataUrl) ?? null);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) { cache.set(dataUrl, null); resolve(null); return; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) { cache.set(dataUrl, null); resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = 255 - d[i];     // R
          d[i + 1] = 255 - d[i + 1]; // G
          d[i + 2] = 255 - d[i + 2]; // B
          // d[i + 3] (alpha) inchangé : la transparence est conservée
        }
        ctx.putImageData(id, 0, 0);
        const out = c.toDataURL('image/png');
        cache.set(dataUrl, out);
        resolve(out);
      } catch {
        cache.set(dataUrl, null);
        resolve(null);
      }
    };
    img.onerror = () => { cache.set(dataUrl, null); resolve(null); };
    img.src = dataUrl;
  });
}

/** Hook pour templates à fond sombre : versions blanches des signatures (prêtes à afficher). */
export function useWhiteSignatures(designerUrl?: string, clientUrl?: string) {
  const [white, setWhite] = useState<{ designer: string | null; client: string | null }>({ designer: null, client: null });
  useEffect(() => {
    let alive = true;
    Promise.all([
      designerUrl ? toWhiteSignature(designerUrl) : Promise.resolve(null),
      clientUrl ? toWhiteSignature(clientUrl) : Promise.resolve(null),
    ]).then(([d, c]) => {
      if (alive) setWhite({ designer: d, client: c });
    });
    return () => { alive = false; };
  }, [designerUrl, clientUrl]);
  return white;
}
