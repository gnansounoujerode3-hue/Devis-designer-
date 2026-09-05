import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 50;
const HEADER_FULL_H = 470, HEADER_CONT_H = 80, TABLE_HEADER_H = 40, ROW_H = 38, BOTTOM_H = 290;
const DESC_MAX = 50;

function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r + (255 - r) * factor)},${Math.round(g + (255 - g) * factor)},${Math.round(b + (255 - b) * factor)})`;
}

export default function TemplateCreative({ data, svgRef }: Props) {
  const accent = data.accentColor || '#8B5CF6';
  const accentLight = lighten(accent, 0.85);
  const cc = data.currency || 'EUR';
  const font = data.fontFamily || 'Poppins';
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: `"${font}",Poppins,sans-serif` }}>

      <defs>
        <filter id="cShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" floodOpacity="0.08" />
        </filter>
      </defs>

      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#FAFAFA" />
            {data.showWatermark && (<g opacity="0.06"><text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text></g>)}
            {/* Decorative bg shapes */}
            <circle cx="-50" cy={py + 150} r="250" fill={accentLight} opacity="0.25" />
            <circle cx={W + 80} cy={py + PH - 200} r="300" fill={accentLight} opacity="0.15" />
            <rect x={W - 200} y={py} width="200" height="12" fill={accent} />
            <rect x="0" y={py + PH - 12} width="300" height="12" fill={accent} />
            <polygon points={`${W - 120},${py} ${W},${py} ${W},${py + 120}`} fill={accent} opacity="0.1" />

            {/* === FULL HEADER === */}
            {page.isFirst && (
              <g>
                <text x={MX} y={py + 75} fill={accent} fontSize="48" fontWeight="700">devis</text>
                <circle cx={MX + 145} cy={py + 63} r="8" fill={accent} />
                <text x={MX} y={py + 105} fill="#888" fontSize="11" letterSpacing="3">
                  {'N\u00B0 ' + (data.quoteNumber || 'DEV-2024-001')}
                </text>

                <rect x={W - MX - 150} y={py + 50} width="150" height="50" rx="25" fill={accent} />
                <text x={W - MX - 75} y={py + 70} fill="#fff" fontSize="9" textAnchor="middle" opacity="0.8">CREE LE</text>
                <text x={W - MX - 75} y={py + 87} fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">{fDate(data.quoteDate)}</text>

                {/* Emitter card */}
                <rect x={MX} y={py + 140} width="320" height="140" rx="20" fill="#fff" filter="url(#cShadow)" />
                {data.designerLogo ? (
                  <image href={data.designerLogo} x={MX + 15} y={py + 160} width="50" height="50" preserveAspectRatio="xMidYMid meet" />
                ) : (<>
                  <circle cx={MX + 40} cy={py + 185} r="25" fill={accent} />
                  <text x={MX + 40} y={py + 190} fill="#fff" fontSize="18" fontWeight="700" textAnchor="middle" dominantBaseline="central">
                    {(data.designerName || 'D').charAt(0).toUpperCase()}
                  </text>
                </>)}
                <text x={MX + 80} y={py + 178} fill="#333" fontSize="13" fontWeight="600">{data.designerName || 'Designer'}</text>
                <text x={MX + 80} y={py + 196} fill="#888" fontSize="10">{data.designerTitle || 'Designer Graphique'}</text>
                <text x={MX + 25} y={py + 225} fill="#666" fontSize="9">{data.designerEmail || 'email@example.com'}</text>
                <text x={MX + 25} y={py + 241} fill="#666" fontSize="9">{data.designerPhone || '+33 6 00 00 00 00'}</text>
                <text x={MX + 25} y={py + 257} fill="#999" fontSize="8">{truncate(data.designerAddress || 'Adresse', 40)}</text>

                {/* Client card */}
                <rect x={W - MX - 320} y={py + 140} width="320" height="140" rx="20" fill="#fff" filter="url(#cShadow)" />
                <rect x={W - MX - 310} y={py + 155} width="8" height="40" rx="4" fill={accent} />
                <text x={W - MX - 290} y={py + 175} fill={accent} fontSize="9" fontWeight="600" letterSpacing="1">CLIENT</text>
                <text x={W - MX - 290} y={py + 195} fill="#333" fontSize="13" fontWeight="600">{data.clientName || 'Client'}</text>
                <text x={W - MX - 290} y={py + 213} fill="#666" fontSize="10">{data.clientCompany || 'Entreprise'}</text>
                <text x={W - MX - 290} y={py + 238} fill="#666" fontSize="9">{data.clientEmail || 'client@email.com'}</text>
                <text x={W - MX - 290} y={py + 254} fill="#999" fontSize="9">{truncate(data.clientAddress || 'Adresse client', 38)}</text>

                {/* Valid until badge */}
                <rect x={MX} y={py + 310} width="210" height="36" rx="18" fill={accentLight} />
                <text x={MX + 105} y={py + 332} fill={accent} fontSize="10" fontWeight="500" textAnchor="middle">
                  {"Valide jusqu'au " + fDate(data.validUntil)}
                </text>

                {/* Object */}
                <rect x={MX} y={py + 380} width="8" height="40" rx="4" fill={accent} />
                <text x={MX + 25} y={py + 398} fill={accent} fontSize="9" fontWeight="600" letterSpacing="1">OBJET</text>
                <text x={MX + 25} y={py + 418} fill="#333" fontSize="11">
                  {'Prestations de design - ' + (data.clientCompany || 'Client')}
                </text>
              </g>
            )}

            {/* === COMPACT HEADER === */}
            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 40} fill={accent} fontSize="22" fontWeight="700">devis</text>
                <circle cx={MX + 72} cy={py + 33} r="4" fill={accent} />
                <text x={MX + 90} y={py + 40} fill="#888" fontSize="9" letterSpacing="1">{data.quoteNumber || ''}</text>
                <text x={W - MX} y={py + 40} textAnchor="end" fill="#bbb" fontSize="9">{'Page ' + (page.idx + 1) + ' / ' + totalPages}</text>
                <line x1={MX} y1={py + 55} x2={W - MX} y2={py + 55} stroke={accentLight} strokeWidth="2" />
              </g>
            )}

            {/* === TABLE HEADER === */}
            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - MX * 2} height={TABLE_HEADER_H} rx="10" fill={accent} />
                <text x={MX + 20} y={tableHeaderY + 26} fill="#fff" fontSize="9" fontWeight="600" letterSpacing="1">PRESTATION</text>
                <text x={540} y={tableHeaderY + 26} fill="#fff" fontSize="9" fontWeight="600" textAnchor="middle">QTE</text>
                <text x={620} y={tableHeaderY + 26} fill="#fff" fontSize="9" fontWeight="600" textAnchor="middle">PRIX</text>
                <text x={W - MX - 20} y={tableHeaderY + 26} fill="#fff" fontSize="9" fontWeight="600" textAnchor="end">TOTAL</text>
              </g>
            )}

            {/* === ROWS === */}
            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  <rect x={MX} y={curRowY} width={W - MX * 2} height={ROW_H} rx="8" fill={localIdx % 2 === 0 ? '#fff' : '#FAFAFA'} />
                  <circle cx={MX + 18} cy={curRowY + ROW_H / 2} r="4" fill={accent} opacity="0.5" />
                  <text x={MX + 35} y={curRowY + 24} fill="#333" fontSize="10">{truncate(item.description, DESC_MAX)}</text>
                  <text x={540} y={curRowY + 24} fill="#666" fontSize="10" textAnchor="middle">{item.quantity}</text>
                  <text x={620} y={curRowY + 24} fill="#666" fontSize="10" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={W - MX - 20} y={curRowY + 24} fill="#333" fontSize="10" fontWeight="600" textAnchor="end">{fmt(lt)}</text>
                </g>
              );
            })}

            {/* === BOTTOM SECTION === */}
            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (
                <g>
                  {/* Totals card */}
                  <rect x={W - MX - 260} y={bY} width="260" height="115" rx="15" fill="#fff" filter="url(#cShadow)" />
                  <text x={W - MX - 240} y={bY + 30} fill="#888" fontSize="10">Sous-total HT</text>
                  <text x={W - MX - 20} y={bY + 30} fill="#333" fontSize="10" textAnchor="end">{fmt(sub)}</text>
                  <text x={W - MX - 240} y={bY + 52} fill="#888" fontSize="10">{'TVA (' + data.taxRate + '%)'}</text>
                  <text x={W - MX - 20} y={bY + 52} fill="#333" fontSize="10" textAnchor="end">{fmt(tax)}</text>
                  <line x1={W - MX - 240} y1={bY + 65} x2={W - MX - 20} y2={bY + 65} stroke="#eee" strokeWidth="1" />
                  <rect x={W - MX - 250} y={bY + 75} width="240" height="32" rx="8" fill={accent} />
                  <text x={W - MX - 230} y={bY + 96} fill="#fff" fontSize="11" fontWeight="600">TOTAL TTC</text>
                  <text x={W - MX - 25} y={bY + 97} fill="#fff" fontSize="15" fontWeight="700" textAnchor="end">{fmt(total)}</text>

                  {/* Conditions */}
                  <rect x={MX} y={bY} width="8" height="30" rx="4" fill={accent} />
                  <text x={MX + 25} y={bY + 12} fill={accent} fontSize="9" fontWeight="600" letterSpacing="1">CONDITIONS</text>
                  {wrapLines(data.notes || 'Acompte de 30% a la signature.', 42).map((l, i) => (
                    <text key={i} x={MX + 25} y={bY + 32 + i * 14} fill="#888" fontSize="9">{l}</text>
                  ))}

                  {/* Signatures */}
                  <rect x={MX} y={bY + 130} width="8" height="30" rx="4" fill={accent} />
                  <text x={MX + 25} y={bY + 142} fill={accent} fontSize="9" fontWeight="600" letterSpacing="1">SIGNATURES</text>
                  <rect x={MX + 25} y={bY + 162} width="240" height="80" rx="12" fill={accentLight} />
                  <text x={MX + 45} y={bY + 178} fill={accent} fontSize="9" fontWeight="500">Le Prestataire</text>
                  {data.designerSignature ? (<>
                    <image href={data.designerSignature} x={MX + 45} y={bY + 184} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 45} y={bY + 232} fill="#999" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                  </>) : <line x1={MX + 45} y1={bY + 222} x2={MX + 220} y2={bY + 222} stroke={accent} strokeWidth="0.5" opacity="0.5" />}

                  <rect x={MX + 285} y={bY + 162} width="240" height="80" rx="12" fill={accentLight} />
                  <text x={MX + 305} y={bY + 178} fill={accent} fontSize="9" fontWeight="500">Le Client</text>
                  {data.clientSignature ? (<>
                    <image href={data.clientSignature} x={MX + 305} y={bY + 184} width="110" height="36" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 305} y={bY + 232} fill="#999" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                  </>) : <line x1={MX + 305} y1={bY + 222} x2={MX + 480} y2={bY + 222} stroke={accent} strokeWidth="0.5" opacity="0.5" />}
                </g>
              );
            })()}

            <g>
              <text x={W/2} y={py + PH - 28} fill="#bbb" fontSize="8" textAnchor="middle">
                {(data.designerName || '') + ' · ' + (data.designerEmail || '') + ' · ' + (data.designerPhone || '')}
              </text>
              <text x={W - MX} y={py + PH - 28} textAnchor="end" fill="#ccc" fontSize="8">{'Page ' + (page.idx + 1) + ' / ' + totalPages}</text>
              <circle cx={W / 2 - 80} cy={py + PH - 31} r="2" fill={accent} opacity="0.5" />
              <circle cx={W / 2 + 80} cy={py + PH - 31} r="2" fill={accent} opacity="0.5" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
