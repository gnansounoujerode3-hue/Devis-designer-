import { useEffect, useRef, useState } from 'react';
import {
  FREE_EXPORT_LIMIT, PRICE_MONTHLY, PRICE_ANNUAL, PRICE_CUSTOM_DESIGN, PRICE_ALL,
  LicenseState, loadLicense, getExportCount, applyCode,
  isLicensed, daysLeft,
} from '../lib/license';
import { VENDOR, CHARIOW_LINKS, createChariowPayment, AUTO_PAY_WORKER_URL } from '../lib/config';
import { getMyRefCode, whatsappShareUrl } from '../lib/referral';

interface Props {
  open: boolean;
  onClose: () => void;
  /** true si le blocage vient d'une tentative de création */
  blocked?: boolean;
  onActivated?: () => void;
}

type OfferId = 'monthly' | 'annual' | 'design' | 'all';

const OFFERS: { id: OfferId; title: string; price: number; desc: string; badge?: string; link: string }[] = [
  { id: 'monthly', title: 'Abonnement Mensuel', price: PRICE_MONTHLY, desc: 'Exports PDF et envois signature illimités pendant 1 mois.', badge: 'Populaire', link: CHARIOW_LINKS.MONTHLY },
  { id: 'annual', title: 'Abonnement 1 An', price: PRICE_ANNUAL, desc: 'Exports illimités pendant 1 an. Économisez 2 mois par rapport au mensuel.', link: CHARIOW_LINKS.ANNUAL },
  { id: 'design', title: 'Design Personnalisé', price: PRICE_CUSTOM_DESIGN, desc: 'Un design sur mesure pour VOTRE template, créé pour vous.', link: CHARIOW_LINKS.CUSTOM_DESIGN },
  { id: 'all', title: 'TOUS les Designs (1 an)', price: PRICE_ALL, desc: 'N\'importe quel design de template gratuit pendant 1 an + exports illimités.', badge: 'Best value', link: CHARIOW_LINKS.ALL },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' F';

export default function PaywallModal({ open, onClose, blocked, onActivated }: Props) {
  const [license, setLicense] = useState<LicenseState>(() => loadLicense());
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paying, setPaying] = useState<OfferId | null>(null);
  const [contactDesign, setContactDesign] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  /* ---------------- Paiement automatique (Worker + Chariow) ----------------
     Si AUTO_PAY_WORKER_URL est configuré : le client paie, le Worker
     reçoit la confirmation Chariow (Pulse signé) et génère le code,
     l'application l'applique automatiquement. Sinon : flux manuel. */
  const autoPay = !!AUTO_PAY_WORKER_URL;
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [autoState, setAutoState] = useState<'idle' | 'starting' | 'openCheckout' | 'waiting' | 'activating' | 'done' | 'error'>('idle');
  const [autoMsg, setAutoMsg] = useState<string | null>(null);
  const [realStatus, setRealStatus] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerUrl = AUTO_PAY_WORKER_URL.replace(/\/+$/, '');

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => { if (!open) { stopPolling(); setAutoState('idle'); setAutoMsg(null); setRealStatus(null); setCheckoutUrl(null); } }, [open]);
  useEffect(() => () => stopPolling(), []);

  /* À la réouverture : si un paiement récent est resté en cours (l'utilisateur
     a pu payer sur Orqex après avoir fermé la fenêtre), reprendre la
     vérification et activer automatiquement si c'est confirmé. */
  useEffect(() => {
    if (!open || !autoPay) return;
    let last: { purchaseId: string; at: number } | null = null;
    try { const r = localStorage.getItem('dd_last_purchase'); if (r) last = JSON.parse(r); } catch { last = null; }
    if (last && last.purchaseId && Date.now() - last.at < 20 * 60000) {
      const pid = last.purchaseId;
      fetch(workerUrl + '/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: pid, deviceId: getMyRefCode() }),
      }).then(r => r.json()).then(data => {
        if (data.ok && data.status === 'paid' && data.code) activateCode(data.code);
        else if (data.ok && data.status === 'pending') { setAutoState('waiting'); startPolling(pid); }
      }).catch(() => { /* réseau : on ignore, l'utilisateur peut relancer */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const activateCode = async (code: string) => {
    setAutoState('activating');
    const r = await applyCode(code);
    if (r.ok) { try { localStorage.removeItem('dd_last_purchase'); } catch { /* ignore */ } setAutoState('done'); setAutoMsg(r.message); refresh(); }
    else { setAutoState('error'); setAutoMsg(r.message); }
  };

  const startPolling = (purchaseId: string) => {
    stopPolling();
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      if (tries > 192) {
        stopPolling();
        setAutoState('error');
        setAutoMsg('Le paiement n\'a pas été confirmé après 16 minutes. Relancez le paiement ou contactez ' + VENDOR.PHONE + '.');
        return;
      }
      try {
        const res = await fetch(workerUrl + '/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchaseId, deviceId: getMyRefCode() }),
        });
        const data = await res.json();
        setRealStatus(data.realSaleStatus || null);
        if (data.ok && data.status === 'paid' && data.code) {
          stopPolling();
          await activateCode(data.code);
        } else if (!data.ok || data.status === 'expired' || data.status === 'failed') {
          stopPolling();
          setAutoState('error');
          if (data.status === 'failed') {
            setAutoMsg('Selon Chariow, ce paiement n\'a pas abouti (échec ou abandon du Mobile Money). Vérifiez votre solde Mobile Money : si les fonds ont été débités, contactez votre opérateur avec la référence du paiement. Sinon, relancez un nouveau paiement.');
          } else {
            setAutoMsg((data.message || 'Le paiement n\'a pas abouti.') + ' Relancez le paiement.');
          }
        }
      } catch { /* réseau indisponible : nouvelle tentative au prochain tick */ }
    }, 5000);
  };

  const startAutoPay = async (off: (typeof OFFERS)[number]) => {
    const phoneDigits = customer.phone.replace(/\D/g, '');
    if (!customer.name.trim() || !customer.email.trim() || phoneDigits.length < 8) {
      setAutoMsg('Renseignez votre nom, votre numéro Mobile Money et votre email, puis relancez le paiement.');
      return;
    }
    setAutoState('starting');
    setAutoMsg(null);
    const offerMap: Record<OfferId, string> = { monthly: 'MONTHLY', annual: 'ANNUAL', design: 'DESIGN', all: 'ALL' };
    try {
      const res = await fetch(workerUrl + '/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer: offerMap[off.id],
          deviceId: getMyRefCode(),
          customer: { name: customer.name.trim(), email: customer.email.trim(), phone: phoneDigits },
        }),
      });
      const data = await res.json();
      if (!data.ok || (!data.checkout_url && !data.code)) throw new Error(data.message || 'Erreur de lancement du paiement.');
      if (data.status === 'paid' && data.code) { await activateCode(data.code); return; }
      try { localStorage.setItem('dd_last_purchase', JSON.stringify({ purchaseId: data.purchaseId, at: Date.now() })); } catch { /* ignore */ }
      // La page Orqex refuse de s'afficher dans un cadre (iframe de prévisualisation) :
      // on donne l'URL au bouton « PAYER MAINTENANT » qui l'ouvre dans la fenêtre
      // du navigateur (target="_top"). Au retour, l'app reprend la vérification.
      setCheckoutUrl(data.checkout_url);
      setAutoState('openCheckout');
      startPolling(data.purchaseId);
    } catch (e) {
      setAutoState('error');
      setAutoMsg((e instanceof Error ? e.message : String(e)) + ' — Paiement manuel : ' + fmt(off.price) + ' via Mobile Money au ' + VENDOR.PHONE + '.');
    }
  };

  if (!open) return null;

  const refresh = () => { setLicense(loadLicense()); onActivated?.(); };
  const used = getExportCount();

  const handlePay = async (off: (typeof OFFERS)[number]) => {
    if (autoPay) { await startAutoPay(off); return; }
    setPaying(off.id);
    try {
      const url = off.link || (await createChariowPayment(off.price, off.title));
      if (url) {
        window.open(url, '_blank');
        setCodeMsg({ ok: true, text: 'Paiement lancé sur Chariow. Après confirmation, entrez le code d\'activation reçu ci-dessous.' });
      } else {
        setCodeMsg({ ok: true, text: `Payez ${fmt(off.price)} via Mobile Money (MTN MoMo / Orange Money / Wave / Moov) au ${VENDOR.PHONE}. Envoyez la référence du paiement par WhatsApp, vous recevrez votre code d'activation.` });
      }
    } finally {
      setPaying(null);
    }
  };

  const handleApplyCode = async () => {
    const r = await applyCode(code);
    setCodeMsg({ ok: r.ok, text: r.message });
    if (r.ok) { refresh(); setCode(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className="p-6 pb-4 border-b border-[#F0F0F0] dark:border-zinc-800 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-[#111] dark:text-white">
              {blocked ? 'Limite d\'exports gratuits atteinte ' : 'Devis Designer Pro'}
            </h2>
            <p className="text-sm text-[#888] mt-1">
              {isLicensed(license)
                ? ` Abonnement actif — reste ${daysLeft(license)} jour(s)`
                : `${Math.min(used, FREE_EXPORT_LIMIT)} / ${FREE_EXPORT_LIMIT} exports gratuits utilisés${blocked ? ' — passez à Pro pour continuer' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F0F0F0] dark:hover:bg-zinc-800 flex items-center justify-center text-[#999]"></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Paiement automatique : coordonnées du client (requis par Chariow) */}
          {autoPay && autoState !== 'done' && (
            <div className="rounded-xl border border-dashed p-4" style={{ borderColor: '#0057FF66' }}>
              <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-1">PAIEMENT AUTOMATIQUE</div>
              <p className="text-[11px] text-[#888] mb-3">
                Payez par Mobile Money : votre offre sera activée <b>automatiquement</b>, sans code à saisir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Votre nom complet"
                  className="px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:outline-none focus:border-[#0057FF]" />
                <input value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="N° Mobile Money (01...)" inputMode="tel"
                  className="px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:outline-none focus:border-[#0057FF]" />
                <input value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} placeholder="Votre email" inputMode="email"
                  className="px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:outline-none focus:border-[#0057FF]" />
              </div>
            </div>
          )}

          {/* Offres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OFFERS.map(o => (
              <div key={o.id} className={`relative rounded-xl border-2 p-4 flex flex-col ${o.badge ? 'border-[#0057FF] dark:border-blue-500' : 'border-[#ECECEC] dark:border-zinc-700'}`}>
                {o.badge && <span className="absolute -top-2.5 left-3 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#0057FF] text-white tracking-wider uppercase">{o.badge}</span>}
                <div className="text-[11px] font-bold tracking-widest text-[#999] uppercase">{o.title}</div>
                <div className="text-2xl font-black mt-1" style={{ color: '#0057FF' }}>{fmt(o.price)}</div>
                <div className="text-[11px] text-[#777] dark:text-zinc-400 mt-1 flex-1">{o.desc}</div>
                <button
                  onClick={() => handlePay(o)}
                  disabled={paying === o.id || autoState === 'starting' || autoState === 'openCheckout' || autoState === 'waiting' || autoState === 'activating'}
                  className="mt-3 w-full h-9 rounded-lg bg-[#0057FF] text-white text-xs font-bold hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {paying === o.id || autoState === 'starting' || autoState === 'openCheckout' || autoState === 'waiting' || autoState === 'activating'
                    ? '...'
                    : autoPay ? `Payer ${fmt(o.price)} — activation auto` : 'Payer via Chariow (Mobile Money)'}
                </button>
              </div>
            ))}
          </div>

          {/* Statuts du paiement automatique */}
          {autoPay && autoState === 'openCheckout' && checkoutUrl && (
            <div className="rounded-xl border-2 p-4 text-center" style={{ borderColor: 'rgba(0,87,255,0.4)' }}>
              <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-2">ÉTAPE SUIVANTE — PAIEMENT</div>
              <p className="text-[11px] text-[#888] mb-3">
                Cliquez sur le bouton ci-dessous : la page de paiement Orqex s'ouvre dans votre navigateur.
                Terminez le paiement Mobile Money (code PIN sur le téléphone), puis revenez ici avec le
                bouton retour du navigateur — l'offre sera activée automatiquement.
              </p>
              <a href={checkoutUrl} target="_top" rel="noreferrer"
                className="block w-full py-3.5 rounded-xl bg-[#0057FF] text-white text-sm font-black hover:opacity-90">
                PAYER MAINTENANT
              </a>
              <div className="mt-2 text-[9px] text-[#AAA] break-all select-all">{checkoutUrl}</div>
            </div>
          )}
          {autoPay && (autoState === 'starting' || autoState === 'waiting') && (
            <div className="rounded-xl bg-[#F8F8FF] dark:bg-zinc-800/50 border border-[#E8E8FF] dark:border-zinc-700 p-4 text-center">
              <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-1">
                {autoState === 'starting' ? 'LANCEMENT DU PAIEMENT…' : 'EN ATTENTE DE CONFIRMATION DU PAIEMENT'}
              </div>
              <p className="text-[11px] text-[#888]">
                {autoState === 'starting'
                  ? 'Ouverture de la page de paiement Chariow…'
                  : 'Terminez le paiement Mobile Money. La confirmation Chariow arrive 1 à 5 minutes après le code sur le téléphone. Vous pouvez fermer cette fenêtre : en rouvrant PRO, la confirmation sera reprise et l\'offre activée automatiquement.'}
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-[#E8E8FF] dark:bg-zinc-700 overflow-hidden"><div className="h-full w-1/3 rounded-full bg-[#0057FF] animate-pulse" /></div>
              {realStatus && (
                <div className="text-[10px] text-[#999] mt-2">
                  Statut Chariow : <b className={realStatus === 'completed' || realStatus === 'settled' ? 'text-green-600 dark:text-green-400' : 'text-[#111] dark:text-white'}>{realStatus === 'awaiting_payment' ? 'en attente de paiement (normal, patientez)' : realStatus === 'completed' || realStatus === 'settled' ? 'PAIEMENT REÇU — activation…' : realStatus}</b>
                </div>
              )}
            </div>
          )}
          {autoPay && autoState === 'activating' && (
            <div className="rounded-xl bg-[#F8F8FF] dark:bg-zinc-800/50 border border-[#E8E8FF] dark:border-zinc-700 p-4 text-center">
              <div className="text-xs font-black tracking-widest text-[#111] dark:text-white">ACTIVATION DE VOTRE OFFRE…</div>
              <p className="text-[11px] text-[#888] mt-1">Paiement confirmé — une seconde.</p>
            </div>
          )}
          {autoPay && autoState === 'done' && (
            <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <div className="text-xs font-black tracking-widest text-green-700 dark:text-green-400 mb-1">PAIEMENT CONFIRMÉ — OFFRE ACTIVÉE</div>
              <p className="text-[11px] text-[#666] dark:text-zinc-300">{autoMsg}</p>
            </div>
          )}
          {autoPay && autoState === 'error' && autoMsg && (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-[11px] text-red-600 dark:text-red-400">{autoMsg}</div>
          )}

          {/* Saisie de code d'activation */}
          <div className="rounded-xl bg-[#F8F8FF] dark:bg-zinc-800/50 border border-[#E8E8FF] dark:border-zinc-700 p-4">
            <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-1">Déjà abonné ?</div>
            <div className="text-[11px] text-[#888] mb-3">Entrez le code d'activation reçu par WhatsApp / SMS après votre paiement.</div>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="DD-XXXX-XXXX-XXXX"
                className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-mono tracking-wider focus:outline-none focus:border-[#0057FF]"
              />
              <button onClick={handleApplyCode} className="px-5 rounded-lg bg-[#111] dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90">Activer</button>
            </div>
            {codeMsg && (
              <div className={`mt-2 text-[11px] font-medium ${codeMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{codeMsg.text}</div>
            )}

          </div>

          {/* Design personnalisé acheté : contact */}
          {license.customDesign && !contactDesign && (
            <button onClick={() => setContactDesign(true)} className="w-full rounded-xl border-2 border-dashed border-[#0057FF]/40 p-3 text-xs font-bold text-[#0057FF] hover:bg-blue-50 dark:hover:bg-blue-950/30">
              Design personnalisé débloqué — contacter le designer
            </button>
          )}
          {contactDesign && (
            <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="text-xs font-black text-green-700 dark:text-green-400 mb-2">Votre design personnalisé</div>
              <p className="text-[11px] text-[#666] dark:text-zinc-300 mb-3">Décrivez votre design (couleurs, logo, mise en page…) et envoyez-le au designer :</p>
              <a href={VENDOR.WHATSAPP} target="_blank" rel="noreferrer" className="block w-full text-center py-2.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90 mb-2">WhatsApp — décrire mon design</a>
              <div className="text-center text-[11px] text-[#888]">ou appelez : <b>{VENDOR.PHONE}</b></div>
            </div>
          )}

          {/* Recommandation — partage de l'app */}
          <div className="rounded-xl border-2 border-dashed border-[#0057FF]/30 p-4">
            <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-1">RECOMMANDER L'APPLICATION</div>
            <p className="text-[11px] text-[#888] mb-3">
              Partagez Devis Designer avec vos collègues et clients. Votre code parrain les fait bénéficier de l'app.
            </p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 font-mono font-black tracking-widest text-[#0057FF] bg-blue-50 dark:bg-blue-950/40 rounded-lg py-2 text-center">{getMyRefCode()}</div>
              <button
                onClick={() => { navigator.clipboard?.writeText(getMyRefCode()).catch(() => {}); setRefCopied(true); setTimeout(() => setRefCopied(false), 1500); }}
                className="px-3 py-2 rounded-lg border border-[#BFDBFE] text-[11px] font-bold text-[#0057FF] hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                {refCopied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <a href={whatsappShareUrl()} target="_blank" rel="noreferrer" className="block w-full text-center py-2.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90">
              Recommander sur WhatsApp
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
