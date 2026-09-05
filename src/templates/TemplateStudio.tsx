import React from 'react';
import { QuoteData, formatMoney } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 50;
const HEADER_FULL_H = 360, HEADER_CONT_H = 90, TABLE_HEADER_H = 30, ROW_H = 34, BOTTOM_H = 280;

function hex2rgb(hex: string) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return { r, g, b }; }

export default function TemplateStudio({ data, svgRef }: Props) {
  const accent = data.accentColor || '#6366F1';
  const { r, g, b } = hex2rgb(accent);
  const cc = data.currency || 'EUR';
  const font = data.fontFamily || 'Inter';
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return d; } };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%" style={{ fontFamily: `"${font}",Inter,sans-serif` }}>
      <defs>
        <linearGradient id="sGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={`rgb(${Math.min(r + 60, 255)},${Math.min(g + 40, 255)},${Math.min(b + 80, 255)})`} />
        </linearGradient>
      </defs>

      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tblY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tblY + TABLE_HEADER_H;
        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#FAFBFF" />

            {page.isFirst && (<g>
              {/* Gradient header strip */}
              <rect x="0" y={py} width={W} height="6" fill="url(#sGrad)" />

              {/* Two-column layout */}
              {/* Left — Brand logo or monogram */}
              {data.designerLogo ? (
                <image href={data.designerLogo} x={MX} y={py + 35} width="48" height="48" preserveAspectRatio="xMidYMid meet" />
              ) : (<>
                <rect x={MX} y={py + 35} width="48" height="48" rx="12" fill="url(#sGrad)" />
                <text x={MX + 24} y={py + 65} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="22" fontWeight="800">
                  {(data.designerName || 'D').charAt(0)}
                </text>
              </>)}
              <text x={MX + 62} y={py + 55} fill="#111" fontSize="15" fontWeight="700">{data.designerName || 'Studio'}</text>
              <text x={MX + 62} y={py + 72} fill="#999" fontSize="9">{data.designerTitle || 'Design Studio'}</text>

              {/* Right — DEVIS label */}
              <text x={W - MX} y={py + 55} textAnchor="end" fill={accent} fontSize="28" fontWeight="800" letterSpacing="2">DEVIS</text>
              <text x={W - MX} y={py + 72} textAnchor="end" fill="#bbb" fontSize="9">{data.quoteNumber || 'DEV-001'}</text>

              {/* Info cards row */}
              {[
                { label: 'DATE', value: fDate(data.quoteDate) },
                { label: 'VALIDITE', value: fDate(data.validUntil) },
                { label: 'TOTAL TTC', value: fmt(total), highlight: true },
              ].map((c, i) => (
                <g key={i}>
                  <rect x={MX + i * 222} y={py + 100} width="210" height="52" rx="10" fill={c.highlight ? accent : '#F0F1F8'} />
                  <text x={MX + i * 222 + 16} y={py + 120} fill={c.highlight ? '#fff' : '#999'} fontSize="7" letterSpacing="1.5" fontWeight="600">{c.label}</text>
                  <text x={MX + i * 222 + 16} y={py + 140} fill={c.highlight ? '#fff' : '#333'} fontSize={c.highlight ? '14' : '11'} fontWeight={c.highlight ? '800' : '600'}>{c.value}</text>
                </g>
              ))}

              {/* Emitter / Client side-by-side cards */}
              {[
                { label: 'EMETTEUR', name: data.designerName, sub: data.designerEmail + '\n' + data.designerPhone, detail: truncate(data.designerAddress || '', 36), x: MX },
                { label: 'CLIENT', name: data.clientName || 'Client', sub: (data.clientCompany || '') + '\n' + (data.clientEmail || ''), detail: truncate(data.clientAddress || '', 36), x: MX + 350 },
              ].map((c, i) => (
                <g key={i}>
                  <rect x={c.x} y={py + 175} width="320" height="100" rx="10" fill="#fff" stroke="#EAECF5" strokeWidth="1" />
                  <rect x={c.x + 12} y={py + 188} width="4" height="24" rx="2" fill={accent} />
                  <text x={c.x + 24} y={py + 198} fill={accent} fontSize="7" letterSpacing="2" fontWeight="700">{c.label}</text>
                  <text x={c.x + 24} y={py + 215} fill="#222" fontSize="11" fontWeight="600">{c.name}</text>
                  {c.sub.split('\n').map((l, j) => <text key={j} x={c.x + 24} y={py + 232 + j * 14} fill="#888" fontSize="9">{l}</text>)}
                  <text x={c.x + 24} y={py + 262} fill="#bbb" fontSize="8">{c.detail}</text>
                </g>
              ))}

              {/* Object */}
              <text x={MX} y={py + 310} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">OBJET</text>
              <text x={MX} y={py + 330} fill="#333" fontSize="10">{'Prestations de design — ' + (data.clientCompany || 'Client')}</text>
              <line x1={MX} y1={py + 348} x2={W - MX} y2={py + 348} stroke="#EAECF5" strokeWidth="1" />
            </g>)}

            {!page.isFirst && (<g>
              <rect x="0" y={py} width={W} height="6" fill="url(#sGrad)" />
              <text x={MX} y={py + 40} fill={accent} fontSize="15" fontWeight="800" letterSpacing="1">DEVIS</text>
              <text x={MX + 70} y={py + 40} fill="#bbb" fontSize="9">{data.quoteNumber}</text>
              <text x={W - MX} y={py + 40} textAnchor="end" fill="#ccc" fontSize="9">{'Page ' + (page.idx + 1) + '/' + totalPages}</text>
              <line x1={MX} y1={py + 55} x2={W - MX} y2={py + 55} stroke="#EAECF5" strokeWidth="1" />
            </g>)}

            {hasRows && (<g>
              <rect x={MX} y={tblY} width={W - MX * 2} height={TABLE_HEADER_H} rx="6" fill="#F0F1F8" />
              <text x={MX + 14} y={tblY + 19} fill="#888" fontSize="7.5" fontWeight="700" letterSpacing="1.5">DESIGNATION</text>
              <text x={535} y={tblY + 19} fill="#888" fontSize="7.5" fontWeight="700" textAnchor="end">QTE</text>
              <text x={625} y={tblY + 19} fill="#888" fontSize="7.5" fontWeight="700" textAnchor="end">P.U. HT</text>
              <text x={W - MX - 10} y={tblY + 19} fill="#888" fontSize="7.5" fontWeight="700" textAnchor="end">TOTAL</text>
            </g>)}

            {page.rowIndices.map((ii, li) => {
              const item = data.items[ii]; const cy = rowY; rowY += ROW_H; const lt = item.quantity * item.unitPrice;
              return (<g key={item.id}>
                {li % 2 === 1 && <rect x={MX} y={cy} width={W - MX * 2} height={ROW_H} fill="#F8F9FE" rx="4" />}
                <circle cx={MX + 9} cy={cy + ROW_H / 2} r="3" fill={accent} opacity="0.35" />
                <text x={MX + 20} y={cy + 22} fill="#333" fontSize="10">{truncate(item.description, 54)}</text>
                <text x={535} y={cy + 22} fill="#888" fontSize="10" textAnchor="end">{item.quantity}</text>
                <text x={625} y={cy + 22} fill="#888" fontSize="10" textAnchor="end">{fmt(item.unitPrice)}</text>
                <text x={W - MX - 10} y={cy + 22} fill="#222" fontSize="10" textAnchor="end" fontWeight="600">{fmt(lt)}</text>
              </g>);
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tblY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (<g>
                <rect x={W - MX - 250} y={bY} width="250" height="110" rx="12" fill="#fff" stroke="#EAECF5" strokeWidth="1" />
                <text x={W - MX - 230} y={bY + 28} fill="#888" fontSize="10">Sous-total HT</text>
                <text x={W - MX - 14} y={bY + 28} fill="#333" fontSize="10" textAnchor="end">{fmt(sub)}</text>
                <text x={W - MX - 230} y={bY + 50} fill="#888" fontSize="10">{'TVA ' + data.taxRate + '%'}</text>
                <text x={W - MX - 14} y={bY + 50} fill="#333" fontSize="10" textAnchor="end">{fmt(tax)}</text>
                <rect x={W - MX - 242} y={bY + 65} width="234" height="36" rx="8" fill="url(#sGrad)" />
                <text x={W - MX - 224} y={bY + 89} fill="#fff" fontSize="11" fontWeight="700">TOTAL TTC</text>
                <text x={W - MX - 16} y={bY + 89} fill="#fff" fontSize="16" fontWeight="800" textAnchor="end">{fmt(total)}</text>

                <text x={MX} y={bY + 10} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">CONDITIONS</text>
                <rect x={MX} y={bY + 16} width="4" height="16" rx="2" fill={accent} />
                {wrapLines(data.notes || '', 45).map((l, i) => <text key={i} x={MX + 14} y={bY + 32 + i * 14} fill="#888" fontSize="9">{l}</text>)}

                <text x={MX} y={bY + 130} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">SIGNATURES</text>
                <rect x={MX} y={bY + 148} width="240" height="80" rx="10" fill="#F0F1F8" />
                <text x={MX + 16} y={bY + 168} fill="#999" fontSize="9">Le Prestataire</text>
                {data.designerSignature ? (<>
                  <image href={data.designerSignature} x={MX + 16} y={bY + 174} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={MX + 16} y={bY + 220} fill="#bbb" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                </>) : <line x1={MX + 16} y1={bY + 210} x2={MX + 200} y2={bY + 210} stroke="#ddd" strokeWidth="0.5" />}
                <rect x={MX + 270} y={bY + 148} width="240" height="80" rx="10" fill="#F0F1F8" />
                <text x={MX + 286} y={bY + 168} fill="#999" fontSize="9">Le Client</text>
                {data.clientSignature ? (<>
                  <image href={data.clientSignature} x={MX + 286} y={bY + 174} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={MX + 286} y={bY + 220} fill="#bbb" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                </>) : <line x1={MX + 286} y1={bY + 210} x2={MX + 470} y2={bY + 210} stroke="#ddd" strokeWidth="0.5" />}
              </g>);
            })()}

            <g>
              <rect x="0" y={py + PH - 6} width={W} height="6" fill="url(#sGrad)" />
              <text x={MX} y={py + PH - 18} fill="#bbb" fontSize="7.5">{(data.designerName || '') + ' — ' + (data.designerEmail || '')}</text>
              <text x={W - MX} y={py + PH - 18} textAnchor="end" fill="#ccc" fontSize="7.5">{'Page ' + (page.idx + 1) + '/' + totalPages}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
