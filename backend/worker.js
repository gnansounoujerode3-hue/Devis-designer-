/* ============================================================
   Devis Designer — Serveur (Cloudflare Worker)  [v2 — diagnostique]
   ------------------------------------------------------------
   v2 : correction du parsing du payload Pulse Chariow
        (la vente est dans payload.sale, pas payload.data),
        reverse-lookup saleId -> purchaseId, journalisation
        des webhooks, et endpoint /debug pour le diagnostic.
   ============================================================ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Chariow-Signature, X-Pulse-Id, X-Pulse-Delivery-Id, X-Pulse-Event',
    };
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
      /* ---- 0. DIAGNOSTIC (ouverture dans le navigateur) ---- */
      if (path === '/debug' && request.method === 'GET') {
        const out = {
          secretKeysCount: Object.keys(getSecretKeys(env)).length,
          adminPassSet: getAdminPass(env) !== 'change-me',
          chariowKey: null,
          pulseSecret: null,
          productIds: null,
          kvWorks: false,
          lastCheckout: null,
          lastCheck: null,
          webhookCount: 0,
          lastWebhook: null,
          pendingPayments: [],
        };
        const ck = envGet(env, 'CHARIOW_KEY');
        out.chariowKey = ck ? ('presente (' + String(ck).slice(0, 8) + '...)') : 'ABSENTE';
        const ps = envGet(env, 'CHARIOW_PULSE_SECRET');
        out.pulseSecret = ps ? {
          prefix: String(ps).slice(0, 8),
          suffix: String(ps).slice(-4),
          length: String(ps).length,
          whitespace: /\s/.test(String(ps)),
          placeholder: String(ps).indexOf('REMPLACER') !== -1,
        } : 'ABSENTE';
        try {
          const p = JSON.parse(envGet(env, 'PRODUCT_IDS') || '{}');
          out.productIds = { MONTHLY: !!p.MONTHLY, ANNUAL: !!p.ANNUAL, DESIGN: !!p.DESIGN, ALL: !!p.ALL };
        } catch { out.productIds = 'JSON INVALIDE'; }
        try {
          await env.DD_KV.put('debug:test', JSON.stringify(1));
          out.kvWorks = (await env.DD_KV.get('debug:test')) === '1';
          await env.DD_KV.delete('debug:test');
        } catch { out.kvWorks = false; }
        out.lastCheckout = await kvGet(env, 'log:checkout', null);
        out.lastCheck = await kvGet(env, 'log:check', null);
        out.webhookCount = await kvGet(env, 'log:webhook:count', 0);
        out.lastWebhook = await kvGet(env, 'log:webhook:last', null);
        try {
          const listed = await env.DD_KV.list({ prefix: 'pay:' });
          out.pendingPayments = (listed.keys || []).map(k => k.name).slice(-10);
        } catch { out.pendingPayments = 'KV list indisponible'; }
        return json({ ok: true, debug: out }, 200, cors);
      }

      /* ---- 1. VALIDER UN CODE (appelé par l'application) ---- */
      if (path === '/validate' && request.method === 'POST') {
        const body = await request.json();
        const code = String(body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const deviceId = String(body.deviceId || '');

        const result = await verifyCode(code, env);
        if (!result.ok) return json({ ok: false, message: result.message }, 400, cors);

        const used = await kvGet(env, 'used:' + deviceId, 0);
        if (used >= 20) {
          return json({ ok: false, message: 'Quota gratuit de 20 exports atteint sur cet appareil.' }, 403, cors);
        }
        const already = await kvGet(env, 'code:' + code, null);
        if (already) return json({ ok: false, message: 'Ce code a deja ete utilise.' }, 403, cors);
        await kvPut(env, 'code:' + code, 'used');

        return json({ ok: true, ...result.license }, 200, cors);
      }

      /* ---- 2. ENREGISTRER UN EXPORT (appelé par l'application) ---- */
      if (path === '/export' && request.method === 'POST') {
        const body = await request.json();
        const deviceId = String(body.deviceId || '');
        const used = await kvGet(env, 'used:' + deviceId, 0);
        await kvPut(env, 'used:' + deviceId, used + 1);
        return json({ ok: true, used: used + 1 }, 200, cors);
      }

      /* ---- 3. ESPACE VENDEUR : générer un code (avec mot de passe) ---- */
      if (path === '/vendor/gen' && request.method === 'POST') {
        const body = await request.json();
        if (body.admin !== getAdminPass(env)) return json({ ok: false, message: 'Non autorise.' }, 401, cors);
        const code = await makeCode(body.kind, body.months || 1, env);
        return json({ ok: true, code }, 200, cors);
      }

      /* ---- 4. PAIEMENT AUTO : créer la vente Chariow ---- */
      if (path === '/checkout' && request.method === 'POST') {
        const body = await request.json();
        const offer = String(body.offer || '').toUpperCase();
        const deviceId = String(body.deviceId || '').toUpperCase();
        const customer = body.customer || {};
        const name = String(customer.name || 'Client').trim();
        const email = String(customer.email || '').trim();
        const phone = String(customer.phone || '').replace(/\D/g, '');

        if (!['MONTHLY', 'ANNUAL', 'DESIGN', 'ALL'].includes(offer)) {
          return json({ ok: false, message: 'Offre inconnue.' }, 400, cors);
        }
        if (!deviceId || !email || !phone) {
          return json({ ok: false, message: 'Nom, email et numero requis.' }, 400, cors);
        }
        const key = envGet(env, 'CHARIOW_KEY');
        if (!key) {
          await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, error: 'CHARIOW_KEY absente' });
          return json({ ok: false, message: 'Paiement auto non configure (clé Chariow manquante).' }, 503, cors);
        }

        const products = JSON.parse(envGet(env, 'PRODUCT_IDS') || '{}');
        const productId = products[offer];
        if (!productId) {
          await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, error: 'produit non configure' });
          return json({ ok: false, message: 'Produit Chariow non configure pour cette offre.' }, 503, cors);
        }

        const purchaseId = 'dd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
        const [firstName, ...rest] = name.split(/\s+/);
        const lastName = rest.join(' ') || name;

        const res = await fetch('https://api.chariow.com/v1/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({
            product_id: productId,
            email,
            first_name: firstName.slice(0, 50),
            last_name: lastName.slice(0, 50),
            phone: { number: phone, country_code: 'BJ' },
            custom_metadata: { purchaseId, deviceId },
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, purchaseId, error: 'Chariow HTTP ' + res.status + ' : ' + err.slice(0, 300) });
          return json({ ok: false, message: 'Erreur Chariow (' + res.status + ').' + (err ? ' ' + err.slice(0, 200) : '') }, 502, cors);
        }
        const data = await res.json();
        const step = data.data && data.data.step;
        const saleId = data.data && data.data.purchase && data.data.purchase.id;
        const checkoutUrl = data.data && data.data.payment && data.data.payment.checkout_url;

        if (step === 'completed') {
          await kvPut(env, 'pay:' + purchaseId, { offer, deviceId, saleId, status: 'paid', createdAt: Date.now(), delivered: false });
          const code = await makeCode(offer, 1, env);
          await kvPut(env, 'pay:' + purchaseId, { offer, deviceId, saleId, status: 'paid', createdAt: Date.now(), delivered: true, code });
          await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, purchaseId, saleId, result: 'paid immediat' });
          return json({ ok: true, status: 'paid', code, purchaseId }, 200, cors);
        }
        if (step !== 'payment' || !checkoutUrl) {
          await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, purchaseId, error: 'reponse Chariow inattendue : ' + JSON.stringify(data).slice(0, 300) });
          return json({ ok: false, message: 'Réponse Chariow inattendue.' }, 502, cors);
        }

        await kvPut(env, 'pay:' + purchaseId, { offer, deviceId, saleId, status: 'pending', createdAt: Date.now(), delivered: false });
        if (saleId) await kvPut(env, 'sale:' + saleId, purchaseId);
        await kvPut(env, 'log:checkout', { at: new Date().toISOString(), offer, purchaseId, saleId, result: 'pending', checkoutUrl: String(checkoutUrl).slice(0, 80) });
        return json({ ok: true, status: 'pending', checkout_url: checkoutUrl, purchaseId }, 200, cors);
      }

      /* ---- 5. PULSE CHARIOW (webhook signé) ---- */
      if (path === '/webhook' && request.method === 'POST') {
        const rawBody = await request.arrayBuffer();
        const signature = request.headers.get('x-chariow-signature') || '';
        const deliveryId = request.headers.get('x-pulse-delivery-id') || '';
        const event = request.headers.get('x-pulse-event') || '';
        const pulseSecret = envGet(env, 'CHARIOW_PULSE_SECRET');

        let payload;
        try { payload = JSON.parse(new TextDecoder().decode(rawBody)); } catch { payload = null; }

        // Parsing robuste du payload Pulse (la vente est dans payload.sale)
        const d = (payload && (payload.sale || payload.data || payload)) || {};
        const saleId = (d.id) ? String(d.id) : null; // accepte tous les formats d'ID Chariow (sal_..., SALEZ...)
        const meta = d.custom_metadata || (payload && payload.custom_metadata) || {};
        let purchaseId = meta.purchaseId || null;
        const evt = (payload && payload.event) || event;

        // Vérification de signature — tolérante aux erreurs de collage
        // (espace en fin de chaîne, guillemets ajoutés par copier-coller)
        let sigOk = false;
        let secretLen = 0;
        if (pulseSecret) {
          const raw = String(pulseSecret);
          secretLen = raw.length;
          const candidates = [...new Set([raw, raw.trim(), raw.replace(/^["']|["']$/g, ''), raw.trim().replace(/^["']|["']$/g, '')])];
          for (const sec of candidates) {
            const expected = 'sha256=' + await hmacHex(new Uint8Array(rawBody), sec);
            if (signature.startsWith('sha256=') && timingSafeEqual(signature, expected)) { sigOk = true; break; }
          }
        }

        // Reverse-lookup : si purchaseId absent, on le retrouve via le saleId
        if (!purchaseId && saleId) purchaseId = await kvGet(env, 'sale:' + saleId, null);

        let action = 'ignore';
        if (!sigOk) {
          action = 'signature REJETEE';
        } else if (deliveryId && (await kvGet(env, 'pulse:' + deliveryId, 0))) {
          action = 'deja traite (idempotent)';
        } else if (purchaseId) {
          if (deliveryId) await kvPut(env, 'pulse:' + deliveryId, 1);
          const rec = await kvGet(env, 'pay:' + purchaseId, null);
          if (rec) {
            const isSuccess = evt.indexOf('success') !== -1 || event.indexOf('success') !== -1;
            const isFail = evt.indexOf('fail') !== -1 || event.indexOf('fail') !== -1;
            const isAbandon = evt.indexOf('abandon') !== -1 || event.indexOf('abandon') !== -1;
            if (isSuccess) {
              // Confirmer auprès de Chariow (source de vérité) avant d'activer
              const key = envGet(env, 'CHARIOW_KEY');
              let paid = true;
              const sid = saleId || rec.saleId;
              if (key && sid) {
                try {
                  const r = await fetch('https://api.chariow.com/v1/sales/' + sid, { headers: { 'Authorization': 'Bearer ' + key } });
                  if (r.ok) {
                    const sd = await r.json();
                    paid = !!(sd.data && (sd.data.status === 'completed' || sd.data.status === 'settled'));
                  }
                } catch { paid = true; }
              }
              if (paid) {
                rec.status = 'paid';
                rec.paidAt = Date.now();
                await kvPut(env, 'pay:' + purchaseId, rec);
                action = 'paiement marque PAID';
              } else {
                action = 're-vérification Chariow : vente pas complete';
              }
            } else if (isFail || isAbandon) {
              rec.status = 'failed';
              await kvPut(env, 'pay:' + purchaseId, rec);
              action = 'paiement marque FAILED';
            } else {
              action = 'evenement non géré : ' + (evt || event);
            }
          } else {
            action = 'purchaseId inconnu du Worker : ' + purchaseId;
          }
        } else {
          action = 'aucun purchaseId/saleId exploitable dans le payload';
        }

        // Journalisation (diagnostic)
        await kvPut(env, 'log:webhook:last', {
          at: new Date().toISOString(),
          event: evt || event || '?',
          deliveryId: deliveryId || null,
          signature: signature ? (signature.slice(0, 15) + '...') : 'ABSENTE',
          signatureOk: sigOk,
          secretLength: secretLen,
          secretSuffix: pulseSecret ? String(pulseSecret).trim().slice(-4) : null,
          pulseSecretSet: !!pulseSecret,
          saleId,
          purchaseId,
          action,
        });
        await kvPut(env, 'log:webhook:count', (await kvGet(env, 'log:webhook:count', 0)) + 1);

        if (!sigOk) return json({ ok: false, message: 'Signature invalide.' }, 401, cors);
        return new Response('OK', { status: 200, headers: cors });
      }

      /* ---- 6. PAIEMENT AUTO : l'app interroge le statut ---- */
      if (path === '/check' && request.method === 'POST') {
        const body = await request.json();
        const purchaseId = String(body.purchaseId || '');
        const deviceId = String(body.deviceId || '').toUpperCase();
        const rec = await kvGet(env, 'pay:' + purchaseId, null);
        if (!rec) {
          await kvPut(env, 'log:check', { at: new Date().toISOString(), purchaseId, status: 'unknown' });
          return json({ ok: false, status: 'unknown', message: 'Vente inconnue.' }, 404, cors);
        }
        // Si toujours "pending", vérifier le statut RÉEL de la vente chez Chariow
        // (filet de sécurité si le Pulse/webhook ne passe pas) — max 1 appel API / 15 s
        let realStatus = null;
        if (rec.status === 'pending' && rec.saleId) {
          const key = envGet(env, 'CHARIOW_KEY');
          const cached = await kvGet(env, 'salestatus:' + rec.saleId, null);
          if (key && (!cached || Date.now() - cached.at > 15000)) {
            try {
              const r = await fetch('https://api.chariow.com/v1/sales/' + rec.saleId, { headers: { 'Authorization': 'Bearer ' + key } });
              if (r.ok) {
                const sd = await r.json();
                realStatus = sd.data && sd.data.status;
                await kvPut(env, 'salestatus:' + rec.saleId, { at: Date.now(), status: realStatus });
                if (realStatus === 'completed' || realStatus === 'settled') {
                  rec.status = 'paid';
                  rec.paidAt = Date.now();
                  await kvPut(env, 'pay:' + purchaseId, rec);
                } else if (realStatus === 'failed' || realStatus === 'abandoned') {
                  rec.status = 'failed';
                  await kvPut(env, 'pay:' + purchaseId, rec);
                }
              }
            } catch { realStatus = 'erreur reseau'; }
          } else if (cached) {
            realStatus = cached.status;
          }
        }
        await kvPut(env, 'log:check', { at: new Date().toISOString(), purchaseId, status: rec.status, realSaleStatus: realStatus });
        if (rec.deviceId !== deviceId) return json({ ok: false, status: 'forbidden', message: 'Vente non liee a cette installation.' }, 403, cors);
        // Expire après 15 minutes (le client peut relancer un paiement)
        if (rec.status === 'pending' && Date.now() - rec.createdAt > 15 * 60 * 1000) {
          return json({ ok: true, status: 'expired', message: 'Paiement expiré, relancez.', realSaleStatus: realStatus }, 200, cors);
        }
        if (rec.status === 'paid' && !rec.delivered) {
          const code = await makeCode(rec.offer, 1, env);
          rec.delivered = true;
          rec.code = code;
          await kvPut(env, 'pay:' + purchaseId, rec);
        }
        return json({ ok: true, status: rec.status, code: rec.code || null, realSaleStatus: realStatus }, 200, cors);
      }

      return json({ ok: false, message: 'Route inconnue.' }, 404, cors);
    } catch (e) {
      return json({ ok: false, message: 'Erreur serveur : ' + (e && e.message ? e.message : String(e)).slice(0, 200) }, 500, cors);
    }
  },
};

/* ---------------- Utilitaires ---------------- */

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}

function envGet(env, name) {
  try {
    if (env && env[name] !== undefined) return env[name];
    if (globalThis[name] !== undefined) return globalThis[name];
  } catch { /* ignore */ }
  return undefined;
}

/* Lecture des variables depuis le binding `env` (CORRECT) —
   IMPORTANT : ne jamais lire les secrets au niveau module (envGet(null, ...))
   sinon les valeurs saisies dans le dashboard Cloudflare ne sont jamais vues. */
function getSecretKeys(env) {
  try { return JSON.parse(envGet(env, 'SECRET_KEYS') || '{}'); } catch { return {}; }
}
function getAdminPass(env) {
  return envGet(env, 'ADMIN_PASS') || 'change-me';
}

async function kvGet(env, key, fallback) {
  try {
    const v = await env.DD_KV.get(key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}

async function kvPut(env, key, value) {
  try { await env.DD_KV.put(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* ---------------- Base32 (identique à l'app) ---------------- */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(bytes) {
  let out = '', bits = 0, value = 0;
  for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function b32decode(s) {
  const bytes = []; let bits = 0, value = 0;
  for (const ch of s) { const v = B32.indexOf(ch); if (v < 0) continue; value = (value << 5) | v; bits += 5; if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(bytes);
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
async function hmacHex(message, secret) {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/* ---------------- Vérification d'un code ---------------- */

async function verifyCode(code, env) {
  if (!code.startsWith('DD')) return { ok: false, message: 'Code invalide.' };
  const raw = code.slice(2);
  const body = raw.slice(0, -10);
  const sig = raw.slice(-10);
  for (const [, secret] of Object.entries(getSecretKeys(env))) {
    const expected = b32encode(hexToBytes(await hmacHex(body, secret))).slice(0, 10);
    if (sig === expected) {
      try {
        const payload = JSON.parse(new TextDecoder().decode(b32decode(body)));
        const exp = 30 * 86400000;
        if (!payload.iat || Date.now() - payload.iat > exp) return { ok: false, message: 'Code expire. Contactez le designer.' };
        const kind = payload.kind;
        const now = Date.now();
        const MONTH = 30 * 86400000, YEAR = 365 * 86400000;
        let type, expiresAt = 0, customDesign = false;
        if (kind === 'MONTHLY') { type = 'monthly'; expiresAt = now + (payload.months || 1) * MONTH; }
        else if (kind === 'ANNUAL') { type = 'annual'; expiresAt = now + YEAR; }
        else if (kind === 'ALL') { type = 'all'; expiresAt = now + YEAR; customDesign = true; }
        else if (kind === 'DESIGN') { type = null; customDesign = true; }
        else return { ok: false, message: 'Type de code inconnu.' };
        return { ok: true, license: { type, expiresAt, customDesign } };
      } catch { return { ok: false, message: 'Code illisible.' }; }
    }
  }
  return { ok: false, message: 'Code invalide ou corrompu.' };
}

/* ---------------- Génération d'un code (vendeur / paiement) ---------------- */

async function makeCode(kind, months, env) {
  const payload = { kind, months: kind === 'MONTHLY' ? months : undefined, iat: Date.now() };
  const keys = getSecretKeys(env);
  const secret = Object.values(keys)[Object.keys(keys).length - 1] || 'default-secret';
  const body = b32encode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b32encode(hexToBytes(await hmacHex(body, secret))).slice(0, 10);
  const raw = 'DD' + body + sig;
  return 'DD-' + raw.slice(2).match(/.{1,4}/g).join('-');
}
