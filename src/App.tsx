import { useState, useRef, useCallback, useEffect } from 'react';
import logoUrl from './assets/logo.png';
import { jsPDF } from 'jspdf';
import QuoteSVG from './components/QuoteSVG';
import FontPicker from './components/FontPicker';
import SignatureModal from './components/SignatureModal';
import { QuoteData, QuoteItem, CurrencyCode, CURRENCIES, formatMoney, DocStatus, STATUS_META, SavedClient, WATERMARK_LABEL } from './types';
import { TEMPLATES } from './templates';
import { createDefaultDoc, newItemRow, loadAllDocs, saveDoc, deleteDoc, duplicateDoc, convertToInvoice, loadClients, saveClient, deleteClient, getNextNumber } from './store';
import { buildSignatureHtml } from './lib/generateSignHtml';
import PaywallModal from './components/PaywallModal';
import SharePrompt from './components/SharePrompt';
import Onboarding from './components/Onboarding';
import LegalModal from './components/LegalModal';
import FAQModal from './components/FAQModal';
import { loadLicense, isLicensed, canExport, incrementExportCount, remainingFree, restoreExportCountFromBackup, daysLeft } from './lib/license';
import { saveParrainCode, getMyRefCode, whatsappShareUrl } from './lib/referral';
import { downloadBlob, downloadBackup, importAllData } from './store';

const COLORS = [
  { label: 'Bleu', value: '#0057FF' }, { label: 'Noir', value: '#111111' },
  { label: 'Rouge', value: '#E63946' }, { label: 'Vert', value: '#0B8457' },
  { label: 'Violet', value: '#7C3AED' }, { label: 'Orange', value: '#EA580C' },
  { label: 'Rose', value: '#DB2777' }, { label: 'Teal', value: '#0D9488' },
  { label: 'Indigo', value: '#4338CA' },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const CURRENCY_SHORT: Record<CurrencyCode, string> = { EUR: '€', XOF: 'F', USD: '$' };
const CURRENCY_LABELS: Record<CurrencyCode, string> = { EUR: 'EUR', XOF: 'XOF', USD: 'USD' };
const ALL_STATUSES: DocStatus[] = ['brouillon', 'envoye', 'accepte', 'refuse', 'paye'];


/* Logo de l'application — document + coche de validation (mini, net à toute taille) */
function LogoMark({ size = 36 }: { size?: number }) {  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="Devis Designer"
      style={{ borderRadius: size * 0.22, flexShrink: 0, objectFit: 'cover' }}
    />
  );
}

/* Date sécurisée : ne plante jamais (retourne '' si invalide) */
function safeDate(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR');
  } catch { return ''; }
}

/* ------------------------------------------------------------
   Limites de longueur des champs de saisie.
   Si la limite est dépassée, le reste du texte est remplacé
   par trois points de suspension « … ».
   ------------------------------------------------------------ */
const MAX_LEN: Record<string, number> = {
  designerName: 40,
  designerTitle: 40,
  designerEmail: 45,
  designerPhone: 20,
  designerAddress: 80,
  designerSiret: 20,
  clientName: 40,
  clientCompany: 60,
  clientEmail: 45,
  clientAddress: 80,
  quoteNumber: 20,
  notes: 200,
};
const ITEM_DESC_MAX = 100;   // description d'une ligne de prestation
const INLINE_MAX = 60;       // édition directe d'un texte sur l'aperçu

/** Tronque `v` à `max` caractères : le dépassement devient « … ». */
function clampText(v: string, max: number): string {
  const clean = v.replace(/…/g, ''); // retire les « … » précédents (évite l'accumulation)
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+$/, '') + '…';
}

/** Couleur de texte toujours lisible sur fond blanc (éditeur sur place).
    Si la couleur du texte SVG est trop claire (texte blanc sur bandeau
    coloré, gris clair…), on bascule sur un gris foncé. */
