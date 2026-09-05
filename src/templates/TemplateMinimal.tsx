import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 70;
const HEADER_FULL_H = 310, HEADER_CONT_H = 70, TABLE_HEADER_H = 24, ROW_H = 36, BOTTOM_H = 260;
const DESC_MAX = 55;

export default function TemplateMinimal({ data, svgRef }: Props) {
  const accent = data.accentColor || '#333';
  const cc = data.currency || 'EUR';
  const font = data.fontFamily || 'Helvetica Neue';
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => {
    if (!d) return '--';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return d; }
  };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: `"${font}",'Helvetica Neue',Arial,sans-serif` }}>

      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#fff" />
            {data.showWatermark && (<g opacity="0.05"><text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text></g>)}

            {/* === FULL HEADER === */}
            {page.isFirst && (
              <g>
                <rect x={MX} y={py + 50} width="40" height="3" fill={accent} />
                <text x={MX} y={py + 95} fill="#111" fontSize="28" fontWeight="300" letterSpacing="6">DEVIS</text>
                <text x={MX} y={py + 130} fill="#999" fontSize="10" letterSpacing="1">
                  {(data.quoteNumber || 'DEV-2024-001') + ' / ' + fDate(data.quoteDate)}
                </text>
                <text x={W - MX} y={py + 130} textAnchor="end" fill="#bbb" fontSize="9">
                  {"Valide jusqu'au " + fDate(data.validUntil)}
                </text>

                <text x={MX} y={py + 175} fill="#bbb" fontSize="8" letterSpacing="2">DE</text>
                <text x={MX} y={py + 195} fill="#111" fontSize="13" fontWeight="500">{data.designerName || 'Designer'}</text>
                <text x={MX} y={py + 213} fill="#666" fontSize="10">{data.designerEmail || 'email@example.com'}</text>
                <text x={MX} y={py + 229} fill="#666" fontSize="10">{data.designerPhone || '+33 6 00 00 00 00'}</text>
                <text x={MX} y={py + 249} fill="#999" fontSize="9">{truncate(data.designerAddress || 'Adresse', 35)}</text>

                <text x={W / 2 + 30} y={py + 175} fill="#bbb" fontSize="8" letterSpacing="2">POUR</text>
                <text x={W / 2 + 30} y={py + 195} fill="#111" fontSize="13" fontWeight="500">{data.clientName || 'Client'}</text>
                <text x={W / 2 + 30} y={py + 213} fill="#666" fontSize="10">{data.clientCompany || 'Entreprise'}</text>
                <text x={W / 2 + 30} y={py + 229} fill="#666" fontSize="10">{data.clientEmail || 'client@email.com'}</text>
                <text x={W / 2 + 30} y={py + 249} fill="#999" fontSize="9">{truncate(data.clientAddress || 'Adresse', 35)}</text>

                <line x1={MX} y1={py + 280} x2={W - MX} y2={py + 280} stroke="#eee" strokeWidth="1" />
              </g>
            )}

            {/* === COMPACT HEADER === */}
            {!page.isFirst && (
              <g>
                <rect x={MX} y={py + 20} width="30" height="2" fill={accent} />
                <text x={MX} y={py + 40} fill="#111" fontSize="14" fontWeight="300" letterSpacing="4">DEVIS</text>
                <text x={W - MX} y={py + 40} textAnchor="end" fill="#ccc" fontSize="9">
                  {(data.quoteNumber || '') + ' - Page ' + (page.idx + 1) + ' / ' + totalPages}
                </text>
                <line x1={MX} y1={py + 52} x2={W - MX} y2={py + 52} stroke="#eee" strokeWidth="1" />
              </g>
            )}

            {/* === TABLE HEADER === */}
            {hasRows && (
              <g>
                <text x={MX} y={tableHeaderY + 15} fill="#bbb" fontSize="8" letterSpacing="1">PRESTATION</text>
                <text x={540} y={tableHeaderY + 15} fill="#bbb" fontSize="8" letterSpacing="1" textAnchor="end">QTE</text>
                <text x={620} y={tableHeaderY + 15} fill="#bbb" fontSize="8" letterSpacing="1" textAnchor="end">PRIX</text>
                <text x={W - MX} y={tableHeaderY + 15} fill="#bbb" fontSize="8" letterSpacing="1" textAnchor="end">TOTAL</text>
                <line x1={MX} y1={tableHeaderY + TABLE_HEADER_H} x2={W - MX} y2={tableHeaderY + TABLE_HEADER_H} stroke="#eee" strokeWidth="1" />
              </g>
            )}

            {/* === ROWS === */}
            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              void localIdx;
              return (
                <g key={item.id}>
                  <text x={MX} y={curRowY + 22} fill="#333" fontSize="10.5">{truncate(item.description, DESC_MAX)}</text>
                  <text x={540} y={curRowY + 22} fill="#666" fontSize="10.5" textAnchor="end">{item.quantity}</text>
                  <text x={620} y={curRowY + 22} fill="#666" fontSize="10.5" textAnchor="end">{fmt(item.unitPrice)}</text>
                  <text x={W - MX} y={curRowY + 22} fill="#111" fontSize="10.5" textAnchor="end" fontWeight="500">{fmt(lt)}</text>
                  <line x1={MX} y1={curRowY + ROW_H - 4} x2={W - MX} y2={curRowY + ROW_H - 4} stroke="#f5f5f5" strokeWidth="1" />
                </g>
              );
            })}

            {/* === BOTTOM SECTION === */}
            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (
                <g>
                  <text x={620} y={bY} fill="#999" fontSize="10" textAnchor="end">Sous-total</text>
                  <text x={W - MX} y={bY} fill="#333" fontSize="10" textAnchor="end">{fmt(sub)}</text>
                  <text x={620} y={bY + 22} fill="#999" fontSize="10" textAnchor="end">{'TVA ' + data.taxRate + '%'}</text>
                  <text x={W - MX} y={bY + 22} fill="#333" fontSize="10" textAnchor="end">{fmt(tax)}</text>
                  <line x1={550} y1={bY + 35} x2={W - MX} y2={bY + 35} stroke="#111" strokeWidth="1" />
                  <text x={620} y={bY + 58} fill="#111" fontSize="12" fontWeight="600" textAnchor="end">Total TTC</text>
                  <text x={W - MX} y={bY + 58} fill="#111" fontSize="16" fontWeight="600" textAnchor="end">{fmt(total)}</text>

                  <text x={MX} y={bY + 100} fill="#bbb" fontSize="8" letterSpacing="1">CONDITIONS</text>
                  {wrapLines(data.notes || 'Acompte de 30% a la signature.', 60).map((l, i) => (
                    <text key={i} x={MX} y={bY + 118 + i * 14} fill="#999" fontSize="9">{l}</text>
                  ))}

                  <text x={MX} y={bY + 190} fill="#bbb" fontSize="8" letterSpacing="1">SIGNATURES</text>
                  <text x={MX} y={bY + 210} fill="#ccc" fontSize="8">Prestataire</text>
                  {data.designerSignature ? (<>
                    <image href={data.designerSignature} x={MX} y={bY + 216} width="120" height="36" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX} y={bY + 260} fill="#ddd" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                  </>) : <line x1={MX} y1={bY + 240} x2={MX + 180} y2={bY + 240} stroke="#ddd" strokeWidth="0.5" />}
                  <text x={MX + 250} y={bY + 210} fill="#ccc" fontSize="8">Client</text>
                  {data.clientSignature ? (<>
                    <image href={data.clientSignature} x={MX + 250} y={bY + 216} width="120" height="36" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 250} y={bY + 260} fill="#ddd" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                  </>) : <line x1={MX + 250} y1={bY + 240} x2={MX + 430} y2={bY + 240} stroke="#ddd" strokeWidth="0.5" />}
                </g>
              );
            })()}

            <g>
              <line x1={MX} y1={py + PH - 50} x2={W - MX} y2={py + PH - 50} stroke="#f0f0f0" strokeWidth="1" />
              <text x={MX} y={py + PH - 30} fill="#ccc" fontSize="8">{(data.designerName || '') + ' · ' + (data.designerEmail || '') + ' · SIRET ' + (data.designerSiret || '')}</text>
              <text x={W - MX} y={py + PH - 30} textAnchor="end" fill="#ddd" fontSize="8">{'Page ' + (page.idx + 1) + ' / ' + totalPages}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
