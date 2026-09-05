import React from 'react';
import { QuoteData, formatMoney } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 60;
const HEADER_FULL_H = 420, HEADER_CONT_H = 90, TABLE_HEADER_H = 28, ROW_H = 33, BOTTOM_H = 280;

export default function TemplateClassic({ data, svgRef }: Props) {
  const accent = data.accentColor || '#C8102E';
  const cc = data.currency || 'EUR';
  const font = data.fontFamily || 'Georgia';
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%" style={{ fontFamily: `"${font}",Georgia,serif` }}>
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tblY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tblY + TABLE_HEADER_H;
        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#fff" />

            {page.isFirst && (<g>
              {/* Accent strip left */}
              <rect x="0" y={py} width="8" height="200" fill={accent} />
              {/* Title block */}
              <text x={MX + 20} y={py + 65} fill="#111" fontSize="42" fontWeight="400" fontStyle="italic">Devis</text>
              <text x={MX + 20} y={py + 88} fill="#aaa" fontSize="10" letterSpacing="3">{data.quoteNumber || 'DEV-001'}</text>

              {/* Right corner — logo or initial */}
              {data.designerLogo ? (
                <image href={data.designerLogo} x={W - MX - 78} y={py + 27} width="76" height="76" preserveAspectRatio="xMidYMid meet" />
              ) : (<>
                <circle cx={W - MX - 40} cy={py + 65} r="38" fill={accent} />
                <text x={W - MX - 40} y={py + 72} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="26" fontWeight="400" fontStyle="italic">
                  {(data.designerName || 'D').charAt(0)}
                </text>
              </>)}

              {/* Thin rule */}
              <line x1={MX + 20} y1={py + 110} x2={W - MX - 20} y2={py + 110} stroke="#E8E8E8" strokeWidth="1" />

              {/* Dates */}
              <text x={MX + 20} y={py + 135} fill="#999" fontSize="9">{'Emis le ' + fDate(data.quoteDate)}</text>
              <text x={W - MX - 20} y={py + 135} textAnchor="end" fill="#999" fontSize="9">{"Valide jusqu'au " + fDate(data.validUntil)}</text>

              {/* Emitter */}
              <rect x={MX + 20} y={py + 160} width="3" height="90" rx="1.5" fill={accent} />
              <text x={MX + 35} y={py + 178} fill={accent} fontSize="8" letterSpacing="2" fontWeight="600">EMETTEUR</text>
              <text x={MX + 35} y={py + 198} fill="#222" fontSize="12" fontWeight="600">{data.designerName || 'Designer'}</text>
              <text x={MX + 35} y={py + 214} fill="#888" fontSize="9" fontStyle="italic">{data.designerTitle}</text>
              <text x={MX + 35} y={py + 232} fill="#999" fontSize="9">{data.designerEmail + ' · ' + data.designerPhone}</text>
              <text x={MX + 35} y={py + 246} fill="#bbb" fontSize="8">{truncate(data.designerAddress || '', 42)}</text>

              {/* Client */}
              <rect x={W / 2 + 10} y={py + 160} width="3" height="90" rx="1.5" fill={accent} />
              <text x={W / 2 + 25} y={py + 178} fill={accent} fontSize="8" letterSpacing="2" fontWeight="600">DESTINATAIRE</text>
              <text x={W / 2 + 25} y={py + 198} fill="#222" fontSize="12" fontWeight="600">{data.clientName || 'Client'}</text>
              <text x={W / 2 + 25} y={py + 214} fill="#888" fontSize="10">{data.clientCompany}</text>
              <text x={W / 2 + 25} y={py + 232} fill="#999" fontSize="9">{data.clientEmail}</text>
              <text x={W / 2 + 25} y={py + 246} fill="#bbb" fontSize="8">{truncate(data.clientAddress || '', 38)}</text>

              <line x1={MX + 20} y1={py + 280} x2={W - MX - 20} y2={py + 280} stroke="#E8E8E8" strokeWidth="1" />

              {/* Objet */}
              <text x={MX + 20} y={py + 310} fill={accent} fontSize="8" letterSpacing="2" fontWeight="600">OBJET</text>
              <text x={MX + 20} y={py + 332} fill="#444" fontSize="10" fontStyle="italic">
                {'Prestations de design — ' + (data.clientCompany || 'Client')}
              </text>

              {/* SIRET subtle */}
              <text x={MX + 20} y={py + 365} fill="#ddd" fontSize="7.5">{'SIRET ' + (data.designerSiret || '')}</text>

              <line x1={MX + 20} y1={py + 395} x2={W - MX - 20} y2={py + 395} stroke="#E8E8E8" strokeWidth="1" />
            </g>)}

            {!page.isFirst && (<g>
              <rect x="0" y={py} width="8" height="60" fill={accent} />
              <text x={MX + 20} y={py + 40} fill="#111" fontSize="18" fontWeight="400" fontStyle="italic">Devis</text>
              <text x={MX + 80} y={py + 40} fill="#bbb" fontSize="9">{data.quoteNumber}</text>
              <text x={W - MX - 20} y={py + 40} textAnchor="end" fill="#ccc" fontSize="9">{'Page ' + (page.idx + 1) + '/' + totalPages}</text>
              <line x1={MX + 20} y1={py + 60} x2={W - MX - 20} y2={py + 60} stroke="#E8E8E8" strokeWidth="1" />
            </g>)}

            {hasRows && (<g>
              <line x1={MX + 20} y1={tblY + TABLE_HEADER_H} x2={W - MX - 20} y2={tblY + TABLE_HEADER_H} stroke={accent} strokeWidth="1.5" />
              <text x={MX + 20} y={tblY + 18} fill={accent} fontSize="7.5" letterSpacing="1.5" fontWeight="600">DESIGNATION</text>
              <text x={540} y={tblY + 18} fill={accent} fontSize="7.5" letterSpacing="1.5" textAnchor="end">QTE</text>
              <text x={625} y={tblY + 18} fill={accent} fontSize="7.5" letterSpacing="1.5" textAnchor="end">P.U. HT</text>
              <text x={W - MX - 20} y={tblY + 18} fill={accent} fontSize="7.5" letterSpacing="1.5" textAnchor="end">TOTAL</text>
            </g>)}

            {page.rowIndices.map((ii, li) => {
              const item = data.items[ii]; const cy = rowY; rowY += ROW_H; const lt = item.quantity * item.unitPrice;
              return (<g key={item.id}>
                <line x1={MX + 20} y1={cy + ROW_H} x2={W - MX - 20} y2={cy + ROW_H} stroke="#F0F0F0" strokeWidth="0.5" />
                <text x={MX + 20} y={cy + 21} fill="#333" fontSize="10">{truncate(item.description, 55)}</text>
                <text x={540} y={cy + 21} fill="#888" fontSize="10" textAnchor="end">{item.quantity}</text>
                <text x={625} y={cy + 21} fill="#888" fontSize="10" textAnchor="end">{fmt(item.unitPrice)}</text>
                <text x={W - MX - 20} y={cy + 21} fill="#222" fontSize="10" textAnchor="end" fontWeight="600">{fmt(lt)}</text>
                {li === 0 && void li}
              </g>);
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tblY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (<g>
                <line x1={MX + 20} y1={bY - 5} x2={W - MX - 20} y2={bY - 5} stroke={accent} strokeWidth="1.5" />

                <text x={600} y={bY + 20} fill="#999" fontSize="10" textAnchor="end">Sous-total HT</text>
                <text x={W - MX - 20} y={bY + 20} fill="#333" fontSize="10" textAnchor="end">{fmt(sub)}</text>
                <text x={600} y={bY + 42} fill="#999" fontSize="10" textAnchor="end">{'TVA ' + data.taxRate + '%'}</text>
                <text x={W - MX - 20} y={bY + 42} fill="#333" fontSize="10" textAnchor="end">{fmt(tax)}</text>
                <line x1={520} y1={bY + 55} x2={W - MX - 20} y2={bY + 55} stroke={accent} strokeWidth="0.5" />
                <text x={600} y={bY + 78} fill={accent} fontSize="14" fontWeight="400" fontStyle="italic" textAnchor="end">Total TTC</text>
                <text x={W - MX - 20} y={bY + 78} fill="#111" fontSize="18" fontWeight="600" textAnchor="end">{fmt(total)}</text>

                <rect x={MX + 20} y={bY + 105} width="3" height="40" rx="1.5" fill={accent} />
                <text x={MX + 35} y={bY + 118} fill={accent} fontSize="8" letterSpacing="2" fontWeight="600">CONDITIONS</text>
                {wrapLines(data.notes || '', 55).map((l, i) => <text key={i} x={MX + 35} y={bY + 136 + i * 14} fill="#888" fontSize="9">{l}</text>)}

                <text x={MX + 20} y={bY + 200} fill={accent} fontSize="8" letterSpacing="2" fontWeight="600">SIGNATURES</text>
                <text x={MX + 20} y={bY + 218} fill={accent} fontSize="8" fontStyle="italic">Le Prestataire</text>
                {data.designerSignature ? (<>
                  <image href={data.designerSignature} x={MX + 20} y={bY + 224} width="120" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={MX + 20} y={bY + 268} fill="#bbb" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                </>) : (<>
                  <line x1={MX + 20} y1={bY + 248} x2={MX + 240} y2={bY + 248} stroke="#ddd" strokeWidth="0.5" />
                  <text x={MX + 20} y={bY + 262} fill="#ccc" fontSize="7">Date et Signature</text>
                </>)}
                <text x={W / 2 + 30} y={bY + 218} fill={accent} fontSize="8" fontStyle="italic">Le Client</text>
                {data.clientSignature ? (<>
                  <image href={data.clientSignature} x={W / 2 + 30} y={bY + 224} width="120" height="36" preserveAspectRatio="xMidYMid meet" />
                  <text x={W / 2 + 30} y={bY + 268} fill="#bbb" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                </>) : (<>
                  <line x1={W / 2 + 30} y1={bY + 248} x2={W - MX - 20} y2={bY + 248} stroke="#ddd" strokeWidth="0.5" />
                  <text x={W / 2 + 30} y={bY + 262} fill="#ccc" fontSize="7">Date et Signature</text>
                </>)}
              </g>);
            })()}

            <g>
              <line x1={MX + 20} y1={py + PH - 40} x2={W - MX - 20} y2={py + PH - 40} stroke="#E8E8E8" strokeWidth="0.5" />
              <text x={MX + 20} y={py + PH - 20} fill="#ccc" fontSize="7.5">{(data.designerName || '') + ' · ' + (data.designerEmail || '') + ' · ' + (data.designerPhone || '')}</text>
              <text x={W - MX - 20} y={py + PH - 20} textAnchor="end" fill="#ddd" fontSize="7.5">{(page.idx + 1) + '/' + totalPages}</text>
              <rect x="0" y={py + PH - 4} width="8" height="4" fill={accent} />
            </g>
          </g>);
      })}
    </svg>
  );
}
