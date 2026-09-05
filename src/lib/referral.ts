/* ============================================================
   Partage, parrainage & CONCOURS (niveau 4)
   ------------------------------------------------------------
   Mécanique (100% hors-ligne) :
   - Chaque installation possède un code parrain unique : DDREF-XXXX
   - L'utilisateur partage l'app (WhatsApp, SMS, bouche-à-oreille)
   - CONCOURS (récompense 3 mois gratuits, 1 seule fois) :
      1. Partager son MEILLEUR devis sur son statut WhatsApp
      2. Recommander l'app (message + lien)
      3. Confirmer dans l'app  code récompense +3 mois généré
   ============================================================ */

import { generateCode } from './license';
import { VENDOR } from './config';

const APP_DOWNLOAD_LINK = VENDOR.DOWNLOAD_LINK;

const LS_MY_REF = 'dd_ref_mycode';
const LS_PARRAIN = 'dd_ref_parrain';
const LS_CONTEST_REWARDED = 'dd_contest_rewarded';
const LS_CONTEST_CODE = 'dd_contest_code';

/** Code parrain unique de CETTE installation (généré au 1er appel). */
export function getMyRefCode(): string {
  try {
    let c = localStorage.getItem(LS_MY_REF);
    if (!c) {
      c = 'DDREF-' + Math.random().toString(36).slice(2, 6).toUpperCase()
        + Math.random().toString(36).slice(2, 6).toUpperCase();
      localStorage.setItem(LS_MY_REF, c);
    }
    return c;
  } catch { return 'DDREF-XXXX'; }
}

/** Enregistre le code du parrain saisi via un lien ?ref=DDREF-XXXX. */
export function saveParrainCode(input: string) {
  const clean = (input || '').trim().toUpperCase();
  if (clean.startsWith('DDREF-') && clean.length >= 10) {
    localStorage.setItem(LS_PARRAIN, clean);
  }
}

export function getParrainCode(): string | null {
  try { return localStorage.getItem(LS_PARRAIN); } catch { return null; }
}

/* ---------------- Message de recommandation (partage app) ---------------- */

export function buildShareMessage(): string {
  const c = getMyRefCode();
  return `Devis Designer — créez vos devis et factures professionnels en un clin d'oeil.\n20 exports gratuits. Abonnement 2000 F/mois ou 15000 F/an.\nTélécharger : ${APP_DOWNLOAD_LINK}\nCode parrain : ${c}`;
}

/** URL WhatsApp pré-remplie pour recommander l'app. */
export function whatsappShareUrl(): string {
  return 'https://wa.me/?text=' + encodeURIComponent(buildShareMessage());
}

/* ---------------- CONCOURS (niveau 4) : 3 mois gratuits ---------------- */

/** Message du statut WhatsApp : « mon meilleur devis ». */
export function buildContestStatusMessage(): string {
  const c = getMyRefCode();
  return `Mon meilleur devis, créé avec Devis Designer.\nVous aussi, créez vos devis et factures professionnels : 20 exports gratuits, abonnement 2000 F/mois.\nTélécharger : ${APP_DOWNLOAD_LINK}\nCode parrain : ${c}`;
}

/** URL WhatsApp (statut) pour le concours. */
export function contestStatusWhatsAppUrl(): string {
  return 'https://wa.me/?text=' + encodeURIComponent(buildContestStatusMessage());
}

/** Message de recommandation pour le concours (2e étape). */
export function buildContestRecommendMessage(): string {
  const c = getMyRefCode();
  return `Je recommande Devis Designer pour créer des devis et factures professionnels.\nTélécharger : ${APP_DOWNLOAD_LINK}\nCode parrain : ${c}`;
}

export function contestRecommendWhatsAppUrl(): string {
  return 'https://wa.me/?text=' + encodeURIComponent(buildContestRecommendMessage());
}

/** Le concours a-t-il déjà été récompensé sur cette installation ? */
export function isContestRewarded(): boolean {
  return localStorage.getItem(LS_CONTEST_REWARDED) === '1';
}

export function markContestRewarded() {
  localStorage.setItem(LS_CONTEST_REWARDED, '1');
}

/** Code récompense déjà généré (si l'utilisateur ne l'a pas copié). */
export function getStoredContestCode(): string | null {
  try { return localStorage.getItem(LS_CONTEST_CODE); } catch { return null; }
}

/**
 * Génère (une seule fois) le code récompense +3 mois du concours.
 * Retourne le code, stocké localement pour réaffichage.
 */
export async function generateContestRewardCode(): Promise<string> {
  const existing = getStoredContestCode();
  if (existing) return existing;
  const code = await generateCode('MONTHLY', 3);
  try { localStorage.setItem(LS_CONTEST_CODE, code); } catch { /* ignore */ }
  return code;
}