function readableOnWhite(fill: string): string {
  let r: number, g: number, b: number;
  const mHex = fill.match(/^#([0-9a-f]{6})$/i);
  const mRgba = fill.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (mHex) { r = parseInt(mHex[1].slice(0, 2), 16); g = parseInt(mHex[1].slice(2, 4), 16); b = parseInt(mHex[1].slice(4, 6), 16); }
  else if (mRgba) { r = +mRgba[1]; g = +mRgba[2]; b = +mRgba[3]; }
  else return '#333';
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 140 ? fill : '#333';
}

export default function App() {
  const [page, setPage] = useState<'list' | 'editor'>('list');
  const [data, setData] = useState<QuoteData>(createDefaultDoc());
  const [docs, setDocs] = useState<QuoteData[]>([]);
  const [tab, setTab] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [clientBook, setClientBook] = useState(false);
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [sigModal, setSigModal] = useState<'designer' | 'client' | null>(null);
  const [presentMode, setPresentMode] = useState(false);
  const [quickEdit, setQuickEdit] = useState(false);
  const [quickSection, setQuickSection] = useState<QuickSection>('emetteur');
  const [quickFocusField, setQuickFocusField] = useState<string | null>(null);
  const [quickFocusTick, setQuickFocusTick] = useState(0);
  const [inlineEdit, setInlineEdit] = useState<{ key: string; orig: string; value: string; x: number; y: number; w: number; h: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' } | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('devis_dark') === '1');
  const [paywall, setPaywall] = useState(false);
  const [paywallBlocked, setPaywallBlocked] = useState(false);
  const [licenseTick, setLicenseTick] = useState(0);
  const [sharePrompt, setSharePrompt] = useState(false);
  const [sharePromptTitle, setSharePromptTitle] = useState('Devis exporté avec succès !');
  const [onboarding, setOnboarding] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'cgu' | 'privacy'>('cgu');
  const [faqOpen, setFaqOpen] = useState(false);
  const [expiryNotice, setExpiryNotice] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('devis_dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => { setDocs(loadAllDocs()); setClients(loadClients()); }, []);
  // Restaure le compteur d'exports depuis la sauvegarde IndexedDB (anti-reset)
  useEffect(() => { restoreExportCountFromBackup().then(() => setLicenseTick(t => t + 1)); }, []);
  // Onboarding au premier lancement
  useEffect(() => {
    try {
      if (!localStorage.getItem('dd_onboarded')) {
        setOnboarding(true);
        localStorage.setItem('dd_onboarded', '1');
      }
    } catch { /* ignore */ }
  }, []);
  // Rappel d'expiration : une fois par jour, quand il reste <= 3 jours
  useEffect(() => {
    try {
      const lic = loadLicense();
      const dl = daysLeft(lic);
      if (dl > 0 && dl <= 3) {
        const today = new Date().toDateString();
        if (localStorage.getItem('dd_exp_notice') !== today) {
          localStorage.setItem('dd_exp_notice', today);
          setExpiryNotice(`Votre abonnement expire dans ${dl} jour${dl > 1 ? 's' : ''}. Renouvelez pour ne pas perdre les exports illimités.`);
        }
      }
    } catch { /* ignore */ }
  }, []);
  // Handlers sauvegarde / restauration
  const handleBackupDownload = () => { downloadBackup(); setBackupMsg('Copie de sauvegarde téléchargée.'); setTimeout(() => setBackupMsg(null), 3000); };
  const handleBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = importAllData(String(reader.result || ''), 'merge');
      setBackupMsg(r.message);
      setDocs(loadAllDocs());
      setTimeout(() => setBackupMsg(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  // Capture le code parrain depuis un lien ?ref=DDREF-XXXX (lien de partage)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('ref');
      if (p) saveParrainCode(p);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { if (page !== 'editor') return; const t = setInterval(() => { saveDoc(data); setDocs(loadAllDocs()); }, 3000); return () => clearInterval(t); }, [data, page]);
  useEffect(() => { const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const set = useCallback(<K extends keyof QuoteData>(k: K, v: QuoteData[K]) => {
    setData(p => {
      const max = MAX_LEN[k as string];
      const val = max && typeof v === 'string' ? clampText(v, max) as QuoteData[K] : v;
      return { ...p, [k]: val };
    });
  }, []);
  const setItem = useCallback((id: string, f: keyof QuoteItem, v: string | number) => { setData(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [f]: f === 'quantity' || f === 'unitPrice' ? Number(v) || 0 : f === 'description' ? clampText(String(v), ITEM_DESC_MAX) : v } : i) })); }, []);
  const addItem = useCallback(() => setData(p => ({ ...p, items: [...p.items, newItemRow()] })), []);
  const delItem = useCallback((id: string) => setData(p => ({ ...p, items: p.items.filter(i => i.id !== id) })), []);

  const openDoc = (doc: QuoteData) => { setData(doc); setTab(0); setPage('editor'); };
  const goHome = () => { saveDoc(data); setDocs(loadAllDocs()); setPage('list'); };
  const handleNew = () => { const d = createDefaultDoc(); saveDoc(d); setDocs(loadAllDocs()); openDoc(d); };
  const handleDuplicate = (doc: QuoteData) => { const d = duplicateDoc(doc); setDocs(loadAllDocs()); openDoc(d); };
  /** Vérifie le quota d'exports (20 gratuits) avant export PDF / envoi signature. */
  const guardExport = () => {
    const lic = loadLicense();
    if (!canExport(lic)) { setPaywallBlocked(true); setPaywall(true); return false; }
    return true;
  };
  /** Popup de partage au bon moment — une seule fois par session. */
  const maybeShowSharePrompt = (title: string) => {
    try {
      if (sessionStorage.getItem('dd_share_prompt')) return;
      sessionStorage.setItem('dd_share_prompt', '1');
    } catch { /* ignore */ }
    setSharePromptTitle(title);
    setSharePrompt(true);
  };
  const handleDelete = (id: string) => { deleteDoc(id); setDocs(loadAllDocs()); };
  const handleConvert = () => { const inv = convertToInvoice(data); setDocs(loadAllDocs()); openDoc(inv); };
  const handleSave = () => { saveDoc(data); setDocs(loadAllDocs()); };
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { if (typeof reader.result === 'string') set('designerLogo', reader.result); }; reader.readAsDataURL(file); };
  const handleSaveClient = () => { const c: SavedClient = { id: uid(), name: data.clientName, company: data.clientCompany, email: data.clientEmail, address: data.clientAddress }; saveClient(c); setClients(loadClients()); };
  const handleLoadClient = (c: SavedClient) => { setData(p => ({ ...p, clientName: c.name, clientCompany: c.company, clientEmail: c.email, clientAddress: c.address })); setClientBook(false); };
  const handleDeleteClient = (id: string) => { deleteClient(id); setClients(loadClients()); };

  /* ---- Édition directe : cliquer sur un texte du document ---- */


  type QuickSection = 'emetteur' | 'client' | 'lignes' | 'conditions' | 'style';

  const dateVariants = (iso: string): string[] => {
    if (!iso) return [];
    try {
      const d = new Date(iso);
      return [
        d.toLocaleDateString('fr-FR'),
        d.toLocaleDateString('en-GB'),
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
        d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      ];
    } catch { return []; }
  };

  /** Détecte le champ correspondant à l'élément SVG cliqué (texte ou logo). */
  const resolvePreviewElement = (e: React.MouseEvent<HTMLDivElement>): { section: QuickSection; field: string } | null => {
    const target = e.target as SVGElement | null;
    if (!target || typeof target.closest !== 'function') return null;
    const el = target.closest('text, image') as SVGElement | null;
    if (!el) return null;

    // Logo cliqué : ouvrir la section émetteur
    if (el.tagName.toLowerCase() === 'image') return { section: 'emetteur', field: 'designerLogo' };

    const txt = (el.textContent || '').trim();
    if (!txt) return null;

    const cands: { field: string; section: QuickSection; len: number }[] = [];
    const add = (field: string, section: QuickSection, val: string) => {
      const v = (val || '').trim();
      if (v && txt === v) cands.push({ field, section, len: v.length });
    };

    // Émetteur
    add('designerName', 'emetteur', data.designerName);
    add('designerTitle', 'emetteur', data.designerTitle);
    add('designerEmail', 'emetteur', data.designerEmail);
    add('designerPhone', 'emetteur', data.designerPhone);
    add('designerAddress', 'emetteur', data.designerAddress);
    add('designerSiret', 'emetteur', data.designerSiret);
    add('quoteNumber', 'emetteur', data.quoteNumber);
    dateVariants(data.quoteDate).forEach(v => add('quoteDate', 'emetteur', v));
    dateVariants(data.validUntil).forEach(v => add('validUntil', 'emetteur', v));

    // Client
    add('clientName', 'client', data.clientName);
    add('clientCompany', 'client', data.clientCompany);
    add('clientEmail', 'client', data.clientEmail);
    add('clientAddress', 'client', data.clientAddress);

    // Conditions
    add('notes', 'conditions', data.notes);

    // Lignes de prestation
    data.items.forEach((it, i) => {
      add('item:' + i + ':description', 'lignes', it.description);
      add('item:' + i + ':quantity', 'lignes', String(it.quantity));
      add('item:' + i + ':unitPrice', 'lignes', String(it.unitPrice));
      add('item:' + i + ':unitPrice', 'lignes', fmt(it.unitPrice));
      add('item:' + i + ':total', 'lignes', fmt(it.quantity * it.unitPrice));
    });

    if (cands.length) {
      cands.sort((a, b) => b.len - a.len);
      return { section: cands[0].section, field: cands[0].field };
    }
    // Repli multi-lignes (adresse, conditions découpées en lignes)
    return handlePreviewClickFallback(txt);
  };

  /** Repli : si le texte cliqué est une LIGNE d'un champ multi-lignes (adresse, conditions). */
  const handlePreviewClickFallback = (txt: string): { section: QuickSection; field: string } | null => {
    if (txt.length < 8) return null;
    if (data.notes && data.notes.includes(txt)) return { section: 'conditions', field: 'notes' };
    if (data.designerAddress && data.designerAddress.includes(txt)) return { section: 'emetteur', field: 'designerAddress' };
    if (data.clientAddress && data.clientAddress.includes(txt)) return { section: 'client', field: 'clientAddress' };
    return null;
  };

  /** Ouvre le panneau d'édition sur le champ indiqué (et active le mode si besoin). */
  const openQuickField = (section: QuickSection, field: string) => {
    setQuickEdit(true);
    setQuickSection(section);
    setQuickFocusField(field);
    setQuickFocusTick(t => t + 1);
  };

  /** Écran tactile ? (mobile/tablette) — le simple TAP ouvre l'édition, comme le double-clic sur PC. */
  const isTouchDevice = (() => {
    try { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; } catch { return false; }
  })();

  /** Simple clic : sur mobile (tactile) → édition directe toujours ; sur PC → seulement en mode Édition directe. */
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!quickEdit && !isTouchDevice) return;
    const r = resolvePreviewElement(e);
    if (r) { openQuickField(r.section, r.field); return; }
    // Texte non mappé : édition sur place (n'importe quel texte)
    const t = (e.target as SVGElement)?.closest?.('text') as SVGTextElement | null;
    if (t) startInlineEdit(t);
  };

  /** Double-clic : fonctionne TOUJOURS, sans activer le mode au préalable. */
  const handlePreviewDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = resolvePreviewElement(e);
    if (r) { openQuickField(r.section, r.field); return; }
    // Texte non mappé : édition sur place (n'importe quel texte)
    const t = (e.target as SVGElement)?.closest?.('text') as SVGTextElement | null;
    if (t) startInlineEdit(t);
  };

  /** Focus automatique du champ ciblé (après l'ouverture du panneau). */
  useEffect(() => {
    if (!quickFocusTick || !quickFocusField) return;
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-dd="${quickFocusField}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      el.focus();
      if (quickFocusField !== 'notes') el.select();
    }, 80);
    return () => window.clearTimeout(t);
  }, [quickFocusTick, quickFocusField]);

  /* ============ ÉDITION DE N'IMPORTE QUEL TEXTE (labels fixes inclus) ============ */

  /** Chemin structurel unique d'un élément SVG (index parmi ses frères du même tag, depuis la racine). */
  const structuralKey = (el: Element): string => {
    const parts: string[] = [];
    let cur: Element | null = el;
    while (cur && cur !== svgRef.current) {
      const parent: Element | null = cur.parentElement;
      const tag = cur.tagName.toLowerCase();
      const idx = parent ? Array.from(parent.children).filter(k => k.tagName.toLowerCase() === tag).indexOf(cur) : 0;
      parts.unshift(`${tag}:${idx}`);
      cur = parent;
    }
    return parts.join('/');
  };

  /** Retrouve un élément SVG à partir de sa clé structurelle. */
  const findTextByKey = (key: string): SVGTextElement | null => {
    const svg = svgRef.current;
    if (!svg || !key) return null;
    let cur: Element = svg;
    for (const part of key.split('/')) {
      const m = part.match(/^([a-z]+):(\d+)$/);
      if (!m) return null;
      const kids = Array.from(cur.children).filter(k => k.tagName.toLowerCase() === m[1]);
      const idx = parseInt(m[2], 10);
      if (!kids[idx]) return null;
      cur = kids[idx];
    }
    return cur as SVGTextElement;
  };

  /** Applique les textes personnalisés dans le DOM (après chaque rendu). */
  useEffect(() => {
    const ov = data.textOverrides;
    const svg = svgRef.current;
    if (!ov || !svg) return;
    for (const [key, o] of Object.entries(ov)) {
      const el = findTextByKey(key);
      if (!el) continue;
      const cur = (el.textContent || '').trim();
      if (cur === o.orig && cur !== o.val) {
        el.textContent = o.val;
      }
    }
  }, [data, data.textOverrides]);

  /** Ouvre l'éditeur sur place pour n'importe quel <text> du SVG. */
  const startInlineEdit = (el: SVGTextElement) => {
    if (!previewBoxRef.current) return;
    const ov = data.textOverrides || {};
    const key = structuralKey(el);
    const cont = previewBoxRef.current.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const anchor = el.getAttribute('text-anchor') || 'start';
    const current = (el.textContent || '').trim();
    const existing = ov[key];
    setInlineEdit({
      key,
      orig: existing ? existing.orig : current,
      value: existing ? existing.val : current,
      x: rect.left - cont.left,
      y: rect.top - cont.top,
      w: rect.width,
      h: rect.height,
      fontSize: parseFloat(cs.fontSize) || 12,
      color: readableOnWhite(cs.fill || '#333'),
      align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
    });
  };

  /** Valide l'édition sur place : enregistre le texte dans data.textOverrides. */
  const commitInlineEdit = () => {
    if (!inlineEdit) return;
    const val = clampText(inlineEdit.value.trim(), INLINE_MAX);
    const ov = { ...(data.textOverrides || {}) };
    if (val && val !== inlineEdit.orig) {
      ov[inlineEdit.key] = { orig: inlineEdit.orig, val };
    } else {
      delete ov[inlineEdit.key];
    }
    setData(p => ({ ...p, textOverrides: ov }));
    setInlineEdit(null);
  };

  const downloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const str = new XMLSerializer().serializeToString(svgRef.current);
    downloadBlob(new Blob([str], { type: 'image/svg+xml' }), data.docType + '-' + data.quoteNumber + '.svg');
    setExportOpen(false);
  }, [data.quoteNumber, data.docType]);

  const blobToDataUri = useCallback(async (blob: Blob): Promise<string> => {
    const buf = await blob.arrayBuffer(); const bytes = new Uint8Array(buf);
    const chunks: string[] = []; const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) chunks.push(String.fromCharCode(...bytes.slice(i, i + CHUNK)));
    return 'data:font/ttf;base64,' + btoa(chunks.join(''));
  }, []);
  const buildFontFaceCSS = useCallback(async (family: string): Promise<string> => {
    try {
      // @ts-expect-error
      if (typeof window.queryLocalFonts !== 'function') return '';
      // @ts-expect-error
      const all: { family: string; style: string; blob: () => Promise<Blob> }[] = await window.queryLocalFonts();
      const ff = all.filter(f => f.family === family); if (ff.length === 0) return '';
      const variants = [
        { match: (s: string) => /regular/i.test(s) || s === '', weight: '400', style: 'normal' },
        { match: (s: string) => /\bbold\b/i.test(s) && !/italic/i.test(s), weight: '700', style: 'normal' },
        { match: (s: string) => /italic/i.test(s) && !/bold/i.test(s), weight: '400', style: 'italic' },
        { match: (s: string) => /medium/i.test(s) && !/italic/i.test(s), weight: '500', style: 'normal' },
        { match: (s: string) => /semi\s?bold/i.test(s) && !/italic/i.test(s), weight: '600', style: 'normal' },
        { match: (s: string) => /black|heavy/i.test(s) && !/italic/i.test(s), weight: '900', style: 'normal' },
        { match: (s: string) => /light/i.test(s) && !/italic/i.test(s), weight: '300', style: 'normal' },
      ];
      const css: string[] = []; const used = new Set<string>();
      for (const v of variants) { const m = ff.find(f => v.match(f.style)); if (!m) continue; const k = v.weight + v.style; if (used.has(k)) continue; used.add(k); const d = await blobToDataUri(await m.blob()); css.push('@font-face{font-family:"' + family + '";src:url("' + d + '")format("truetype");font-weight:' + v.weight + ';font-style:' + v.style + '}'); }
      if (!used.has('400normal') && ff.length > 0) { const d = await blobToDataUri(await ff[0].blob()); css.push('@font-face{font-family:"' + family + '";src:url("' + d + '")format("truetype");font-weight:400;font-style:normal}'); }
      return css.join('\n');
    } catch { return ''; }
  }, [blobToDataUri]);

  const downloadPDF = useCallback(async () => {
    if (!svgRef.current) return;
    if (!guardExport()) return;
    setPdfLoading(true);
    try {
      const svgEl = svgRef.current; const vb = svgEl.viewBox.baseVal;
      const svgW = vb.width, svgH = vb.height, pageH = 1123;
      const nPages = Math.max(1, Math.round(svgH / pageH));
      const pdfW = 595.28, pdfH = 841.89, SCALE = 3;
      const fontCSS = await buildFontFaceCSS(data.fontFamily);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      for (let i = 0; i < nPages; i++) {
        if (i > 0) doc.addPage();
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('viewBox', '0 ' + (i * pageH) + ' ' + svgW + ' ' + pageH);
        clone.setAttribute('width', String(svgW)); clone.setAttribute('height', String(pageH));
        const origStyle = svgEl.getAttribute('style') || ''; clone.setAttribute('style', origStyle);
        const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = fontCSS + '\nsvg{font-family:"' + data.fontFamily + '","Helvetica Neue",Arial,sans-serif}';
        clone.insertBefore(styleEl, clone.firstChild);
        let svgStr = new XMLSerializer().serializeToString(clone);
        if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = svgW * SCALE; c.height = pageH * SCALE; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.scale(SCALE, SCALE); ctx.drawImage(img, 0, 0, svgW, pageH); resolve(c.toDataURL('image/jpeg', 0.92)); }; img.onerror = () => reject(new Error('fail')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        });
        doc.addImage(dataUrl, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      }
      doc.save(data.docType + '-' + data.quoteNumber + '.pdf');
      incrementExportCount(); setLicenseTick(t => t + 1);
      maybeShowSharePrompt('Devis exporté avec succès ! ');
    } catch (err) { console.error(err); alert('Erreur PDF'); } finally { setPdfLoading(false); setExportOpen(false); }
  }, [data.quoteNumber, data.fontFamily, data.docType, buildFontFaceCSS]);

  const generateSignatureFile = useCallback(() => {
    if (!svgRef.current) return;
    if (!guardExport()) return;
    const blob = buildSignatureHtml(svgRef.current, data);
    downloadBlob(blob, 'signer-' + data.quoteNumber + '.html'); setExportOpen(false);
    incrementExportCount(); setLicenseTick(t => t + 1);
    maybeShowSharePrompt('Document envoyé pour signature ! ');
  }, [data]);

  const fmt = useCallback((n: number) => formatMoney(n, data.currency), [data.currency]);
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = sub * (1 + data.taxRate / 100);
  const curShort = CURRENCY_SHORT[data.currency] || 'F';
  const tabs = ['Emetteur', 'Client', 'Devis', 'Prestations', 'Style'];
  const statusInfo = STATUS_META[data.status];

  /* Modales montées sur les DEUX pages (liste + éditeur).
     Sans ça, une action déclenchée depuis la liste (ex : bouton
     « 20 EXPORTS GRATUITS » → paywall) ne s'affichait qu'après
     être entré dans l'éditeur. */
  const globalModals = (
    <>
      <PaywallModal
        open={paywall}
        blocked={paywallBlocked}
        onClose={() => { setPaywall(false); setPaywallBlocked(false); }}
        onActivated={() => setLicenseTick(t => t + 1)}
      />
      <SharePrompt open={sharePrompt} title={sharePromptTitle} onClose={() => setSharePrompt(false)} />
      <Onboarding open={onboarding} onClose={() => setOnboarding(false)} />
      <LegalModal open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} />
      <FAQModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <span hidden>{licenseTick}</span>
    </>
  );

  // List page
  if (page === 'list') {
    return (
      <div className={`min-h-screen ${dark ? 'bg-[#0a0a0a]' : 'bg-[#F0F0F0]'}`} style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
        <header className={`border-b sticky top-0 z-50 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E0E0E0]'}`}>
          <div className="max-w-[1200px] mx-auto px-2.5 sm:px-6 min-h-16 py-1.5 flex items-center justify-between gap-1.5 sm:gap-3" style={{ paddingLeft: 'max(10px, env(safe-area-inset-left))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
              <LogoMark size={28} />
              <div className="min-w-0 shrink-0"><div className={`text-[11px] sm:text-sm font-extrabold tracking-tight leading-none whitespace-nowrap ${dark ? 'text-white' : 'text-[#111]'}`}>DEVIS</div><div className="text-[7px] sm:text-[10px] text-[#999] font-medium tracking-widest leading-none mt-0.5 whitespace-nowrap">DESIGNER</div></div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button onClick={() => setDark(v => !v)} className={`w-[30px] h-[30px] sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border ${dark ? 'bg-zinc-800 border-zinc-700 text-yellow-400' : 'bg-white border-[#E0E0E0] text-zinc-600'}`} title={dark ? 'Mode clair' : 'Mode sombre'}>
                {dark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M12 12a2.25 2.25 0 00-2.25 2.25 2.25 2.25 0 002.25 2.25 2.25 2.25 0 002.25-2.25A2.25 2.25 0 0012 12z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                )}
              </button>
              <button onClick={() => { setPaywallBlocked(false); setPaywall(true); }} className={`h-8 sm:h-10 px-2 sm:px-4 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-2 border transition-colors whitespace-nowrap flex-shrink-0 ${isLicensed(loadLicense()) ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' : 'border-[#0057FF]/30 text-[#0057FF] bg-blue-50 dark:bg-blue-950/30'}`}>
                {isLicensed(loadLicense())
                  ? <>PRO</>
                  : <><span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0057FF] animate-pulse" /> {remainingFree(loadLicense())}<span className="hidden sm:inline"> EXPORTS GRATUITS</span></>}
              </button>
              <button onClick={handleNew} className="h-8 sm:h-10 px-2 sm:px-5 rounded-lg bg-[#0057FF] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 hover:opacity-90 active:scale-95 shadow-md flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                <span className="hidden sm:inline">Nouveau document</span>
              </button>
            </div>
          </div>
        </header>
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Bannière quota bas — urgence + partage */}
          {(() => {
            const lic = loadLicense();
            const rem = remainingFree(lic);
            if (isLicensed(lic) || rem > 5 || docs.length === 0) return null;
            return (
              <div className={`mb-5 rounded-xl border-2 border-dashed p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${rem <= 2 ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30' : 'border-[#BFDBFE] dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20'}`}>
                <div className="flex-1">
                  <div className={`text-sm font-black ${rem <= 2 ? 'text-red-600 dark:text-red-400' : 'text-[#0057FF]'}`}>
                    {rem <= 2 ? ` Plus que ${rem} export${rem > 1 ? 's' : ''} gratuit${rem > 1 ? 's' : ''} !` : `Plus que ${rem} exports gratuits`}
                  </div>
                  <div className="text-[11px] text-[#777] dark:text-zinc-400 mt-0.5">
                     Passez à Pro pour continuer à exporter sans limite, ou partagez l'app pour soutenir Devis Designer.
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:inline font-mono font-black tracking-widest text-[#0057FF] bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs">{getMyRefCode()}</span>
                  <a href={whatsappShareUrl()} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90 whitespace-nowrap">
                     Partager
                  </a>
                </div>
              </div>
            );
          })()}
          {/* Rappel d'expiration d'abonnement */}
          {expiryNotice && (
            <div className="mb-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{expiryNotice}</div>
              <button onClick={() => { setPaywallBlocked(false); setPaywall(true); }} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:opacity-90 whitespace-nowrap">
                Renouveler
              </button>
            </div>
          )}

          {/* Paiement en cours : rappel au retour de la page Orqex */}
          {(() => {
            if (isLicensed(loadLicense())) return null;
            let last: { purchaseId: string; at: number } | null = null;
            try { const r = localStorage.getItem('dd_last_purchase'); if (r) last = JSON.parse(r); } catch { last = null; }
            if (!last || !last.purchaseId || Date.now() - last.at > 20 * 60000) return null;
            return (
              <div className="mb-4 rounded-xl border-2 border-dashed p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: 'rgba(0,87,255,0.4)' }}>
                <div className="flex-1">
                  <div className="text-sm font-black" style={{ color: '#0057FF' }}>Paiement en cours</div>
                  <div className="text-[11px] text-[#777] dark:text-zinc-400 mt-0.5">
                    Si vous avez terminé le paiement Mobile Money sur la page Orqex, vérifiez la confirmation : l'offre sera activée automatiquement.
                  </div>
                </div>
                <button onClick={() => { setPaywallBlocked(false); setPaywall(true); }} className="px-4 py-2.5 rounded-lg bg-[#0057FF] text-white text-xs font-bold hover:opacity-90 whitespace-nowrap">
                  Vérifier la confirmation
                </button>
              </div>
            );
          })()}

          {/* Barre de sauvegarde / restauration */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-[#AAA]">SAUVEGARDE</span>
            <button onClick={handleBackupDownload} className="px-3 py-1.5 rounded-lg border border-[#E0E0E0] dark:border-zinc-700 text-[11px] font-bold text-[#555] dark:text-zinc-300 hover:bg-[#F8F8F8] dark:hover:bg-zinc-800">
              Exporter une copie
            </button>
            <button onClick={() => backupInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-[#E0E0E0] dark:border-zinc-700 text-[11px] font-bold text-[#555] dark:text-zinc-300 hover:bg-[#F8F8F8] dark:hover:bg-zinc-800">
              Restaurer une copie
            </button>
            <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleBackupFile} />
            {backupMsg && <span className="text-[11px] font-bold text-green-600 dark:text-green-400">{backupMsg}</span>}
          </div>

          <h2 className="text-xs font-bold text-[#AAA] tracking-widest mb-4">MES DOCUMENTS · {docs.length}</h2>
          {docs.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto mb-4 text-[#DDD] dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              <div className={`text-lg font-bold mb-2 ${dark ? 'text-white' : 'text-[#333]'}`}>Aucun document</div>
              <div className="text-sm text-[#999] mb-6">Creez votre premier devis ou facture</div>
              <button onClick={handleNew} className="px-6 py-3 rounded-lg bg-[#0057FF] text-white font-bold text-sm hover:opacity-90">+ Nouveau</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map(doc => {
                const s = STATUS_META[doc.status];
                const t = doc.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0) * (1 + doc.taxRate / 100);
                return (
                  <div key={doc.id} className={`rounded-xl border p-5 hover:shadow-lg transition-shadow group cursor-pointer ${dark ? 'bg-zinc-900 border-zinc-800 hover:shadow-zinc-900' : 'bg-white border-[#E8E8E8]'}`} onClick={() => openDoc(doc)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                      <span className="text-[10px] font-bold text-[#ccc] tracking-wider">{doc.docType === 'facture' ? 'FACTURE' : 'DEVIS'}</span>
                    </div>
                    <div className={`text-sm font-bold mb-1 ${dark ? 'text-white' : 'text-[#111]'}`}>{doc.quoteNumber}</div>
                    <div className="text-xs text-[#888] mb-3">{doc.clientName || doc.clientCompany || 'Sans client'}</div>
                    <div className="text-lg font-black" style={{ color: doc.accentColor }}>{formatMoney(t, doc.currency)}</div>
                    <div className="text-[10px] text-[#ccc] mt-2">{safeDate(doc.updatedAt)}</div>
                    <div className="flex gap-3 mt-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); handleDuplicate(doc); }} className="text-[10px] font-bold text-[#999] hover:text-[#555] dark:hover:text-white tracking-wider">DUPLIQUER</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} className="text-[10px] font-bold text-red-400 hover:text-red-600 tracking-wider">SUPPRIMER</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer : aide, FAQ, mentions légales */}
          <div className={`mt-10 pt-6 border-t flex flex-wrap items-center justify-between gap-3 ${dark ? 'border-zinc-800' : 'border-[#F0F0F0]'}`}>
            <div className="text-[10px] text-[#AAA]">Devis Designer · Version 1.0.4</div>
            <div className="flex gap-4">
              <button onClick={() => setFaqOpen(true)} className="text-[11px] font-bold text-[#888] hover:text-[#0057FF] tracking-wider uppercase">Aide / FAQ</button>
              <button onClick={() => { setLegalTab('cgu'); setLegalOpen(true); }} className="text-[11px] font-bold text-[#888] hover:text-[#0057FF] tracking-wider uppercase">Conditions</button>
              <button onClick={() => { setLegalTab('privacy'); setLegalOpen(true); }} className="text-[11px] font-bold text-[#888] hover:text-[#0057FF] tracking-wider uppercase">Confidentialité</button>
            </div>
          </div>
        </div>
        {globalModals}
      </div>
    );
  }

  // Editor
  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-[#0a0a0a]' : 'bg-[#F0F0F0]'}`} style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <header className={`border-b sticky top-0 z-50 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E0E0E0]'}`}>
        <div className="max-w-[1800px] mx-auto px-2.5 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex items-center gap-1.5 sm:gap-4">
            <button onClick={goHome} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <LogoMark size={34} />
              <div className="hidden sm:block"><div className={`text-sm font-extrabold tracking-tight leading-none ${dark ? 'text-white' : 'text-[#111]'}`}>DEVIS</div><div className="text-[10px] text-[#999] font-medium tracking-widest leading-none mt-0.5">DESIGNER</div></div>
            </button>
            <div className={`hidden md:block w-px h-8 mx-1 ${dark ? 'bg-zinc-700' : 'bg-[#E8E8E8]'}`} />
            <button onClick={() => { const idx = ALL_STATUSES.indexOf(data.status); set('status', ALL_STATUSES[(idx + 1) % ALL_STATUSES.length]); }} className="flex items-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-xs font-bold transition-colors cursor-pointer flex-shrink-0" style={{ color: statusInfo.color, background: statusInfo.bg }} title="Cliquer pour changer le statut">
              <span className="w-2 h-2 rounded-full" style={{ background: statusInfo.color }} />{statusInfo.label}
            </button>
            <div className={`hidden md:block w-px h-8 mx-1 ${dark ? 'bg-zinc-700' : 'bg-[#E8E8E8]'}`} />
            <div className={`hidden md:flex items-center gap-1.5 rounded-lg p-1 ${dark ? 'bg-zinc-800' : 'bg-[#F5F5F5]'}`}>
              {COLORS.map(c => (<button key={c.value} title={c.label} onClick={() => set('accentColor', c.value)} className={`w-6 h-6 rounded-md transition-transform ${data.accentColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-[#111] dark:ring-white' : 'hover:scale-110'}`} style={{ background: c.value }} />))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-4">
            <button onClick={() => setDark(v => !v)} className={`w-9 h-9 rounded-lg flex items-center justify-center border ${dark ? 'bg-zinc-800 border-zinc-700 text-yellow-400' : 'bg-white border-[#E0E0E0] text-zinc-600'}`} title={dark ? 'Mode clair' : 'Mode sombre'}>
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M12 12a2.25 2.25 0 00-2.25 2.25 2.25 2.25 0 002.25 2.25 2.25 2.25 0 002.25-2.25A2.25 2.25 0 0012 12z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>
            <button onClick={handleSave} className={`flex items-center gap-1 h-[30px] px-[6px] sm:h-9 sm:px-3 rounded-lg border text-xs font-bold hover:opacity-80 transition-colors flex-shrink-0 ${dark ? 'border-zinc-700 text-zinc-300 bg-zinc-800' : 'border-[#E0E0E0] text-[#666] bg-white'}`} title="Sauvegarder">
              <svg className="w-[14px] h-[14px] sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
              <span className="hidden sm:inline">Sauver</span>
            </button>
            <button onClick={() => setQuickEdit(v => !v)} className={`flex items-center gap-1 h-[30px] px-[6px] sm:h-9 sm:px-3 rounded-lg border text-xs font-bold transition-colors flex-shrink-0 ${quickEdit ? 'bg-[#0057FF] border-[#0057FF] text-white' : dark ? 'border-zinc-700 text-zinc-300 bg-zinc-800' : 'border-[#E0E0E0] text-[#666] bg-white'}`} title="Écrire directement sur l'aperçu du document (toucher un texte pour le modifier)">
              <svg className="w-[14px] h-[14px] sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              <span className="hidden sm:inline">Édition directe</span>
            </button>
            <div className="hidden sm:block text-right mr-1 min-w-0">
              <div className="text-[10px] text-[#AAA] font-semibold tracking-widest">TOTAL TTC</div>
              <div className="text-lg font-black tracking-tight whitespace-nowrap" style={{ color: data.accentColor }}>{fmt(total)}</div>
            </div>
            <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen(o => !o)} className="h-[34px] px-[6px] sm:h-10 sm:px-5 rounded-lg text-white text-[10px] sm:text-sm font-bold flex items-center gap-1 sm:gap-2 transition-all hover:opacity-90 active:scale-95 shadow-md flex-shrink-0" style={{ background: data.accentColor }}>
                <svg className="w-[16px] h-[16px] sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                <span className="hidden sm:inline">Exporter</span>
                <svg className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {exportOpen && (
                <div className={`absolute right-0 top-12 w-72 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border overflow-hidden z-50 ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-[#E8E8E8]'}`}>
                  <div className={`px-4 py-3 border-b ${dark ? 'border-zinc-700' : 'border-[#F0F0F0]'}`}><div className="text-[10px] font-bold text-[#AAA] tracking-widest">FORMAT D'EXPORT</div></div>
                  <button onClick={downloadSVG} className={`w-full px-4 py-3.5 flex items-center gap-3 transition-colors text-left group ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#F8F8F8]'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-[#F0F0F0] group-hover:bg-[#E8E8E8]'}`}><svg className="w-5 h-5 text-[#555] dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg></div>
                    <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#222]'}`}>SVG</div><div className="text-[10px] text-[#999]">Vectoriel</div></div><span className="text-[9px] font-bold tracking-wider text-[#BBB] bg-[#F5F5F5] dark:bg-zinc-700 dark:text-zinc-300 px-2 py-1 rounded flex-shrink-0">SVG</span>
                  </button>
                  <div className={`h-px ${dark ? 'bg-zinc-700' : 'bg-[#F0F0F0]'}`} />
                  <button onClick={downloadPDF} disabled={pdfLoading} className={`w-full px-4 py-3.5 flex items-center gap-3 transition-colors text-left group disabled:opacity-60 ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#F8F8F8]'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-[#F0F0F0] group-hover:bg-[#E8E8E8]'}`}>{pdfLoading ? <svg className="w-5 h-5 text-[#555] animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <svg className="w-5 h-5 text-[#E63946]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}</div>
                    <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#222]'}`}>{pdfLoading ? 'Generation...' : 'PDF'}</div><div className="text-[10px] text-[#999]">A4 multi-pages</div></div><span className="text-[9px] font-bold tracking-wider text-white bg-[#E63946] px-2 py-1 rounded flex-shrink-0">PDF</span>
                  </button>
                  <div className={`h-px ${dark ? 'bg-zinc-700' : 'bg-[#F0F0F0]'}`} />
                  <button onClick={generateSignatureFile} className={`w-full px-4 py-3.5 flex items-center gap-3 transition-colors text-left group ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#F8F8F8]'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-[#F0F0F0] group-hover:bg-[#E8E8E8]'}`}><svg className="w-5 h-5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></div>
                    <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#222]'}`}>Envoyer pour signature</div><div className="text-[10px] text-[#999]">Fichier HTML pour le client</div></div><span className="text-[9px] font-bold tracking-wider text-white bg-[#10B981] px-2 py-1 rounded flex-shrink-0">HTML</span>
                  </button>
                  <div className={`h-px ${dark ? 'bg-zinc-700' : 'bg-[#F0F0F0]'}`} />
                  <button onClick={() => { setPresentMode(true); setExportOpen(false); }} className={`w-full px-4 py-3.5 flex items-center gap-3 transition-colors text-left group ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#F8F8F8]'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${dark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-[#F0F0F0] group-hover:bg-[#E8E8E8]'}`}><svg className="w-5 h-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg></div>
                    <div className="flex-1 min-w-0"><div className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#222]'}`}>Presenter au client</div><div className="text-[10px] text-[#999]">Mode plein ecran + signature</div></div><span className="text-[9px] font-bold tracking-wider text-white bg-[#8B5CF6] px-2 py-1 rounded flex-shrink-0">LIVE</span>
                  </button>
                  <div className={`px-4 py-2.5 border-t ${dark ? 'bg-zinc-800 border-zinc-700' : 'bg-[#FAFAFA] border-[#F0F0F0]'}`}><div className="text-[9px] text-[#BBB] text-center">{data.quoteNumber} · {curShort}</div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1800px] w-full mx-auto flex flex-col lg:flex-row gap-0">
        <aside className={`w-full lg:w-[420px] flex-shrink-0 border-r lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 overflow-hidden flex flex-col ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E8E8E8]'}`}>
          <div className={`flex border-b ${dark ? 'border-zinc-800' : 'border-[#E8E8E8]'}`}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} className={`flex-1 h-12 text-[10px] sm:text-xs font-bold tracking-wider transition-colors ${tab === i ? (dark ? 'text-white' : 'text-[#111]') : 'text-[#BBB] hover:text-[#888] dark:hover:text-zinc-400'}`} style={tab === i ? { boxShadow: `inset 0 -2px 0 ${data.accentColor}` } : {}}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* TAB 0 */}
            {tab === 0 && (<>
              <Label text="Informations emetteur" accent={data.accentColor} dark={dark} />
              <div>
                <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>LOGO</label>
                {data.designerLogo ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E8E8E8] dark:border-zinc-700 group">
                    <img src={data.designerLogo} alt="Logo" className="w-full h-full object-contain" />
                    <button onClick={() => set('designerLogo', '')} className="absolute inset-0 bg-black/50 text-white text-xs font-bold sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">Retirer</button>
                  </div>
                ) : (
                  <label className={`w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50' : 'border-[#DDD] hover:border-[#BBB]'}`}>
                    <svg className="w-6 h-6 text-[#CCC] dark:text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    <span className="text-[10px] text-[#BBB] font-medium">PNG uniquement</span>
                    <input type="file" accept=".png" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
              <Input label="Nom complet" value={data.designerName} onChange={v => set('designerName', v)} accent={data.accentColor} dark={dark} />
              <Input label="Titre" value={data.designerTitle} onChange={v => set('designerTitle', v)} accent={data.accentColor} dark={dark} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" value={data.designerEmail} onChange={v => set('designerEmail', v)} accent={data.accentColor} dark={dark} />
                <Input label="Telephone" value={data.designerPhone} onChange={v => set('designerPhone', v)} accent={data.accentColor} dark={dark} />
              </div>
              <Input label="Adresse" value={data.designerAddress} onChange={v => set('designerAddress', v)} accent={data.accentColor} dark={dark} />
              <Input label="N SIRET" value={data.designerSiret} onChange={v => set('designerSiret', v)} accent={data.accentColor} dark={dark} />
            </>)}
            {/* TAB 1 */}
            {tab === 1 && (<>
              <div className="flex items-center justify-between">
                <Label text="Informations client" accent={data.accentColor} dark={dark} />
                <button onClick={() => setClientBook(!clientBook)} className={`text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${dark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-[#E0E0E0] hover:bg-[#F5F5F5]'}`} style={{ color: data.accentColor }}>{clientBook ? 'FERMER' : 'CARNET'}</button>
              </div>
              {clientBook ? (
                <div className="space-y-2">{clients.length === 0 ? <div className="text-sm text-[#999] text-center py-6">Aucun client sauvegarde</div> : clients.map(c => (<div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${dark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-[#E8E8E8] hover:bg-[#FAFAFA]'}`}><div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadClient(c)}><div className={`text-sm font-bold truncate ${dark ? 'text-white' : 'text-[#222]'}`}>{c.name}</div><div className="text-[10px] text-[#999] truncate">{c.company} · {c.email}</div></div><button onClick={() => handleDeleteClient(c.id)} className="text-red-400 hover:text-red-600 text-[10px] font-bold tracking-wider">SUPPR</button></div>))}</div>
              ) : (<>
                <Input label="Nom du contact" value={data.clientName} onChange={v => set('clientName', v)} accent={data.accentColor} dark={dark} />
                <Input label="Entreprise" value={data.clientCompany} onChange={v => set('clientCompany', v)} accent={data.accentColor} dark={dark} />
                <Input label="Email" value={data.clientEmail} onChange={v => set('clientEmail', v)} accent={data.accentColor} dark={dark} />
                <Input label="Adresse" value={data.clientAddress} onChange={v => set('clientAddress', v)} accent={data.accentColor} dark={dark} />
                {data.clientName && (<button onClick={handleSaveClient} className="w-full py-2 rounded-lg border-2 border-dashed text-xs font-bold tracking-wider transition-colors hover:bg-[#FAFAFA] dark:hover:bg-zinc-800" style={{ borderColor: data.accentColor + '40', color: data.accentColor }}>+ SAUVEGARDER CE CLIENT</button>)}
              </>)}
            </>)}
            {/* TAB 2 */}
            {tab === 2 && (<>
              <Label text="Parametres" accent={data.accentColor} dark={dark} />
              <div>
                <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>TYPE DE DOCUMENT</label>
                <div className="flex gap-2">{(['devis', 'facture'] as const).map(t => (<button key={t} onClick={() => { const nextType = t; const nextNum = getNextNumber(nextType); set('docType', nextType); set('quoteNumber', nextNum); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider border-2 transition-all ${data.docType === t ? 'shadow-sm' : 'bg-[#FAFAFA] text-[#999] dark:bg-zinc-800 dark:text-zinc-400'}`} style={data.docType === t ? { borderColor: data.accentColor, color: data.accentColor, background: dark ? '#1a1a2e' : '#F8F8FF' } : { borderColor: dark ? '#333' : '#ECECEC' }}>{t.toUpperCase()}</button>))}</div>
                {data.docType === 'facture' && <div className="text-[10px] text-[#999] mt-1">Numerotation auto: FAC-2025-XXX</div>}
                {data.docType === 'devis' && <div className="text-[10px] text-[#999] mt-1">Numerotation auto: DEV-2025-XXX — sans doublon</div>}
              </div>
              {data.docType === 'devis' && (<button onClick={handleConvert} className="w-full py-2.5 rounded-lg bg-[#10B981] text-white text-xs font-bold tracking-wider hover:opacity-90 transition-opacity">CONVERTIR EN FACTURE</button>)}
              <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>STATUT</label><div className="flex flex-wrap gap-2">{ALL_STATUSES.map(s => { const m = STATUS_META[s]; return (<button key={s} onClick={() => set('status', s)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${data.status === s ? 'ring-2 ring-offset-1 dark:ring-offset-zinc-900' : 'opacity-60 hover:opacity-100'}`} style={{ color: m.color, background: dark && data.status !== s ? '#27272a' : m.bg }}>{m.label}</button>); })}</div></div>
              <div>
                <Input label="Numero (auto-genere)" value={data.quoteNumber} onChange={v => set('quoteNumber', v)} accent={data.accentColor} dark={dark} />
                <button onClick={() => set('quoteNumber', getNextNumber(data.docType))} className="text-[10px] font-bold tracking-wider mt-1 hover:underline" style={{ color: data.accentColor }}>Regenerer le numero</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date d'emission" type="date" value={data.quoteDate} onChange={v => set('quoteDate', v)} accent={data.accentColor} dark={dark} />
                <Input label="Valide jusqu'au" type="date" value={data.validUntil} onChange={v => set('validUntil', v)} accent={data.accentColor} dark={dark} />
              </div>
              <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>TVA (%)</label><NumInput value={data.taxRate} onCommit={n => set('taxRate', n)} className={`w-full px-4 py-3 text-sm rounded-lg focus:outline-none transition-colors ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = data.accentColor)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} /></div>
              <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>CONDITIONS</label>
                <textarea value={data.notes} onChange={e => set('notes', e.target.value)} rows={3} className={`w-full px-4 py-3 text-sm rounded-lg focus:outline-none transition-colors resize-none ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = data.accentColor)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} />
              </div>
              <div className={`h-px my-1 ${dark ? 'bg-zinc-700' : 'bg-[#E8E8E8]'}`} />
              <Label text="Signatures" accent={data.accentColor} dark={dark} />
              <div className={`rounded-xl border-2 p-4 space-y-3 ${dark ? 'border-zinc-700 bg-zinc-800/30' : 'border-[#ECECEC]'}`}>
                <div className="flex items-center justify-between"><span className={`text-[11px] font-bold tracking-wider ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>EMETTEUR</span>{data.designerSignature && (<button onClick={() => { set('designerSignature', ''); set('designerSignedAt', ''); }} className="text-[10px] font-bold text-red-400 hover:text-red-600 tracking-wider">RETIRER</button>)}</div>
                {data.designerSignature ? (<div><div className={`rounded-lg p-2 border ${dark ? 'bg-zinc-800 border-zinc-700' : 'bg-[#FAFAFA] border-[#ECECEC]'}`}><img src={data.designerSignature} alt="Signature" className="h-14 object-contain" style={dark ? { filter: 'invert(1)' } : undefined} /></div><div className="text-[10px] text-[#BBB] mt-1">Signe le {safeDate(data.designerSignedAt)}</div></div>) : (<button onClick={() => setSigModal('designer')} className={`w-full py-3 rounded-lg border-2 border-dashed text-xs font-bold tracking-wider transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#FAFAFA]'}`} style={{ borderColor: data.accentColor + '40', color: data.accentColor }}>SIGNER EN TANT QU'EMETTEUR</button>)}
              </div>
              <div className={`rounded-xl border-2 p-4 space-y-3 ${dark ? 'border-zinc-700 bg-zinc-800/30' : 'border-[#ECECEC]'}`}>
                <div className="flex items-center justify-between"><span className={`text-[11px] font-bold tracking-wider ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>CLIENT</span>{data.clientSignature && (<button onClick={() => { set('clientSignature', ''); set('clientSignedAt', ''); }} className="text-[10px] font-bold text-red-400 hover:text-red-600 tracking-wider">RETIRER</button>)}</div>
                {data.clientSignature ? (<div><div className={`rounded-lg p-2 border ${dark ? 'bg-zinc-800 border-zinc-700' : 'bg-[#FAFAFA] border-[#ECECEC]'}`}><img src={data.clientSignature} alt="Signature" className="h-14 object-contain" style={dark ? { filter: 'invert(1)' } : undefined} /></div><div className="text-[10px] text-[#BBB] mt-1">Signe le {safeDate(data.clientSignedAt)}</div></div>) : (<button onClick={() => setSigModal('client')} className={`w-full py-3 rounded-lg border-2 border-dashed text-xs font-bold tracking-wider transition-colors ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#FAFAFA]'}`} style={{ borderColor: data.accentColor + '40', color: data.accentColor }}>SIGNER EN TANT QUE CLIENT</button>)}
              </div>
            </>)}
            {/* TAB 3 */}
            {tab === 3 && (<>
              <Label text={'Lignes · ' + data.items.length} accent={data.accentColor} dark={dark} />
              <div className="space-y-3">{data.items.map((item, idx) => (<div key={item.id} className={`rounded-xl border-2 p-4 space-y-3 group transition-colors ${dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30' : 'border-[#ECECEC] hover:border-[#DDD]'}`}><div className="flex items-center justify-between"><span className="text-[11px] font-black tracking-widest" style={{ color: data.accentColor }}>{String(idx + 1).padStart(2, '0')}</span>{data.items.length > 1 && <button onClick={() => delItem(item.id)} className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] font-bold text-red-400 hover:text-red-600 tracking-wider">SUPPRIMER</button>}</div><input value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)} placeholder="Description" className={`w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors ${dark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = data.accentColor)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} /><div className="grid grid-cols-2 gap-3"><div><label className={`text-[10px] font-bold tracking-wider mb-1 block ${dark ? 'text-zinc-500' : 'text-[#BBB]'}`}>QTE</label><NumInput min={1} value={item.quantity} onCommit={n => setItem(item.id, 'quantity', n)} className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = data.accentColor)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} /></div><div><label className={`text-[10px] font-bold tracking-wider mb-1 block ${dark ? 'text-zinc-500' : 'text-[#BBB]'}`}>PRIX UNIT. {curShort}</label><NumInput min={0} value={item.unitPrice} onCommit={n => setItem(item.id, 'unitPrice', n)} className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = data.accentColor)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} /></div></div><div className={`text-right text-xs font-bold ${dark ? 'text-zinc-400' : 'text-[#555]'}`}>= {fmt(item.quantity * item.unitPrice)}</div></div>))}</div>
              <button onClick={addItem} className={`w-full h-12 rounded-xl border-2 border-dashed text-xs font-extrabold tracking-widest transition-all active:scale-[0.98] ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#FAFAFA]'}`} style={{ borderColor: data.accentColor + '50', color: data.accentColor }}>+ AJOUTER</button>
            </>)}
            {/* TAB 4 */}
            {tab === 4 && (<>
              <Label text="Modele" accent={data.accentColor} dark={dark} />
              <div className="grid grid-cols-1 gap-3">{TEMPLATES.map(t => (<button key={t.id} onClick={() => set('templateId', t.id)} className={`relative text-left p-4 rounded-xl border-2 transition-all ${data.templateId === t.id ? 'shadow-sm' : dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30' : 'border-[#ECECEC] hover:border-[#DDD] bg-[#FAFAFA]'}`} style={data.templateId === t.id ? { borderColor: data.accentColor, background: dark ? '#1e1e3a' : '#F8F8FF' } : {}}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: data.templateId === t.id ? data.accentColor : '#555' }}>{t.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className={`text-sm font-bold ${data.templateId === t.id ? '' : dark ? 'text-zinc-300' : 'text-[#555]'}`} style={data.templateId === t.id ? { color: data.accentColor } : {}}>{t.name}</div><div className="text-[10px] text-[#999] truncate">{t.description}</div></div>{data.templateId === t.id && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: data.accentColor }}><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>}</div></button>))}</div>
              <div className={`h-px my-2 ${dark ? 'bg-zinc-700' : 'bg-[#E8E8E8]'}`} />
              <Label text="Typographie" accent={data.accentColor} dark={dark} />
              <FontPicker value={data.fontFamily} onChange={v => set('fontFamily', v)} accent={data.accentColor} />
              <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>COULEUR D'ACCENT</label><div className="flex gap-2 flex-wrap">{COLORS.map(c => (<button key={c.value} title={c.label} onClick={() => set('accentColor', c.value)} className={`w-9 h-9 rounded-lg transition-transform ${data.accentColor === c.value ? 'scale-110 ring-2 ring-offset-2 ring-[#111] dark:ring-white dark:ring-offset-zinc-900' : 'hover:scale-105'}`} style={{ background: c.value }} />))}</div></div>
              <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>DEVISE</label><div className="grid grid-cols-3 gap-2">{CURRENCIES.map(c => (<button key={c.code} onClick={() => set('currency', c.code)} className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${data.currency === c.code ? 'shadow-sm' : dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30' : 'border-[#ECECEC] hover:border-[#DDD] bg-[#FAFAFA]'}`} style={data.currency === c.code ? { borderColor: data.accentColor, background: dark ? '#1e1e3a' : '#F8F8FF' } : {}}><span className="text-[10px] font-bold text-[#AAA] tracking-wider">{CURRENCY_LABELS[c.code]}</span><span className={`text-sm font-extrabold ${data.currency === c.code ? '' : dark ? 'text-zinc-300' : 'text-[#555]'}`} style={data.currency === c.code ? { color: data.accentColor } : {}}>{CURRENCY_SHORT[c.code]}</span><span className="text-[9px] text-[#AAA] font-medium">{c.label}</span>{data.currency === c.code && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: data.accentColor }}><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>}</button>))}</div></div>
              <div className={`h-px my-2 ${dark ? 'bg-zinc-700' : 'bg-[#E8E8E8]'}`} />
              <Label text="Filigrane" accent={data.accentColor} dark={dark} />
              <div className={`rounded-xl border-2 p-4 space-y-3 ${dark ? 'border-zinc-700' : 'border-[#ECECEC]'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-[#333]'}`}>Filigrane de statut</span>
                  <input type="checkbox" checked={data.showWatermark} onChange={e => set('showWatermark', e.target.checked)} className="w-4 h-4 rounded" />
                </label>
                <div className={`text-[10px] ${dark ? 'text-zinc-500' : 'text-[#999]'}`}>Affiche "{WATERMARK_LABEL[data.status]}" en filigrane diagonal.</div>
              </div>
            </>)}
            <div className={`rounded-xl p-4 border space-y-2 mt-4 ${dark ? 'bg-zinc-800 border-zinc-700' : 'bg-[#FAFAFA] border-[#ECECEC]'}`}>
              <div className="flex justify-between text-xs text-[#999]"><span>Sous-total HT</span><span className={`font-semibold font-mono ${dark ? 'text-zinc-300' : 'text-[#555]'}`}>{fmt(sub)}</span></div>
              <div className="flex justify-between text-xs text-[#999]"><span>TVA {data.taxRate}%</span><span className={`font-semibold font-mono ${dark ? 'text-zinc-300' : 'text-[#555]'}`}>{fmt(sub * data.taxRate / 100)}</span></div>
              <div className={`h-px ${dark ? 'bg-zinc-700' : 'bg-[#E0E0E0]'}`} />
              <div className="flex justify-between items-end"><span className={`text-xs font-extrabold tracking-wider ${dark ? 'text-white' : 'text-[#111]'}`}>TOTAL TTC</span><span className="text-xl font-black font-mono" style={{ color: data.accentColor }}>{fmt(total)}</span></div>
            </div>
          </div>
        </aside>

        <main className={`flex-1 overflow-auto p-6 lg:p-10 flex justify-center ${dark ? 'bg-[#0a0a0a]' : ''}`}>
          <div className="w-full max-w-[720px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: data.accentColor }} /><span className="text-[10px] font-extrabold text-[#AAA] tracking-[0.2em] uppercase">Apercu</span></div>
              <span className="text-[10px] text-[#CCC] font-mono">{data.docType.toUpperCase()} · {data.templateId} · {curShort}</span>
            </div>
            <div
              ref={previewBoxRef}
              className="relative"
            >
              <div
                id="dd-preview"
                onClick={handlePreviewClick}
                onDoubleClick={handlePreviewDoubleClick}
                className={`bg-white rounded-2xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden ring-1 ring-black/[0.04] ${quickEdit ? 'ring-2 ring-[#0057FF]/40' : ''}`}
              >
                {quickEdit && (
                  <style>{`#dd-preview svg text { cursor: text; } #dd-preview svg text:hover { outline: 1px dashed rgba(0,87,255,0.6); outline-offset: 1px; } #dd-preview svg image { cursor: pointer; }`}</style>
                )}
                <QuoteSVG data={data} svgRef={svgRef} />
              </div>

              {/* Éditeur sur place : champ flottant positionné exactement sur le texte cliqué */}
              {inlineEdit && (
                <input
                  autoFocus
                  value={inlineEdit.value}
                  onChange={e => setInlineEdit(p => p ? { ...p, value: e.target.value } : p)}
                  onBlur={commitInlineEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitInlineEdit(); }
                    if (e.key === 'Escape') { setInlineEdit(null); }
                  }}
                  placeholder="Texte du document"
                  style={{
                    position: 'absolute',
                    left: inlineEdit.x - 4,
                    top: inlineEdit.y - 4,
                    width: Math.max(inlineEdit.w + 12, 80),
                    fontSize: Math.max(inlineEdit.fontSize, 13),
                    color: inlineEdit.color,
                    textAlign: inlineEdit.align,
                    fontFamily: 'inherit',
                    background: 'rgba(255,255,255,0.97)',
                    border: '2px solid #0057FF',
                    borderRadius: 4,
                    padding: '2px 5px',
                    outline: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    zIndex: 60,
                  }}
                />
              )}
            </div>
            {quickEdit && (
              <div className="mt-2 text-center text-[10px] text-[#0057FF] font-bold bg-blue-50 dark:bg-blue-950/30 rounded-lg py-1.5">
                Double-cliquez sur n'importe quel texte du document pour le modifier (ou cliquez une fois en mode Édition directe).
              </div>
            )}
            {!quickEdit && (
              <div className="mt-2 text-center text-[10px] text-[#AAA] bg-[#FAFAFA] dark:bg-zinc-800/50 rounded-lg py-1.5">
                Astuce : double-cliquez directement sur un texte du document (nom, adresse, prestation, date…) pour le modifier.
              </div>
            )}
          </div>

          {/* ============ MODE ÉDITION DIRECTE SUR L'APERÇU ============ */}
          {quickEdit && (
            <>
              {/* Pastilles flottantes (choix de la section à éditer) */}
              <div className="fixed right-2 lg:right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
                {([
                  ['emetteur', 'Émetteur'],
                  ['client', 'Client'],
                  ['lignes', 'Lignes'],
                  ['conditions', 'Conditions'],
                  ['style', 'Style'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setQuickSection(id)}
                    title={label}
                    className={`w-11 h-11 rounded-xl shadow-lg flex items-center justify-center text-[9px] font-black tracking-wider transition-all border ${quickSection === id ? 'bg-[#0057FF] text-white border-[#0057FF] scale-110' : dark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-white text-[#666] border-[#E0E0E0]'}`}
                    style={quickSection === id ? { transform: 'scale(1.1)' } : {}}
                  >
                    {label.slice(0, 4).toUpperCase()}
                  </button>
                ))}
                <button onClick={() => setQuickEdit(false)} title="Fermer" className="w-11 h-11 rounded-xl shadow-lg bg-red-500 text-white text-lg font-black flex items-center justify-center border border-red-600">
                  ×
                </button>
              </div>

              {/* Panneau d'édition flottant */}
              <div className={`fixed right-16 lg:right-20 top-20 bottom-8 z-40 w-80 max-w-[80vw] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border overflow-y-auto p-4 space-y-3 ${dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-[#E8E8E8]'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black tracking-widest text-[#0057FF] uppercase">
                    {quickSection === 'emetteur' ? 'Émetteur' : quickSection === 'client' ? 'Client' : quickSection === 'lignes' ? 'Prestations' : quickSection === 'conditions' ? 'Conditions' : 'Style'}
                  </div>
                  <span className="text-[9px] text-[#AAA]">mise à jour en direct</span>
                </div>

                {quickSection === 'emetteur' && (<>
                  <Input data-dd="designerName" label="Nom / Société" value={data.designerName} onChange={v => set('designerName', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="designerTitle" label="Fonction / Slogan" value={data.designerTitle} onChange={v => set('designerTitle', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="designerEmail" label="Email" value={data.designerEmail} onChange={v => set('designerEmail', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="designerPhone" label="Téléphone" value={data.designerPhone} onChange={v => set('designerPhone', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="designerAddress" label="Adresse" value={data.designerAddress} onChange={v => set('designerAddress', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="designerSiret" label="SIRET / N° compte" value={data.designerSiret} onChange={v => set('designerSiret', v)} accent={data.accentColor} dark={dark} />
                  <div className="h-px bg-[#F0F0F0] dark:bg-zinc-800" />
                  <Input data-dd="quoteNumber" label="Numéro de devis" value={data.quoteNumber} onChange={v => set('quoteNumber', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="quoteDate" label="Date d'émission" type="date" value={data.quoteDate} onChange={v => set('quoteDate', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="validUntil" label="Valide jusqu'au" type="date" value={data.validUntil} onChange={v => set('validUntil', v)} accent={data.accentColor} dark={dark} />
                </>)}

                {quickSection === 'client' && (<>
                  <Input data-dd="clientName" label="Nom du client" value={data.clientName} onChange={v => set('clientName', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="clientCompany" label="Société / Téléphone" value={data.clientCompany} onChange={v => set('clientCompany', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="clientEmail" label="Email" value={data.clientEmail} onChange={v => set('clientEmail', v)} accent={data.accentColor} dark={dark} />
                  <Input data-dd="clientAddress" label="Adresse" value={data.clientAddress} onChange={v => set('clientAddress', v)} accent={data.accentColor} dark={dark} />
                </>)}

                {quickSection === 'lignes' && (<>
                  {data.items.map((item, idx) => (
                    <div key={item.id} className={`rounded-xl border-2 p-3 space-y-2 ${dark ? 'border-zinc-700' : 'border-[#ECECEC]'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black tracking-widest text-[#999]">LIGNE {String(idx + 1).padStart(2, '0')}</span>
                        <button onClick={() => delItem(item.id)} className="text-[9px] font-bold text-red-400 hover:text-red-600 tracking-wider">SUPPRIMER</button>
                      </div>
                      <input data-dd={"item:" + idx + ":description"} value={item.description} onChange={e => setItem(item.id, 'description', e.target.value)} placeholder="Description" className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-2 ${dark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`text-[9px] font-bold tracking-wider mb-1 block ${dark ? 'text-zinc-500' : 'text-[#BBB]'}`}>QTE</label>
                          <NumInput data-dd={"item:" + idx + ":quantity"} min={1} value={item.quantity} onCommit={n => setItem(item.id, 'quantity', n)} className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-2 ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} />
                        </div>
                        <div>
                          <label className={`text-[9px] font-bold tracking-wider mb-1 block ${dark ? 'text-zinc-500' : 'text-[#BBB]'}`}>PRIX UNIT.</label>
                          <NumInput data-dd={"item:" + idx + ":unitPrice"} min={0} value={item.unitPrice} onCommit={n => setItem(item.id, 'unitPrice', n)} className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-2 ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem} className={`w-full h-10 rounded-xl border-2 border-dashed text-xs font-extrabold tracking-widest transition-all active:scale-[0.98] ${dark ? 'hover:bg-zinc-800' : 'hover:bg-[#FAFAFA]'}`} style={{ borderColor: data.accentColor + '50', color: data.accentColor }}>+ AJOUTER UNE LIGNE</button>
                </>)}

                {quickSection === 'conditions' && (<>
                  <div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>TVA (%)</label><NumInput data-dd="taxRate" value={data.taxRate} onCommit={n => set('taxRate', n)} className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none border-2 ${dark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} /></div>
                  <div>
                    <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>CONDITIONS</label>
                    <textarea data-dd="notes" value={data.notes} onChange={e => set('notes', e.target.value)} rows={4} placeholder="Ex : Acompte de 30% à la signature, paiement à la réception..." className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none border-2 ${dark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} />
                  </div>
                </>)}

                {quickSection === 'style' && (<>
                  <div>
                    <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>MODÈLE</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map(t => (
                        <button key={t.id} onClick={() => set('templateId', t.id)} className={`text-left px-3 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${data.templateId === t.id ? '' : dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30' : 'border-[#ECECEC] hover:border-[#DDD] bg-[#FAFAFA]'}`} style={data.templateId === t.id ? { borderColor: data.accentColor, background: dark ? '#1e1e3a' : '#F8F8FF', color: data.accentColor } : {}}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>COULEUR D'ACCENT</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c.value} title={c.label} onClick={() => set('accentColor', c.value)} className={`w-8 h-8 rounded-lg transition-transform ${data.accentColor === c.value ? 'scale-110 ring-2 ring-offset-2 ring-[#111] dark:ring-white dark:ring-offset-zinc-900' : 'hover:scale-105'}`} style={{ background: c.value }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>POLICE</label>
                    <FontPicker value={data.fontFamily} onChange={v => set('fontFamily', v)} accent={data.accentColor} />
                  </div>
                  <div>
                    <label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>DEVISE</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CURRENCIES.map(c => (
                        <button key={c.code} onClick={() => set('currency', c.code)} className={`relative py-2 px-2 rounded-xl border-2 text-[10px] font-bold transition-all ${data.currency === c.code ? '' : dark ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/30' : 'border-[#ECECEC] hover:border-[#DDD] bg-[#FAFAFA]'}`} style={data.currency === c.code ? { borderColor: data.accentColor, color: data.accentColor } : {}}>
                          {CURRENCY_SHORT[c.code]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>)}
              </div>
            </>
          )}
        </main>
      </div>

      {presentMode && (
        <div className={`fixed inset-0 z-[90] flex flex-col ${dark ? 'bg-[#0a0a0a]' : 'bg-[#F0F0F0]'}`}>
          <div className={`border-b px-6 h-14 flex items-center justify-between flex-shrink-0 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E0E0E0]'}`}>
            <div className="flex items-center gap-2"><LogoMark size={32} /><div><div className={`text-xs font-extrabold ${dark ? 'text-white' : 'text-[#111]'}`}>{data.docType === 'facture' ? 'FACTURE' : 'DEVIS'}</div><div className="text-[9px] text-[#999]">{data.quoteNumber}</div></div></div>
            <div className="flex items-center gap-3">{data.clientSignature ? (<span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#10B981]">Signe</span>) : (<span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#3B82F6]">En attente</span>)}<button onClick={() => setPresentMode(false)} className={`h-9 px-4 rounded-lg border text-xs font-bold ${dark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-[#E0E0E0] text-[#666] hover:bg-[#F5F5F5]'}`}>Quitter</button></div>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-6"><div className="w-full max-w-[700px]"><div className="bg-white rounded-2xl shadow-xl overflow-hidden ring-1 ring-black/[0.04]"><QuoteSVG data={data} svgRef={svgRef} /></div></div></div>
          {!data.clientSignature && (<div className={`border-t px-6 py-4 flex items-center justify-center gap-4 flex-shrink-0 ${dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#E0E0E0]'}`}><span className={`text-sm ${dark ? 'text-zinc-400' : 'text-[#888]'}`}>Ce document attend la signature du client</span><button onClick={() => setSigModal('client')} className="px-6 py-3 rounded-lg text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95" style={{ background: data.accentColor }}>Signer ce document</button></div>)}
          {data.clientSignature && (<div className="bg-[#ECFDF5] border-t border-[#D1FAE5] px-6 py-4 flex items-center justify-center gap-4 flex-shrink-0"><span className="text-sm text-[#10B981] font-bold">Document signe par {data.clientName}</span><button onClick={() => setPresentMode(false)} className="px-6 py-3 rounded-lg bg-[#10B981] text-white font-bold text-sm hover:opacity-90">Terminer</button></div>)}
        </div>
      )}

      {sigModal && (<SignatureModal title={sigModal === 'designer' ? 'Signature emetteur' : 'Signature client'} accent={data.accentColor} onClose={() => setSigModal(null)} onSave={(dataUrl) => { const now = new Date().toISOString(); if (sigModal === 'designer') { set('designerSignature', dataUrl); set('designerSignedAt', now); if (data.status === 'brouillon') set('status', 'envoye'); } else { set('clientSignature', dataUrl); set('clientSignedAt', now); if (data.status === 'envoye') set('status', 'accepte'); } setSigModal(null); }} />)}

      {globalModals}
    </div>
  );
}

function Label({ text, accent, dark }: { text: string; accent: string; dark?: boolean }) {
  return (<div className="flex items-center gap-2.5"><div className="w-1 h-5 rounded-full" style={{ background: accent }} /><h3 className={`text-xs font-extrabold tracking-wider uppercase ${dark ? 'text-white' : 'text-[#111]'}`}>{text}</h3></div>);
}
function Input({ label, value, onChange, type = 'text', accent, dark, ref }: { label: string; value: string; onChange: (v: string) => void; type?: string; accent: string; dark?: boolean; ref?: React.Ref<HTMLInputElement> }) {
  return (<div><label className={`text-[11px] font-bold tracking-wider uppercase mb-2 block ${dark ? 'text-zinc-400' : 'text-[#999]'}`}>{label}</label><input ref={ref} type={type} value={value} onChange={e => onChange(e.target.value)} className={`w-full px-4 py-3 text-sm rounded-lg focus:outline-none transition-colors ${dark ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500' : 'bg-[#FAFAFA] border-[#ECECEC] text-[#333]'}`} style={{ borderWidth: '2px' }} onFocus={e => (e.target.style.borderColor = accent)} onBlur={e => (e.target.style.borderColor = dark ? '#3f3f46' : '#ECECEC')} /></div>);
}

/* Champ numérique sans le problème du « 0 collé » : tant que le champ
   est focalisé, il affiche exactement ce qui est tapé (champ vide,
   « 12. », …) et ne valide le nombre que lorsqu'il est valide. */
function NumInput({ value, onCommit, min, className, style, onFocus, onBlur, placeholder, 'data-dd': dataDd }: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  className?: string;
  style?: React.CSSProperties;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  'data-dd'?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      data-dd={dataDd}
      type="number"
      min={min}
      value={draft ?? String(value)}
      placeholder={placeholder}
      onChange={e => {
        setDraft(e.target.value);
        const n = e.target.value === '' ? NaN : Number(e.target.value);
        if (!isNaN(n)) onCommit(n);
      }}
      onFocus={e => { setDraft(String(value)); onFocus?.(e); }}
      onBlur={e => { setDraft(null); onBlur?.(e); }}
      className={className}
      style={style}
    />
  );
}
