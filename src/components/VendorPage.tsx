import { useEffect, useMemo, useState, type FormEvent } from 'react';
import logoUrl from '../assets/logo.png';
import {
  CodeKind, VendorLogEntry,
  generateCode, getVendorLog, logVendorCode, deleteVendorEntry, clearVendorLog,
  codeKindLabel, codeIsFresh,
  PRICE_MONTHLY, PRICE_ANNUAL, PRICE_CUSTOM_DESIGN, PRICE_ALL,
} from '../lib/license';
import { VENDOR, VENDOR_PIN } from '../lib/config';

/* ============================================================
   ESPACE VENDEUR — page réservée au propriétaire de l'app
   ------------------------------------------------------------
   Accès : https://votre-app.com/#/vendeur
   (aucune liaison visible dans l'application)
   Protégé par le PIN VENDOR_PIN (src/lib/config.ts).
   ------------------------------------------------------------
   - Génération de codes d'activation (avec client + WhatsApp)
   - Historique des ventes, clients, revenus, statistiques
   - Export CSV
   ============================================================ */

const SESSION_KEY = 'dd_vendor_session';

interface Offer {
  kind: CodeKind;
  months?: number;
  label: string;
  price: number;
  color: string;
}

const OFFERS: Offer[] = [
  { kind: 'MONTHLY', months: 1, label: 'Abonnement 1 mois', price: PRICE_MONTHLY, color: '#0057FF' },
  { kind: 'MONTHLY', months: 12, label: 'Abonnement 12 mois', price: PRICE_MONTHLY * 12, color: '#0057FF' },
  { kind: 'ANNUAL', label: 'Abonnement 1 an', price: PRICE_ANNUAL, color: '#111' },
  { kind: 'DESIGN', label: 'Design personnalisé', price: PRICE_CUSTOM_DESIGN, color: '#10B981' },
  { kind: 'ALL', label: 'Tous les designs (1 an)', price: PRICE_ALL, color: '#8B5CF6' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' F';
const digits = (s: string) => s.replace(/\D/g, '');

export default function VendorPage() {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('devis_dark') === '1'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('devis_dark', dark ? '1' : '0'); } catch { /* ignore */ }
  }, [dark]);

  const login = () => { try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ } setAuthed(true); };
  const logout = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } setAuthed(false); };
  const backToApp = () => { window.location.hash = ''; };

  return authed
    ? <Dashboard dark={dark} setDark={setDark} onLogout={logout} onBack={backToApp} />
    : <Login dark={dark} setDark={setDark} onOk={login} onBack={backToApp} />;
}

/* ---------------- Écran PIN ---------------- */

