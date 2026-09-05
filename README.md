# Devis Designer — Application Web

Générateur de devis et factures professionnels en SVG/PDF, **100 % web** :
aucune installation, accessible depuis n'importe quel navigateur (PC, téléphone, tablette),
mises à jour automatiques.

## Démarrage rapide

```bash
npm install        # installer les dépendances
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # build de production (fichier unique dist/index.html)
npm run preview    # prévisualiser le build
```

## Fonctionnalités

- **12 templates de devis/factures** personnalisables (couleurs, polices, logo, conditions)
- **Édition directe** : toucher/cliquer un texte sur l'aperçu pour le modifier (n'importe quel texte)
- **Signatures** manuscrites (émetteur + client), envoi pour signature
- **Export** : PDF (A4 multipages), SVG, présentation plein écran
- **Sauvegarde / restauration** JSON (export/import de tous les devis + clients)
- **Monétisation intégrée** : 20 exports gratuits, abonnements 2000 F/mois, 15 000 F/an,
  design personnalisé 5 000 F, tous les designs 50 000 F/an (activation par codes)
- **Concours** : partagez votre meilleur devis sur WhatsApp → 3 mois gratuits
- **FAQ, CGU et politique de confidentialité** intégrés (conforme loi n°2017-20 Bénin)
- **Rappel d'expiration** d'abonnement, carnet de clients, filigrane de statut

## Structure

```
devis-designer/
├── index.html          # Point d'entrée
├── package.json        # Dépendances & scripts
├── vite.config.ts      # Configuration Vite (fichier unique)
├── tsconfig.json       # TypeScript strict
├── backend/
│   └── worker.js       # Serveur de validation des codes (Cloudflare Worker, optionnel)
└── src/
    ├── main.tsx        # Bootstrap React
    ├── App.tsx         # Composant racine
    ├── components/     # Paywall, Espace vendeur (VendorPage), FAQ, Legal, Onboarding...
    ├── templates/      # Les 12 templates SVG
    ├── lib/            # license (quota/codes), referral (parrainage), config, store...
    ├── store.ts        # Persistance localStorage + sauvegarde JSON
    ├── types.ts        # Types partagés
    └── assets/         # Logo
```

## 💰 Monétisation

| Offre | Prix | Effet |
|---|---|---|
| Gratuit | 0 F | **20 exports PDF / envois signature** par installation (la création de devis est libre) |
| Abonnement mensuel | 2 000 F / mois | Exports illimités pendant 1 mois (cumulable) |
| Abonnement 1 an | 15 000 F / an | Exports illimités pendant 1 an |
| Design personnalisé | 5 000 F | Un design sur mesure pour votre template (paiement unique) |
| TOUS les designs (1 an) | 50 000 F / an | N'importe quel design de template gratuit pendant 1 an + exports illimités |

### Comment ça marche (sans serveur)
1. Le client crée ses devis librement. Chaque **export PDF** ou **envoi pour signature** consomme 1 des 20 gratuits.
2. Épuisé → le client paie via **Chariow** (Mobile Money : MTN MoMo, Orange Money, Wave, Moov — commission 15 %).
3. Vous générez un **code d'activation** depuis la page vendeur réservée (voir « Espace vendeur » ci-dessous).
4. Vous envoyez le code au client (1 clic WhatsApp depuis la page vendeur, ou SMS). Il le saisit dans « Déjà abonné ? » → licence activée immédiatement.

### Personnalisation (`src/lib/config.ts`)
- `VENDOR.PHONE` / `VENDOR.WHATSAPP` / `VENDOR.EMAIL` : vos coordonnées
- `VENDOR_PIN` : PIN de l'espace vendeur (**à changer avant lancement !**)
- `VENDOR.DOWNLOAD_LINK` : l'URL de votre application web (pour les messages de partage)
- `CHARIOW_LINKS` : liens de paiement Chariow par produit (MONTHLY 2000 F, ANNUAL 15000 F, CUSTOM_DESIGN 5000 F, ALL 50000 F)
- `CHARIOW_API.KEY` : clé API Chariow pour paiements automatiques (⚠️ CORS : via un mini serveur)

## ⚡ Paiement automatique (offre activée sans code)

Par défaut, le flux est manuel (le client paie, vous générez un code, il le saisit).
Il est possible d'activer un **flux 100 % automatique** : le client paie par Mobile
Money, et **l'application active l'offre toute seule**, sans aucune saisie.

```
Client                Worker Cloudflare              Chariow
  |  1. choisit l'offre  |                              |
  |  2. /checkout ──────>│ 3. crée la vente (API) ────>│
  |  4. page de paiement <│──────────────────────────────│
  |  5. paie (MoMo) ────────────────────────────────────>│
  |                     |  6. Pulse signé (webhook) <───│
  |                     |  7. vérifie la vente (API)    |
  |  8. /check (polling)│                              |
  |  9. code signé <────│ (généré 1 seule fois)         |
  10. offre activée automatiquement dans l'app
```

### Mise en place (une seule fois, ~20 min)

