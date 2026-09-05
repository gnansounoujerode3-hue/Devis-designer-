/* ============================================================
   Configuration vendeur & intégration Chariow (Mobile Money)
   ------------------------------------------------------------
   À PERSONNALISER avec VOS informations :
   1. VENDOR_PHONE    : votre numéro Mobile Money (client contacté
                        pour recevoir son code après paiement)
   2. VENDOR_WHATSAPP : lien WhatsApp pour les designs personnalisés
   3. CHARIOW_LINKS   : liens de paiement créés dans votre espace
                        Chariow (boutique / lien de paiement).
                         https://chariow.com (gratuit, commission 15%)
   ============================================================ */

export const VENDOR = {
  /** Numéro affiché au client pour recevoir son code après paiement */
  PHONE: '+229 01 91 94 35 18',
  /** Lien WhatsApp pour commander un design personnalisé */
  WHATSAPP: 'https://wa.me/2290191943518?text=Bonjour%2C%20je%20viens%20de%20payer%20le%20design%20personnalis%C3%A9%20(5000%20F).%20Voici%20ma%20description%20%3A',
  EMAIL: 'gnansounoujerode3@gmail.com',
  /** Nom de votre app / marque */
  APP_NAME: 'Devis Designer',
  /** Lien de téléchargement de l'app (utilisé dans les messages de partage) */
  DOWNLOAD_LINK: 'https://votre-lien-telechargement.com',
};

/** PIN de l'espace vendeur (génération de codes d'activation). À changer ! */
export const VENDOR_PIN = '2468';

/* ------------------------------------------------------------------
   PAIEMENT AUTOMATIQUE (optionnel).
   Renseignez l'URL de votre Worker Cloudflare (deployé depuis
   backend/worker.js) pour activer le flux automatique :
   paiement Chariow confirmé → offre activée automatiquement dans
   l'app, sans code saisi par le client.
   Voir README → « Paiement automatique ».
   Si vide : le flux manuel actuel (lien Chariow / Mobile Money +
   code généré dans l'espace vendeur) reste actif.
   ------------------------------------------------------------------ */
export const AUTO_PAY_WORKER_URL = 'https://devisdesigner.gnansounoujerode3.workers.dev';

/* ------------------------------------------------------------------
   Liens de paiement Chariow.
   Créez un lien de paiement par produit dans votre tableau de bord
   Chariow, puis collez l'URL ici. Si un lien est vide (''), le bouton
   "Payer" affichera le numéro du vendeur à la place (paiement manuel).
   ------------------------------------------------------------------ */
export const CHARIOW_LINKS = {
  /** 2 000 F — abonnement 1 mois */
  MONTHLY: '',
  /** 15 000 F — abonnement 1 an */
  ANNUAL: '',
  /** 5 000 F — design personnalisé (paiement unique) */
  CUSTOM_DESIGN: '',
  /** 50 000 F — tous les designs pendant 1 an */
  ALL: '',
};

/* ------------------------------------------------------------------
   API Chariow (optionnel — pour les paiements 100% automatiques).
   Renseignez votre clé API (Espace Chariow  API) et le endpoint.
    L'appel depuis le navigateur peut être bloqué (CORS) :
   en production, passez par un petit serveur (voir README).
   ------------------------------------------------------------------ */
export const CHARIOW_API = {
  KEY: '',                       // ex: 'sk_live_...'
  BASE_URL: 'https://api.chariow.com/v1',
  MERCHANT_PHONE: VENDOR.PHONE,
  CURRENCY: 'XOF',
};

/**
 * Crée une demande de paiement via l'API Chariow.
 * Retourne l'URL de paiement à ouvrir, ou null si non configuré.
 */
export async function createChariowPayment(amount: number, description: string): Promise<string | null> {
  if (!CHARIOW_API.KEY) return null;
  try {
    const res = await fetch(`${CHARIOW_API.BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHARIOW_API.KEY}`,
      },
      body: JSON.stringify({
        amount,
        currency: CHARIOW_API.CURRENCY,
        description,
        callback_url: window.location.origin + '/#/paiement-confirme',
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.payment_url || json.url || null;
  } catch {
    return null;
  }
}
