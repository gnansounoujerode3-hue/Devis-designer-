/**
 * Shared pagination logic for all templates.
 * Distributes item rows across pages, and decides where the
 * bottom section (totals + conditions + signatures) goes.
 */

const PH = 1123;
const FOOTER_H = 44;
const FOOTER_GAP = 30;
const PAGE_BOTTOM_LIMIT = PH - FOOTER_H - FOOTER_GAP;

export { PH, FOOTER_H, PAGE_BOTTOM_LIMIT };

export interface PageDef {
  idx: number;
  y: number;        // absolute Y offset in the SVG canvas
  isFirst: boolean;
  rowIndices: number[];
  showBottom: boolean;
}

export interface PaginateOptions {
  totalItems: number;
  headerFullH: number;     // full header height (page 1)
  headerContH: number;     // compact header height + gap (page 2+)
  tableHeaderH: number;    // table column-header row height
  rowH: number;            // single row height
  bottomSectionH: number;  // height of totals + conditions + signatures
}

export function paginate(opts: PaginateOptions): PageDef[] {
  const { totalItems, headerFullH, headerContH, tableHeaderH, rowH, bottomSectionH } = opts;

  const pages: PageDef[] = [];
  let cursor = 0;
  let pageIdx = 0;

  // Pass 1 — distribute rows across pages
  while (cursor < totalItems) {
    const isFirst = pageIdx === 0;
    const headerH = isFirst ? headerFullH : headerContH;
    const contentStart = headerH + tableHeaderH;
    let y = contentStart;
    const indices: number[] = [];

    while (cursor < totalItems && y + rowH <= PAGE_BOTTOM_LIMIT) {
      indices.push(cursor);
      y += rowH;
      cursor++;
    }

    // Edge case: force at least one row per page
    if (indices.length === 0 && cursor < totalItems) {
      indices.push(cursor);
      cursor++;
    }

    pages.push({
      idx: pageIdx,
      y: pageIdx * PH,
      isFirst,
      rowIndices: indices,
      showBottom: false,
    });
    pageIdx++;
  }

  // Handle empty items edge case
  if (pages.length === 0) {
    pages.push({ idx: 0, y: 0, isFirst: true, rowIndices: [], showBottom: false });
    pageIdx = 1;
  }

  // Pass 2 — decide where the bottom section goes
  const lastPage = pages[pages.length - 1];
  const lastPageHeaderH = lastPage.isFirst ? headerFullH : headerContH;
  const lastPageRowsEnd = lastPageHeaderH + tableHeaderH + lastPage.rowIndices.length * rowH;
  const spaceLeft = PAGE_BOTTOM_LIMIT - lastPageRowsEnd;

  if (spaceLeft >= bottomSectionH) {
    lastPage.showBottom = true;
  } else {
    pages.push({
      idx: pageIdx,
      y: pageIdx * PH,
      isFirst: false,
      rowIndices: [],
      showBottom: true,
    });
  }

  return pages;
}

// Shared text helpers
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '...';
}

/**
 * Generate SVG elements for a signature box.
 * Returns an object with the props for rendering.
 */
export interface SigBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  name: string;
  signature: string;   // base64 or ''
  signedAt: string;     // ISO date or ''
  accent: string;
  bgFill?: string;
  strokeColor?: string;
  dashed?: boolean;
}

export function wrapLines(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.length ? lines : [''];
}

/** Date sécurisée : retourne une date lisible ou '' si invalide (ne plante jamais). */
export function safeDateStr(v: string | number | undefined | null, locale = 'fr-FR'): string {
  if (v === undefined || v === null || v === '') return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale);
  } catch { return ''; }
}
