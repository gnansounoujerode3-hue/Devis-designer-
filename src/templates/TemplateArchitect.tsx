import React from 'react';
import { QuoteData, formatMoney } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 55;
const HEADER_FULL_H = 380, HEADER_CONT_H = 80, TABLE_HEADER_H = 30, ROW_H = 34, BOTTOM_H = 275;

function lighten(hex: string, f: number) { const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return `rgb(${Math.round(r+(255-r)*f)},${Math.round(g+(255-g)*f)},${Math.round(b+(255-b)*f)})`; }

export default function TemplateArchitect({ data, svgRef }: Props) {
  const accent = data.accentColor || '#10B981';
  const soft = lighten(accent, 0.9);
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
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%" style={{ fontFamily: `"${font}",Inter,system-ui,sans-serif` }}>
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tblY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tblY + TABLE_HEADER_H;
        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#FAFAFA" />

            {page.isFirst && (<g>
              {/* Top double line */}
              <rect x={MX} y={py + 30} width={W - MX * 2} height="2" fill={accent} />
              <rect x={MX} y={py + 36} width={W - MX * 2} height="0.5" fill={accent} opacity="0.3" />

              {/* Header row: DEVIS left, number + date right */}
              <text x={MX} y={py + 75} fill="#111" fontSize="28" fontWeight="800" letterSpacing="2">DEVIS</text>
              <text x={W - MX} y={py + 62} textAnchor="end" fill="#aaa" fontSize="8" letterSpacing="2">{data.quoteNumber || 'DEV-001'}</text>
              <text x={W - MX} y={py + 78} textAnchor="end" fill="#999" fontSize="9">{fDate(data.quoteDate)}</text>

              {/* Two info blocks side by side */}
              <rect x={MX} y={py + 100} width={(W - MX * 2 - 20) / 2} height="110" rx="8" fill={soft} />
              <text x={MX + 18} y={py + 122} fill={accent} fontSize="7" fontWeight="700" letterSpacing="2">EMETTEUR</text>
              <text x={MX + 18} y={py + 142} fill="#111" fontSize="12" fontWeight="700">{data.designerName || 'Designer'}</text>
              <text x={MX + 18} y={py + 158} fill="#888" fontSize="9">{data.designerTitle}</text>
              <text x={MX + 18} y={py + 176} fill="#999" fontSize="8.5">{data.designerEmail + ' · ' + data.designerPhone}</text>
              <text x={MX + 18} y={py + 192} fill="#bbb" fontSize="8">{truncate(data.designerAddress || '', 40)}</text>

              <rect x={MX + (W - MX * 2 - 20) / 2 + 20} y={py + 100} width={(W - MX * 2 - 20) / 2} height="110" rx="8" fill={soft} />
              <text x={MX + (W - MX * 2 - 20) / 2 + 38} y={py + 122} fill={accent} fontSize="7" fontWeight="700" letterSpacing="2">CLIENT</text>
              <text x={MX + (W - MX * 2 - 20) / 2 + 38} y={py + 142} fill="#111" fontSize="12" fontWeight="700">{data.clientName || 'Client'}</text>
              <text x={MX + (W - MX * 2 - 20) / 2 + 38} y={py + 158} fill="#888" fontSize="10">{data.clientCompany}</text>
              <text x={MX + (W - MX * 2 - 20) / 2 + 38} y={py + 176} fill="#999" fontSize="8.5">{data.clientEmail}</text>
              <text x={MX + (W - MX * 2 - 20) / 2 + 38} y={py + 192} fill="#bbb" fontSize="8">{truncate(data.clientAddress || '', 38)}</text>

              {/* Meta row: 3 blocks */}
              {[
                { label: 'EMISSION', val: fDate(data.quoteDate) },
                { label: 'VALIDITE', val: fDate(data.validUntil) },
                { label: 'MONTANT TTC', val: fmt(total), bold: true },
              ].map((m, i) => {
                const bx = MX + i * ((W - MX * 2) / 3 + 1);
                const bw = (W - MX * 2 - 8) / 3;
                return (<g key={i}>
                  <rect x={bx} y={py + 230} width={bw} height="44" rx="6" fill={m.bold ? accent : '#fff'} stroke={m.bold ? accent : '#E8E8E8'} strokeWidth="1" />
                  <text x={bx + 14} y={py + 248} fill={m.bold ? '#fff' : '#aaa'} fontSize="7" letterSpacing="1.5" fontWeight="600" opacity={m.bold ? 0.8 : 1}>{m.label}</text>
                  <text x={bx + 14} y={py + 265} fill={m.bold ? '#fff' : '#333'} fontSize={m.bold ? '13' : '10'} fontWeight={m.bold ? '800' : '600'}>{m.val}</text>
                </g>);
              })}

              {/* Objet */}
              <text x={MX} y={py + 312} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">OBJET</text>
              <text x={MX} y={py + 332} fill="#333" fontSize="10">{'Prestations de design — ' + (data.clientCompany || 'Client')}</text>
              <text x={MX} y={py + 352} fill="#ddd" fontSize="7.5">{'SIRET ' + (data.designerSiret || '')}</text>
              <rect x={MX} y={py + 370} width={W - MX * 2} height="0.5" fill="#E8E8E8" />
            </g>)}

            {!page.isFirst && (<g>
              <rect x={MX} y={py + 18} width={W - MX * 2} height="2" fill={accent} />
              <text x={MX} y={py + 45} fill="#111" fontSize="15" fontWeight="800" letterSpacing="2">DEVIS</text>
              <text x={MX + 65} y={py + 45} fill="#bbb" fontSize="9">{data.quoteNumber}</text>
              <text x={W - MX} y={py + 45} textAnchor="end" fill="#ccc" fontSize="9">{'Page ' + (page.idx + 1) + '/' + totalPages}</text>
              <rect x={MX} y={py + 58} width={W - MX * 2} height="0.5" fill="#E8E8E8" />
            </g>)}

            {hasRows && (<g>
              <rect x={MX} y={tblY} width={W - MX * 2} height={TABLE_HEADER_H} rx="6" fill="#111" />
              <text x={MX + 14} y={tblY + 19} fill="#fff" fontSize="7.5" fontWeight="700" letterSpacing="1.5">DESIGNATION</text>
              <text x={540} y={tblY + 19} fill="#fff" fontSize="7.5" fontWeight="700" textAnchor="end">QTE</text>
              <text x={630} y={tblY + 19} fill="#fff" fontSize="7.5" fontWeight="700" textAnchor="end">P.U. HT</text>
              <text x={W - MX - 8} y={tblY + 19} fill="#fff" fontSize="7.5" fontWeight="700" textAnchor="end">TOTAL</text>
            </g>)}

            {page.rowIndices.map((ii, li) => {
              const item = data.items[ii]; const cy = rowY; rowY += ROW_H; const lt = item.quantity * item.unitPrice;
              return (<g key={item.id}>
                {li % 2 === 0 && <rect x={MX} y={cy} width={W - MX * 2} height={ROW_H} fill={soft} rx="4" />}
                <rect x={MX + 4} y={cy + 10} width="3" height="13" rx="1.5" fill={accent} opacity="0.5" />
                <text x={MX + 16} y={cy + 22} fill="#333" fontSize="10">{truncate(item.description, 55)}</text>
                <text x={540} y={cy + 22} fill="#888" fontSize="10" textAnchor="end">{item.quantity}</text>
                <text x={630} y={cy + 22} fill="#888" fontSize="10" textAnchor="end">{fmt(item.unitPrice)}</text>
                <text x={W - MX - 8} y={cy + 22} fill="#111" fontSize="10" textAnchor="end" fontWeight="600">{fmt(lt)}</text>
              </g>);
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tblY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (<g>
                {/* Totals */}
                <rect x={W - MX - 240} y={bY} width="240" height="105" rx="8" fill={soft} />
                <text x={W - MX - 220} y={bY + 26} fill="#888" fontSize="10">Sous-total HT</text>
                <text x={W - MX - 12} y={bY + 26} fill="#333" fontSize="10" textAnchor="end">{fmt(sub)}</text>
                <text x={W - MX - 220} y={bY + 48} fill="#888" fontSize="10">{'TVA ' + data.taxRate + '%'}</text>
                <text x={W - MX - 12} y={bY + 48} fill="#333" fontSize="10" textAnchor="end">{fmt(tax)}</text>
                <rect x={W - MX - 232} y={bY + 64} width="224" height="34" rx="6" fill={accent} />
                <text x={W - MX - 215} y={bY + 86} fill="#fff" fontSize="11" fontWeight="700">TOTAL TTC</text>
                <text x={W - MX - 14} y={bY + 87} fill="#fff" fontSize="16" fontWeight="800" textAnchor="end">{fmt(total)}</text>

                {/* Conditions */}
                <text x={MX} y={bY + 10} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">CONDITIONS</text>
                <rect x={MX} y={bY + 16} width="20" height="2" fill={accent} />
                {wrapLines(data.notes || '', 48).map((l, i) => <text key={i} x={MX} y={bY + 36 + i * 14} fill="#888" fontSize="9">{l}</text>)}

                {/* Signatures */}
                <text x={MX} y={bY + 128} fill="#aaa" fontSize="7" letterSpacing="2" fontWeight="600">SIGNATURES</text>
                <rect x={MX} y={bY + 134} width="20" height="2" fill={accent} />
                <rect x={MX} y={bY + 150} width="270" height="80" rx="8" fill={soft} />
                <text x={MX + 16} y={bY + 168} fill="#999" fontSize="9" fontWeight="500">Le Prestataire</text>
                {data.designerSignature ? (<>
                  <image href={data.designerSignature} x={MX + 16} y={bY + 174} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={MX + 16} y={bY + 222} fill="#bbb" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                </>) : <line x1={MX + 16} y1={bY + 212} x2={MX + 210} y2={bY + 212} stroke={accent} strokeWidth="0.5" opacity="0.5" />}

                <rect x={MX + 295} y={bY + 150} width="270" height="80" rx="8" fill={soft} />
                <text x={MX + 311} y={bY + 168} fill="#999" fontSize="9" fontWeight="500">Le Client</text>
                {data.clientSignature ? (<>
                  <image href={data.clientSignature} x={MX + 311} y={bY + 174} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={MX + 311} y={bY + 222} fill="#bbb" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                </>) : <line x1={MX + 311} y1={bY + 212} x2={MX + 505} y2={bY + 212} stroke={accent} strokeWidth="0.5" opacity="0.5" />}
              </g>);
            })()}

            <g>
              <rect x={MX} y={py + PH - 38} width={W - MX * 2} height="2" fill={accent} />
              <rect x={MX} y={py + PH - 32} width={W - MX * 2} height="0.5" fill={accent} opacity="0.3" />
              <text x={MX} y={py + PH - 14} fill="#bbb" fontSize="7.5">{(data.designerName || '') + ' — ' + (data.designerEmail || '') + ' — ' + (data.designerPhone || '')}</text>
              <text x={W - MX} y={py + PH - 14} textAnchor="end" fill="#ccc" fontSize="7.5">{(page.idx + 1) + '/' + totalPages}</text>
            </g>
          </g>);
      })}
    </svg>
  );
}
