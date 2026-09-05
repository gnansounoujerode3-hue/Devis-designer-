export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type CurrencyCode = 'EUR' | 'XOF' | 'USD';

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'XOF', label: 'Franc CFA', symbol: 'F',      symbolPosition: 'after'  },
  { code: 'EUR', label: 'Euro',      symbol: '\u20AC', symbolPosition: 'after'  },
  { code: 'USD', label: 'Dollar US', symbol: '$',       symbolPosition: 'before' },
];

export function formatMoney(n: number, currencyCode: CurrencyCode): string {
  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const isInteger = abs === Math.floor(abs);
  let formatted: string;
  if (cur.code === 'USD') {
    if (isInteger) { formatted = Math.floor(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    else { const fixed = abs.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); const parts = fixed.split('.'); const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); formatted = parts.length > 1 ? intPart + '.' + parts[1] : intPart; }
  } else {
    if (isInteger) { formatted = Math.floor(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    else { const fixed = abs.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); const parts = fixed.split('.'); const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); formatted = parts.length > 1 ? intPart + ',' + parts[1] : intPart; }
  }
  if (cur.symbolPosition === 'before') return sign + cur.symbol + ' ' + formatted;
  return sign + formatted + ' ' + cur.symbol;
}

export type DocType = 'devis' | 'facture';
export type DocStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'paye';

export const STATUS_META: Record<DocStatus, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: '#888', bg: '#F0F0F0' },
  envoye:    { label: 'Envoyé',    color: '#3B82F6', bg: '#EFF6FF' },
  accepte:   { label: 'Accepté',   color: '#10B981', bg: '#ECFDF5' },
  refuse:    { label: 'Refusé',    color: '#EF4444', bg: '#FEF2F2' },
  paye:      { label: 'Payé',      color: '#8B5CF6', bg: '#F5F3FF' },
};

export const WATERMARK_LABEL: Record<DocStatus, string> = {
  brouillon: 'BROUILLON',
  envoye: 'ENVOYE',
  accepte: 'ACCEPTE',
  refuse: 'REFUSE',
  paye: 'PAYE',
};

export interface QuoteData {
  id: string;
  docType: DocType;
  status: DocStatus;
  designerName: string;
  designerTitle: string;
  designerEmail: string;
  designerPhone: string;
  designerAddress: string;
  designerSiret: string;
  designerLogo: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientAddress: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  items: QuoteItem[];
  notes: string;
  taxRate: number;
  accentColor: string;
  currency: CurrencyCode;
  fontFamily: string;
  templateId: TemplateId;
  designerSignature: string;
  designerSignedAt: string;
  clientSignature: string;
  clientSignedAt: string;
  showWatermark: boolean;
  /** Textes du document personnalisés par l'utilisateur (clé = chemin SVG, valeur = texte). */
  textOverrides?: Record<string, { orig: string; val: string }>;
  createdAt: number;
  updatedAt: number;
}

export interface SavedClient {
  id: string;
  name: string;
  company: string;
  email: string;
  address: string;
}

export type TemplateId = 'modern' | 'classic' | 'minimal' | 'creative' | 'studio' | 'architect' | 'adapted' | 'minimalist' | 'purple' | 'corporate' | 'modernorange' | 'cleangradient';

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
}
