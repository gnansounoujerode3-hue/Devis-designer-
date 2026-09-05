import { DocType, QuoteData, QuoteItem, SavedClient } from './types';

const DOCS_KEY = 'devis_designer_docs';
const CLIENTS_KEY = 'devis_designer_clients';

const uid = () => Math.random().toString(36).slice(2, 9);

export function getNextNumber(docType: DocType): string {
  const year = new Date().getFullYear();
  const prefix = docType === 'devis' ? 'DEV' : 'FAC';
  const docs = loadAllDocs();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const d of docs) {
    const m = d.quoteNumber.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function createDefaultDoc(partial?: Partial<QuoteData>): QuoteData {
  const now = Date.now();
  const docType = partial?.docType || 'devis';
  const autoNum = getNextNumber(docType);
  return {
    id: uid(),
    docType,
    status: 'brouillon',
    designerName: '',
    designerTitle: '',
    designerEmail: '',
    designerPhone: '',
    designerAddress: '',
    designerSiret: '',
    designerLogo: '',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientAddress: '',
    quoteNumber: autoNum,
    quoteDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    items: [
      { id: uid(), description: 'Nouvelle prestation', quantity: 1, unitPrice: 0 },
    ],
    notes: 'Acompte de 30% a la signature du devis. Solde a la livraison finale.',
    taxRate: 18,
    accentColor: '#0057FF',
    currency: 'XOF',
    fontFamily: 'Inter',
    templateId: 'modern',
    designerSignature: '',
    designerSignedAt: '',
    clientSignature: '',
    clientSignedAt: '',
    showWatermark: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newItemRow(): QuoteItem {
  return { id: uid(), description: 'Nouvelle prestation', quantity: 1, unitPrice: 0 };
}

/* Normalise un document : garantit des types valides même si les données
   proviennent d'une ancienne version ou sont corrompues (anti-page blanche). */
function normalizeDoc(d: Partial<QuoteData> & Record<string, unknown> | null | undefined): QuoteData {
  if (!d || typeof d !== 'object') {
    // Document vide : retourne un document par défaut (ne plante jamais)
    const now = Date.now();
    return {
      id: Math.random().toString(36).slice(2),
      docType: 'devis', status: 'brouillon',
      designerName: '', designerTitle: '', designerEmail: '', designerPhone: '', designerAddress: '', designerSiret: '',
      designerLogo: '', clientName: '', clientCompany: '', clientEmail: '', clientAddress: '',
      quoteNumber: 'DEV-' + now.toString().slice(-4), quoteDate: '', validUntil: '',
      items: [], notes: '', taxRate: 0, accentColor: '#0057FF', currency: 'XOF',
      fontFamily: 'Inter', templateId: 'modern',
      designerSignature: '', designerSignedAt: '', clientSignature: '', clientSignedAt: '',
      showWatermark: true, createdAt: now, updatedAt: now,
    };
  }
  const items = Array.isArray(d.items)
    ? d.items.map(it => ({
        id: typeof it?.id === 'string' ? it.id : Math.random().toString(36).slice(2),
        description: typeof it?.description === 'string' ? it.description : '',
        quantity: typeof it?.quantity === 'number' && isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
        unitPrice: typeof it?.unitPrice === 'number' && isFinite(it.unitPrice) && it.unitPrice >= 0 ? it.unitPrice : 0,
      }))
    : [];
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
  const num = (v: unknown, fallback: number): number => (typeof v === 'number' && isFinite(v) ? v : fallback);
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  const now = Date.now();

  return {
    id: str(d.id, Math.random().toString(36).slice(2)),
    docType: d.docType === 'facture' ? 'facture' : 'devis',
    status: d.status === 'envoye' || d.status === 'accepte' || d.status === 'refuse' || d.status === 'paye' ? d.status : 'brouillon',
    designerName: str(d.designerName),
    designerTitle: str(d.designerTitle),
    designerEmail: str(d.designerEmail),
    designerPhone: str(d.designerPhone),
    designerAddress: str(d.designerAddress),
    designerSiret: str(d.designerSiret),
    designerLogo: str(d.designerLogo),
    clientName: str(d.clientName),
    clientCompany: str(d.clientCompany),
    clientEmail: str(d.clientEmail),
    clientAddress: str(d.clientAddress),
    quoteNumber: str(d.quoteNumber, 'DEV-' + now.toString().slice(-4)),
    quoteDate: str(d.quoteDate),
    validUntil: str(d.validUntil),
    items,
    notes: str(d.notes),
    taxRate: num(d.taxRate, 0),
    accentColor: str(d.accentColor, '#0057FF'),
    currency: d.currency === 'EUR' || d.currency === 'USD' ? d.currency : 'XOF',
    fontFamily: str(d.fontFamily, 'Inter'),
    templateId: (d.templateId as QuoteData['templateId']) || 'modern',
    designerSignature: str(d.designerSignature),
    designerSignedAt: str(d.designerSignedAt),
    clientSignature: str(d.clientSignature),
    clientSignedAt: str(d.clientSignedAt),
    showWatermark: bool(d.showWatermark, true),
    textOverrides: d.textOverrides && typeof d.textOverrides === 'object' ? d.textOverrides as QuoteData['textOverrides'] : undefined,
    createdAt: num(d.createdAt, now),
    updatedAt: num(d.updatedAt, now),
  };
}

export function loadAllDocs(): QuoteData[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as (Partial<QuoteData> & Record<string, unknown>)[];
    return arr.map(normalizeDoc);
  } catch { return []; }
}

export function saveAllDocs(docs: QuoteData[]) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function saveDoc(doc: QuoteData) {
  const docs = loadAllDocs();
  const idx = docs.findIndex(d => d.id === doc.id);
  const updated = { ...doc, updatedAt: Date.now() };
  if (idx >= 0) docs[idx] = updated; else docs.unshift(updated);
  saveAllDocs(docs);
  return updated;
}

export function deleteDoc(id: string) {
  saveAllDocs(loadAllDocs().filter(d => d.id !== id));
}

export function duplicateDoc(doc: QuoteData): QuoteData {
  const now = Date.now();
  const dup: QuoteData = {
    ...doc,
    id: uid(),
    quoteNumber: getNextNumber(doc.docType),
    status: 'brouillon',
    designerSignature: '',
    designerSignedAt: '',
    clientSignature: '',
    clientSignedAt: '',
    createdAt: now,
    updatedAt: now,
    items: doc.items.map(i => ({ ...i, id: uid() })),
  };
  const docs = loadAllDocs();
  docs.unshift(dup);
  saveAllDocs(docs);
  return dup;
}

export function convertToInvoice(doc: QuoteData): QuoteData {
  const now = Date.now();
  const inv: QuoteData = {
    ...doc,
    id: uid(),
    docType: 'facture',
    status: 'envoye',
    quoteNumber: getNextNumber('facture'),
    createdAt: now,
    updatedAt: now,
    items: doc.items.map(i => ({ ...i, id: uid() })),
  };
  const docs = loadAllDocs();
  docs.unshift(inv);
  saveAllDocs(docs);
  return inv;
}

export function loadClients(): SavedClient[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as (Partial<SavedClient> & Record<string, unknown>)[];
    if (!Array.isArray(arr)) return [];
    return arr.filter(c => c && typeof c === 'object').map(c => ({
      id: typeof c.id === 'string' ? c.id : Math.random().toString(36).slice(2),
      name: typeof c.name === 'string' ? c.name : '',
      company: typeof c.company === 'string' ? c.company : '',
      email: typeof c.email === 'string' ? c.email : '',
      address: typeof c.address === 'string' ? c.address : '',
    }));
  } catch { return []; }
}
export function saveClient(c: SavedClient) { const clients = loadClients(); const idx = clients.findIndex(x => x.id === c.id); if (idx >= 0) clients[idx] = c; else clients.unshift(c); localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients)); }
export function deleteClient(id: string) { localStorage.setItem(CLIENTS_KEY, JSON.stringify(loadClients().filter(c => c.id !== id))); }