1. **Chariow** (https://chariow.com) :
   - Créez 4 produits et notez leurs IDs (`prd_...`) :
     Abonnement 1 mois (2 000 F) · Abonnement 1 an (15 000 F) ·
     Design personnalisé (5 000 F) · Tous les designs (50 000 F)
   - **Automations → Pulses** : créez un Pulse vers
     `https://VOTRE-WORKER.workers.dev/webhook` (événements de vente),
     puis copiez son **secret de signature** (`whsec_...`)
2. **Cloudflare** (gratuit) : Workers & Pages → Create → Worker →
   collez le contenu de `backend/worker.js` → Deploy, puis :
   - Variables : `SECRET_KEYS` (JSON, ex `{"v1":"votre-secret"}`),
     `ADMIN_PASS`, `CHARIOW_KEY` (clé API `sk_live_...`),
     `CHARIOW_PULSE_SECRET` (le `whsec_...`),
     `PRODUCT_IDS` = `{"MONTHLY":"prd_...","ANNUAL":"prd_...","DESIGN":"prd_...","ALL":"prd_..."}`
   - Storage → KV : créez un namespace `DD_KV` et liez-le au Worker
3. **L'application** : dans `src/lib/config.ts` →
   `AUTO_PAY_WORKER_URL = "https://VOTRE-WORKER.workers.dev"`

Sécurité : la clé API Chariow ne vit que dans le Worker (jamais dans l'app),
le webhook est vérifié par signature HMAC, chaque vente est reliée à
l'installation (code parrain) et le code d'activation n'est délivré qu'une seule fois.

Si `AUTO_PAY_WORKER_URL` est vide : le flux manuel actuel reste actif
(lien Chariow / Mobile Money + code depuis l'espace vendeur).

## 🔐 Espace vendeur (page propriétaire)

Page **réservée au vendeur** (vous), **invisible des utilisateurs** : aucune
liaison dans l'application, accès uniquement via l'URL :

```
https://votre-app.com/#/vendeur
```

1. Saisissez le **PIN** (`VENDOR_PIN` dans `src/lib/config.ts` — par défaut `2468`, **à changer**).
   La session reste ouverte tant que l'onglet est ouvert (déconnexion manuelle possible).
2. Depuis le tableau de bord :
   - **Statistiques** : total encaissé, ventes du mois, codes actifs/expirés, clients uniques,
     ventilation par offre
   - **Génération de codes** : choisir l'offre, saisir le nom + n° WhatsApp du client
     (optionnel) → le code est généré, copié, et envoyé en 1 clic sur WhatsApp
   - **Historique des ventes** : date, client, offre, prix, code, statut (actif/expiré —
     un code reste activable 30 jours après sa génération), copier / WhatsApp / supprimer
   - **Export CSV** de l'historique pour archiver vos ventes

Les codes sont signés par HMAC : un code généré ici s'active sur n'importe quelle
installation de l'application. L'historique est conservé dans le navigateur où il est
généré (exportez régulièrement en CSV).

## 🌐 Déploiement web

Le build produit **un seul fichier** `dist/index.html` (tout inliné : JS, CSS, logo, favicon).
Il peut être hébergé **n'importe où** :

### Option 1 — Vercel (recommandé, gratuit)
```bash
npm run deploy
```
Ou via le tableau de bord vercel.com : importez le dépôt, framework = Vite, build = `npm run build`, output = `dist`.

### Option 2 — Netlify (gratuit)
- Glissez-déposez le dossier `dist/` sur app.netlify.com/drop
- Ou connectez votre dépôt : build `npm run build`, publish `dist`

### Option 3 — Hébergement classique (OVH, Hostinger, etc.)
- Téléversez `dist/index.html` (et le dossier `dist/` entier) sur votre espace web
- L'application est un fichier unique : pas de serveur, pas de configuration

### Option 4 — GitHub Pages
```bash
npm run build
npx gh-pages -d dist
```

## 🔐 Sécurité

### Couche 1 — Durcissement local (déjà actif)
- Secret encodé (base64) · codes valables 30 jours · anti-brute-force (5 échecs → 1h)
- Compteur d'exports à double emplacement (localStorage + IndexedDB)
- PIN de l'espace vendeur (`VENDOR_PIN` dans `src/lib/config.ts`, par défaut `2468` — à changer)

### Couche 2 — Serveur de validation (`backend/worker.js`, optionnel)
Cloudflare Worker **gratuit** (100k requêtes/jour) : validation des codes côté serveur,
anti-rejeu, quota par appareil. Voir le fichier pour les instructions de déploiement.

## 🎁 Partage & concours (3 mois gratuits)

| Mécanisme | Détail |
|---|---|
| **Code parrain** | Chaque installation a un code unique `DDREF-XXXX` |
| **Partage WhatsApp 1 clic** | Boutons « Recommander sur WhatsApp » avec message pré-écrit + lien web |
| **CONCOURS — 3 mois gratuits** | Après un export réussi : 1) publier son meilleur devis sur son statut WhatsApp 2) recommander l'app 3) confirmer → code récompense **+3 mois** (1 seule fois) |
| **Lien `?ref=`** | `https://votre-app/?ref=DDREF-XXXX` pré-remplit le code parrain à l'arrivée |
| **Bannière quota bas** | Quand il reste ≤ 5 exports gratuits → bandeau d'urgence avec bouton partager |

## Notes

- **Données** : stockées dans le navigateur (localStorage). Encourager la sauvegarde JSON
  (barre « SAUVEGARDE » sur la page d'accueil) — indispensable sur le web partagé.
- **Responsive** : interface optimisée PC et mobile (header compact, tap pour éditer, boutons visibles au toucher).
- **QR** : retiré de tous les templates (exigence utilisateur).
- **Aucun emoji** dans l'interface (exigence utilisateur).
