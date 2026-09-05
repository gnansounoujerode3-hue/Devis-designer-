/**
 * Detect fonts available on the user's device.
 *
 * Strategy:
 *  1. Try the Local Font Access API (Chrome/Edge 103+) — gives the real list.
 *  2. Fallback: probe a large list of well-known fonts using a hidden canvas
 *     to see which ones render differently from the default monospace/serif/sans-serif.
 */

/* ---------- Probe list (fallback) ---------- */
const PROBE_FONTS = [
  // Sans-serif
  'Arial', 'Helvetica', 'Helvetica Neue', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Gill Sans', 'Lucida Grande', 'Lucida Sans', 'Segoe UI', 'Calibri', 'Candara',
  'Optima', 'Futura', 'Century Gothic', 'Franklin Gothic Medium', 'Geneva',
  'Avenir', 'Avenir Next', 'SF Pro Display', 'SF Pro Text', 'Inter',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Raleway', 'Ubuntu', 'Noto Sans', 'Source Sans Pro', 'DM Sans',
  'Fira Sans', 'Barlow', 'Manrope', 'Work Sans', 'Outfit',
  'Chakra Petch', 'Exo 2', 'Quicksand', 'Comfortaa',

  // Serif
  'Times New Roman', 'Times', 'Georgia', 'Garamond', 'Palatino',
  'Palatino Linotype', 'Book Antiqua', 'Baskerville', 'Cambria',
  'Didot', 'Bodoni MT', 'Rockwell', 'Perpetua', 'Goudy Old Style',
  'Big Caslon', 'Hoefler Text', 'Cochin', 'Playfair Display',
  'Lora', 'Merriweather', 'Noto Serif', 'Source Serif Pro',
  'PT Serif', 'Libre Baskerville', 'Cormorant Garamond',
  'EB Garamond', 'Crimson Text', 'DM Serif Display',

  // Monospace
  'Courier New', 'Courier', 'Consolas', 'Monaco', 'Menlo',
  'Lucida Console', 'DejaVu Sans Mono', 'Andale Mono',
  'SF Mono', 'Fira Code', 'JetBrains Mono', 'Source Code Pro',
  'IBM Plex Mono', 'Roboto Mono', 'Ubuntu Mono', 'Space Mono',

  // Display / Decorative
  'Impact', 'Copperplate', 'Papyrus', 'Brush Script MT',
  'Comic Sans MS', 'Marker Felt', 'Chalkboard SE',
  'American Typewriter', 'Snell Roundhand', 'Zapfino',
  'Apple Chancery', 'Bradley Hand', 'Phosphate', 'SignPainter',
  'Lobster', 'Pacifico', 'Dancing Script', 'Caveat',
  'Satisfy', 'Great Vibes', 'Permanent Marker', 'Bebas Neue',
  'Oswald', 'Anton', 'Russo One', 'Righteous', 'Abril Fatface',

  // System / UI
  'system-ui', 'Apple Color Emoji', 'Segoe UI Emoji',
  '-apple-system', 'BlinkMacSystemFont',
];

/* ---------- Canvas-based detection ---------- */
function detectWithCanvas(): string[] {
  const baseFonts = ['monospace', 'sans-serif', 'serif'] as const;
  const testStr = 'mmmmmmmmmmlli1|WMQ@#';
  const size = '72px';

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['Arial', 'Times New Roman', 'Courier New'];

  // Measure baselines
  const baseWidths: Record<string, number> = {};
  for (const base of baseFonts) {
    ctx.font = `${size} ${base}`;
    baseWidths[base] = ctx.measureText(testStr).width;
  }

  const detected: string[] = [];

  for (const font of PROBE_FONTS) {
    let isAvailable = false;
    for (const base of baseFonts) {
      ctx.font = `${size} "${font}", ${base}`;
      const w = ctx.measureText(testStr).width;
      if (w !== baseWidths[base]) {
        isAvailable = true;
        break;
      }
    }
    if (isAvailable) {
      detected.push(font);
    }
  }

  return detected.length > 0 ? detected : ['Arial', 'Times New Roman', 'Courier New'];
}

/* ---------- Local Font Access API ---------- */
interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

async function detectWithLocalFontAPI(): Promise<string[] | null> {
  try {
    // @ts-expect-error — queryLocalFonts is not yet in all TS libs
    if (typeof window.queryLocalFonts !== 'function') return null;
    // @ts-expect-error
    const fonts: FontData[] = await window.queryLocalFonts();
    // Deduplicate families
    const families = new Set<string>();
    for (const f of fonts) {
      families.add(f.family);
    }
    const arr = Array.from(families).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return arr.length > 0 ? arr : null;
  } catch {
    return null;
  }
}

/* ---------- Public API ---------- */
export type FontCategory = 'all' | 'sans' | 'serif' | 'mono' | 'display';

export interface DetectedFont {
  family: string;
  category: FontCategory;
}

const SERIF_KEYWORDS = ['serif', 'times', 'georgia', 'garamond', 'palatino', 'baskerville',
  'cambria', 'didot', 'bodoni', 'rockwell', 'perpetua', 'goudy', 'caslon', 'hoefler',
  'cochin', 'playfair', 'lora', 'merriweather', 'cormorant', 'crimson', 'antiqua', 'book'];
const MONO_KEYWORDS = ['mono', 'courier', 'consolas', 'menlo', 'code', 'terminal', 'console'];
const DISPLAY_KEYWORDS = ['display', 'impact', 'papyrus', 'comic', 'brush', 'marker', 'script',
  'hand', 'chancery', 'zapfino', 'lobster', 'pacifico', 'dancing', 'caveat', 'satisfy',
  'great vibes', 'permanent', 'bebas', 'oswald', 'anton', 'russo', 'righteous', 'abril',
  'copperplate', 'chalk', 'phosphate', 'sign', 'snell', 'roundhand'];

function categorize(family: string): FontCategory {
  const lower = family.toLowerCase();
  if (MONO_KEYWORDS.some(k => lower.includes(k))) return 'mono';
  if (DISPLAY_KEYWORDS.some(k => lower.includes(k))) return 'display';
  if (SERIF_KEYWORDS.some(k => lower.includes(k))) return 'serif';
  return 'sans';
}

let cachedFonts: DetectedFont[] | null = null;

export async function getAvailableFonts(): Promise<DetectedFont[]> {
  if (cachedFonts) return cachedFonts;

  // Try Local Font Access API first
  const localFonts = await detectWithLocalFontAPI();
  const families = localFonts ?? detectWithCanvas();

  cachedFonts = families.map(f => ({ family: f, category: categorize(f) }));
  return cachedFonts;
}