/* ============================================================
   Sauvegarde / restauration complète (export & import JSON)
   ============================================================ */

export interface BackupData {
  app: 'devis-designer';
  version: 1;
  exportedAt: string;
  docs: QuoteData[];
  clients: SavedClient[];
}

/** Exporte toutes les données (devis + clients) en fichier JSON téléchargeable. */
export function exportAllData(): BackupData {
  return {
    app: 'devis-designer',
    version: 1,
    exportedAt: new Date().toISOString(),
    docs: loadAllDocs(),
    clients: loadClients(),
  };
}

/** Téléchargement sécurisé : ne plante JAMAIS (contrairement à appendChild+removeChild). */
export function downloadBlob(blob: Blob, filename: string) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // remove() est sûr : ne lève pas d'erreur même si le nœud a déjà été retiré
    setTimeout(() => {
      if (a.isConnected) a.remove();
      URL.revokeObjectURL(a.href);
    }, 100);
  } catch (err) {
    console.error('Téléchargement échoué:', err);
  }
}

export function downloadBackup() {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  downloadBlob(blob, 'devis-designer-sauvegarde-' + stamp + '.json');
}

/**
 * Restaure les données depuis un fichier JSON de sauvegarde.
 * Mode 'merge' : ajoute les documents (en évitant les doublons par id).
 * Mode 'replace' : remplace tout.
 */
export function importAllData(json: string, mode: 'merge' | 'replace' = 'merge'): { ok: boolean; message: string } {
  try {
    const data = JSON.parse(json) as Partial<BackupData>;
    if (data.app !== 'devis-designer' || !Array.isArray(data.docs)) {
      return { ok: false, message: 'Fichier de sauvegarde invalide.' };
    }
    const incomingDocs = (data.docs || []).filter(d => d && typeof d.id === 'string' && d.quoteNumber);
    const incomingClients = (data.clients || []).filter(c => c && typeof c.id === 'string');

    if (mode === 'replace') {
      saveAllDocs(incomingDocs);
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(incomingClients));
      return { ok: true, message: `${incomingDocs.length} document(s) et ${incomingClients.length} client(s) restaurés.` };
    }

    // Merge : on garde les existants, on ajoute les nouveaux
    const existing = loadAllDocs();
    const byId = new Map(existing.map(d => [d.id, d]));
    for (const d of incomingDocs) if (!byId.has(d.id)) byId.set(d.id, d);
    const mergedDocs = Array.from(byId.values());

    const existingClients = loadClients();
    const cById = new Map(existingClients.map(c => [c.id, c]));
    for (const c of incomingClients) if (!cById.has(c.id)) cById.set(c.id, c);
    const mergedClients = Array.from(cById.values());

    saveAllDocs(mergedDocs);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(mergedClients));
    return { ok: true, message: `${incomingDocs.length} document(s) importé(s) (${mergedDocs.length} au total).` };
  } catch {
    return { ok: false, message: 'Impossible de lire ce fichier.' };
  }
}
