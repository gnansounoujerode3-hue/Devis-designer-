import { useState, useEffect, useMemo, useRef } from 'react';
import { getAvailableFonts, DetectedFont, FontCategory } from '../lib/fonts';

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
  accent: string;
}

const CATEGORY_LABELS: { key: FontCategory; label: string }[] = [
  { key: 'all',     label: 'Tout' },
  { key: 'sans',    label: 'Sans' },
  { key: 'serif',   label: 'Serif' },
  { key: 'mono',    label: 'Mono' },
  { key: 'display', label: 'Display' },
];

export default function FontPicker({ value, onChange, accent }: FontPickerProps) {
  const [fonts, setFonts] = useState<DetectedFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FontCategory>('all');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load fonts on mount
  useEffect(() => {
    let cancelled = false;
    getAvailableFonts().then(f => {
      if (!cancelled) {
        setFonts(f);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter fonts
  const filtered = useMemo(() => {
    let list = fonts;
    if (category !== 'all') {
      list = list.filter(f => f.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.family.toLowerCase().includes(q));
    }
    return list;
  }, [fonts, category, search]);

  const categoryCount = useMemo(() => {
    const counts: Record<FontCategory, number> = { all: fonts.length, sans: 0, serif: 0, mono: 0, display: 0 };
    for (const f of fonts) counts[f.category]++;
    return counts;
  }, [fonts]);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-[11px] font-bold text-[#999] tracking-wider uppercase mb-2 block">
        TYPOGRAPHIE
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 text-left bg-[#FAFAFA] border-2 border-[#ECECEC] rounded-lg text-[#333] transition-colors flex items-center justify-between gap-2 hover:border-[#DDD]"
        style={open ? { borderColor: accent } : {}}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className="text-base font-semibold truncate"
            style={{ fontFamily: `"${value}", sans-serif` }}
          >
            {value}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-[#AAA] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Font preview under the button */}
      <div
        className="mt-2 px-4 py-3 bg-[#FAFAFA] border border-[#ECECEC] rounded-lg"
        style={{ fontFamily: `"${value}", sans-serif` }}
      >
        <div className="text-lg font-bold text-[#333] leading-tight">Aperçu du devis</div>
        <div className="text-sm text-[#888] mt-0.5">ABCDEFGHIJKLM 0123456789</div>
        <div className="text-xs text-[#bbb] mt-0.5">abcdefghijklmnopqrstuvwxyz</div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-[52px] bg-white border border-[#E0E0E0] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col" style={{ maxHeight: '420px' }}>
          {/* Search */}
          <div className="p-3 border-b border-[#F0F0F0]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BBB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une police..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] rounded-lg text-[#333] placeholder:text-[#CCC] focus:outline-none"
                style={{ boxShadow: `0 0 0 0px ${accent}`, transition: 'box-shadow 0.2s' }}
                onFocus={e => (e.target.style.boxShadow = `0 0 0 2px ${accent}`)}
                onBlur={e => (e.target.style.boxShadow = `0 0 0 0px ${accent}`)}
                autoFocus
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex border-b border-[#F0F0F0] px-1">
            {CATEGORY_LABELS.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors ${
                  category === cat.key ? 'text-[#111]' : 'text-[#CCC] hover:text-[#999]'
                }`}
                style={category === cat.key ? { boxShadow: `inset 0 -2px 0 ${accent}` } : {}}
              >
                {cat.label}
                <span className="ml-1 text-[9px] text-[#CCC]">{categoryCount[cat.key]}</span>
              </button>
            ))}
          </div>

          {/* Font list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-[#CCC]">
                <svg className="w-5 h-5 mr-2 animate-spin text-[#DDD]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Detection des polices...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#CCC]">Aucune police trouvée</div>
            ) : (
              filtered.map(font => {
                const isActive = font.family === value;
                return (
                  <button
                    key={font.family}
                    onClick={() => { onChange(font.family); setOpen(false); }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                      isActive ? 'bg-[#F0F4FF]' : 'hover:bg-[#F8F8F8]'
                    }`}
                    style={isActive ? { background: accent + '10' } : {}}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-sm truncate"
                        style={{
                          fontFamily: `"${font.family}", sans-serif`,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? accent : '#333',
                        }}
                      >
                        {font.family}
                      </div>
                      <div
                        className="text-[10px] text-[#BBB] truncate mt-0.5"
                        style={{ fontFamily: `"${font.family}", sans-serif` }}
                      >
                        Proposition de design — 1 250 €
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] font-bold tracking-wider text-[#CCC] bg-[#F5F5F5] px-1.5 py-0.5 rounded uppercase">
                        {font.category === 'sans' ? 'Sans' : font.category === 'serif' ? 'Serif' : font.category === 'mono' ? 'Mono' : 'Disp'}
                      </span>
                      {isActive && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#F0F0F0] bg-[#FAFAFA]">
            <div className="text-[9px] text-[#CCC] text-center">
              {fonts.length} polices detectees sur cet appareil
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