function Login({ dark, setDark, onOk, onBack }: {
  dark: boolean; setDark: (f: boolean) => void; onOk: () => void; onBack: () => void;
}) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pin === VENDOR_PIN) onOk();
    else setErr('PIN incorrect.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-[#ECECEC] dark:border-zinc-800 p-6 text-center">
          <img src={logoUrl} width={52} height={52} alt="" className="mx-auto rounded-xl" style={{ objectFit: 'cover' }} />
          <h1 className="mt-3 text-base font-black tracking-widest text-[#111] dark:text-white">ESPACE VENDEUR</h1>
          <p className="text-[11px] text-[#888] mt-1">
            {VENDOR.APP_NAME} — accès réservé au propriétaire.
            <br />Cette page n'est pas visible des utilisateurs.
          </p>

          <form onSubmit={submit} className="mt-4 space-y-2">
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setErr(null); }}
              placeholder="PIN"
              autoFocus
              inputMode="numeric"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-sm text-center font-mono tracking-[0.4em] focus:outline-none focus:border-[#0057FF]"
            />
            <button type="submit" className="w-full h-10 rounded-lg bg-[#0057FF] text-white text-xs font-bold hover:opacity-90 active:scale-[0.99]">
              Ouvrir l'espace vendeur
            </button>
          </form>
          {err && <div className="mt-2 text-[11px] font-bold text-red-500">{err}</div>}

          <div className="mt-4 flex items-center justify-between text-[10px] text-[#999]">
            <button onClick={onBack} className="hover:text-[#0057FF] font-bold">Retour à l'application</button>
            <button onClick={() => setDark(!dark)} className="hover:opacity-70 font-bold">{dark ? 'Mode clair' : 'Mode sombre'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tableau de bord ---------------- */

function Dashboard({ dark, setDark, onLogout, onBack }: {
  dark: boolean; setDark: (f: boolean) => void; onLogout: () => void; onBack: () => void;
}) {
  const [log, setLog] = useState<VendorLogEntry[]>(() => getVendorLog());
  const [sel, setSel] = useState(0);
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [genCode, setGenCode] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const now = Date.now();
    const total = log.reduce((s, e) => s + e.price, 0);
    const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0);
    const monthTotal = log.filter(e => e.at >= ms.getTime()).reduce((s, e) => s + e.price, 0);
    const active = log.filter(e => codeIsFresh(e, now)).length;
    const clients = new Set(log.map(e => e.client?.trim()).filter(Boolean));
    const byKind = OFFERS.map(o => {
      const items = log.filter(e => e.kind === o.kind && (e.months || 1) === (o.months || 1));
      return { label: o.label, count: items.length, amount: items.reduce((s, e) => s + e.price, 0) };
    });
    return { total, monthTotal, active, expired: log.length - active, clients: clients.size, byKind };
  }, [log]);

  const offer = OFFERS[sel];

  const handleGenerate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const c = await generateCode(offer.kind, offer.months ?? 1);
      logVendorCode(offer.kind, offer.kind === 'MONTHLY' ? offer.months : undefined, c, client, digits(phone) || undefined);
      setLog(getVendorLog());
      setGenCode(c);
      navigator.clipboard?.writeText(c).catch(() => { /* ignore */ });
    } finally {
      setBusy(false);
    }
  };

  const copy = (code: string, idx: number) => {
    navigator.clipboard?.writeText(code).catch(() => { /* ignore */ });
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(i => (i === idx ? null : i)), 1500);
  };

  const waLink = (e: VendorLogEntry): string | null => {
    const p = digits(e.phone || '');
    if (!p) return null;
    const msg = `Bonjour ${e.client ? e.client : ''}! Voici votre code d'activation ${VENDOR.APP_NAME} (${codeKindLabel(e.kind, e.months)}) : ${e.code}. Entrez-le dans l'application (bouton « Activer »). Merci pour votre confiance !`.trim();
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
  };

  const removeEntry = (idx: number) => {
    const e = log[idx];
    if (!e) return;
    if (!window.confirm(`Supprimer cette vente (${codeKindLabel(e.kind, e.months)} du ${new Date(e.at).toLocaleDateString('fr-FR')}) ?`)) return;
    setLog(deleteVendorEntry(idx));
  };

  const clearAll = () => {
    if (!window.confirm('Effacer tout l\'historique des ventes ? Cette action est irréversible.')) return;
    clearVendorLog();
    setLog([]);
  };

  const exportCsv = () => {
    const rows: string[][] = [['date', 'client', 'offre', 'prix', 'code', 'statut']];
    for (const e of log) {
      rows.push([
        new Date(e.at).toLocaleString('fr-FR'),
        e.client || '',
        codeKindLabel(e.kind, e.months),
        String(e.price),
        e.code,
        codeIsFresh(e) ? 'actif' : 'expire',
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ventes-${VENDOR.APP_NAME.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen">
      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-[#ECECEC] dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logoUrl} width={34} height={34} alt="" className="rounded-lg" style={{ objectFit: 'cover' }} />
          <div>
            <div className="text-xs font-black tracking-widest text-[#111] dark:text-white leading-none">ESPACE VENDEUR</div>
            <div className="text-[10px] text-[#999] mt-0.5">{VENDOR.APP_NAME} — panneau propriétaire</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setDark(!dark)} title="Thème" className="px-3 h-8 rounded-lg text-[11px] font-bold text-[#666] dark:text-zinc-300 hover:bg-[#F0F0F0] dark:hover:bg-zinc-800">{dark ? 'Clair' : 'Sombre'}</button>
            <button onClick={onBack} className="px-3 h-8 rounded-lg text-[11px] font-bold text-[#666] dark:text-zinc-300 hover:bg-[#F0F0F0] dark:hover:bg-zinc-800">Retour à l'app</button>
            <button onClick={onLogout} className="px-3 h-8 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">Déconnexion</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Statistiques */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total encaissé" value={fmt(stats.total)} accent />
          <StatCard title="Ce mois-ci" value={fmt(stats.monthTotal)} />
          <StatCard title="Codes actifs" value={String(stats.active)} sub={`${stats.expired} expiré(s) sur ${log.length} généré(s)`} />
          <StatCard title="Clients uniques" value={String(stats.clients)} sub={`${log.length} code(s) au total`} />
        </section>

        {/* Ventilation par offre */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {stats.byKind.map(k => (
            <div key={k.label} className="rounded-xl bg-white dark:bg-zinc-900 border border-[#ECECEC] dark:border-zinc-800 px-3 py-2.5">
              <div className="text-[9px] font-black tracking-widest uppercase text-[#999] truncate">{k.label}</div>
              <div className="text-sm font-black text-[#111] dark:text-white mt-0.5">{k.count} <span className="text-[10px] font-bold text-[#AAA]">vente(s)</span></div>
              <div className="text-[11px] font-bold" style={{ color: OFFERS.find(o => o.label === k.label)?.color === '#111' ? '#0057FF' : OFFERS.find(o => o.label === k.label)?.color }}>{fmt(k.amount)}</div>
            </div>
          ))}
        </section>

        {/* Génération de code */}
        <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-[#ECECEC] dark:border-zinc-800 p-4 sm:p-5">
          <div className="text-xs font-black tracking-widest text-[#111] dark:text-white mb-3">GÉNÉRER UN CODE D'ACTIVATION</div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {OFFERS.map((o, i) => (
              <button
                key={o.label}
                onClick={() => { setSel(i); setGenCode(null); }}
                className={`rounded-xl border-2 p-2.5 text-left transition ${sel === i ? 'border-[#0057FF] bg-blue-50/60 dark:bg-blue-950/30' : 'border-[#ECECEC] dark:border-zinc-700 hover:border-[#CCC] dark:hover:border-zinc-600'}`}
              >
                <div className="text-[10px] font-black leading-tight text-[#111] dark:text-white">{o.label}</div>
                <div className="text-[11px] font-black mt-1" style={{ color: o.color === '#111' ? '#0057FF' : o.color }}>{fmt(o.price)}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Nom du client (optionnel)"
              className="px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:outline-none focus:border-[#0057FF]"
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="WhatsApp du client, ex : 229 01 97 00 00 00 (optionnel)"
              className="px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:outline-none focus:border-[#0057FF]"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={busy}
            className="w-full h-11 rounded-xl bg-[#0057FF] text-white text-sm font-black hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? 'Génération…' : `Générer le code — ${offer.label} (${fmt(offer.price)})`}
          </button>

          {genCode && (
            <div className="mt-3 rounded-xl bg-[#F8F8FF] dark:bg-zinc-800/60 border border-[#E8E8FF] dark:border-zinc-700 p-4 text-center">
              <div className="text-[10px] font-bold text-[#888] mb-1">Code généré — copié dans le presse-papiers. À envoyer au client :</div>
              <div className="font-mono font-black text-base sm:text-lg tracking-widest text-[#111] dark:text-white break-all">{genCode}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => copy(genCode, -1)} className="flex-1 py-2 rounded-lg border border-[#E0E0E0] dark:border-zinc-700 text-[11px] font-bold text-[#666] hover:bg-[#F5F5F5] dark:hover:bg-zinc-800">
                  {copiedIdx === -1 ? 'Copié' : 'Copier à nouveau'}
                </button>
                {digits(phone) && (
                  <a
                    href={waLink({ at: 0, kind: offer.kind, months: offer.months, code: genCode, client: client.trim(), phone: digits(phone), price: offer.price })!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-lg bg-[#25D366] text-white text-[11px] font-bold hover:opacity-90"
                  >
                    Envoyer sur WhatsApp
                  </a>
                )}
              </div>
              <div className="text-[9px] text-[#AAA] mt-2">Le code reste activable 30 jours après sa génération.</div>
            </div>
          )}
        </section>

        {/* Historique / ventes */}
        <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-[#ECECEC] dark:border-zinc-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="text-xs font-black tracking-widest text-[#111] dark:text-white">HISTORIQUE DES VENTES ({log.length})</div>
            <div className="flex gap-2">
              {log.length > 0 && (
                <>
                  <button onClick={exportCsv} className="px-3 py-1.5 rounded-lg border border-[#E0E0E0] dark:border-zinc-700 text-[10px] font-bold text-[#666] hover:bg-[#F5F5F5] dark:hover:bg-zinc-800">
                    Exporter CSV
                  </button>
                  <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                    Tout effacer
                  </button>
                </>
              )}
            </div>
          </div>

          {log.length === 0 ? (
            <div className="text-center py-10 text-[11px] text-[#BBB]">
              Aucune vente enregistrée pour l'instant.<br />Générez votre premier code ci-dessus.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#F0F0F0] dark:border-zinc-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FAFAFA] dark:bg-zinc-800/60 text-[9px] font-black tracking-widest text-[#999] uppercase">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Client</th>
                    <th className="px-3 py-2.5">Offre</th>
                    <th className="px-3 py-2.5 text-right">Prix</th>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5] dark:divide-zinc-800">
                  {log.map((e, i) => {
                    const fresh = codeIsFresh(e);
                    const wa = waLink(e);
                    return (
                      <tr key={i} className="hover:bg-[#FAFAFA] dark:hover:bg-zinc-800/40">
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap text-[#666] dark:text-zinc-400">
                          {new Date(e.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 text-[11px] font-bold text-[#111] dark:text-white min-w-[90px]">
                          {e.client || <span className="text-[#CCC] dark:text-zinc-600 font-normal">—</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] whitespace-nowrap text-[#666] dark:text-zinc-400">{codeKindLabel(e.kind, e.months)}</td>
                        <td className="px-3 py-2 text-[11px] font-black text-right whitespace-nowrap" style={{ color: '#0057FF' }}>{fmt(e.price)}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-[#999] max-w-[180px] truncate">{e.code}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black ${fresh ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-[#F0F0F0] text-[#AAA] dark:bg-zinc-800 dark:text-zinc-500'}`}>
                            {fresh ? 'ACTIF' : 'EXPIRÉ'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => copy(e.code, i)} title="Copier le code" className="px-2 py-1 rounded-md text-[10px] font-bold text-[#666] hover:bg-[#F0F0F0] dark:hover:bg-zinc-800">
                            {copiedIdx === i ? 'Copié' : 'Copier'}
                          </button>
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer" title="Envoyer sur WhatsApp" className="px-2 py-1 rounded-md text-[10px] font-bold text-[#25D366] hover:bg-green-50 dark:hover:bg-green-950/30">
                              WhatsApp
                            </a>
                          )}
                          <button onClick={() => removeEntry(i)} title="Supprimer" className="px-2 py-1 rounded-md text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                            Suppr.
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="text-[10px] text-[#AAA] leading-relaxed px-1">
          <p>· Les codes sont validés par signature HMAC dans l'application : un code généré ici fonctionne sur toutes les installations de {VENDOR.APP_NAME}.</p>
          <p>· Un code reste activable <b>30 jours</b> après sa génération. Le statut « ACTIF » = le code peut encore être activé par le client.</p>
          <p>· L'historique est stocké sur cet appareil (navigateur). Utilisez « Exporter CSV » pour conserver une archive de vos ventes.</p>
          <p>· Pour un suivi centralisé des activations (côté serveur), déployez le worker <code className="font-mono">backend/worker.js</code> sur Cloudflare (voir README).</p>
        </section>
      </main>
    </div>
  );
}

/* ---------------- Carte statistique ---------------- */

function StatCard({ title, value, sub, accent }: { title: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-[#0057FF] border-[#0057FF] text-white' : 'bg-white dark:bg-zinc-900 border-[#ECECEC] dark:border-zinc-800'}`}>
      <div className={`text-[9px] font-black tracking-widest uppercase ${accent ? 'text-blue-100' : 'text-[#999]'}`}>{title}</div>
      <div className={`text-xl font-black mt-1 truncate ${accent ? 'text-white' : 'text-[#111] dark:text-white'}`}>{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${accent ? 'text-blue-100/90' : 'text-[#AAA]'}`}>{sub}</div>}
    </div>
  );
}
