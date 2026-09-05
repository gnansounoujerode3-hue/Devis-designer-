import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines } from '../lib/paginate';
import { useWhiteSignatures } from '../lib/whiteSignature';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 220, HEADER_CONT_H = 100, TABLE_HEADER_H = 36, ROW_H = 45, BOTTOM_H = 300;
const COL_DESC = MX + 20;
const COL_PRICE = W / 2 + 50;
const COL_QTY = W / 2 + 150;
const COL_TOTAL = W - MX - 20;
const DESC_MAX = 45;

export default function TemplateCorporate({ data, svgRef }: Props) {
  const accent = data.accentColor || '#F28C28'; // Orange par défaut
  const bgColor = '#161616'; // Gris très sombre / Noir
  /* Signatures en encre blanche (papier sombre — encre noire illisible). */
  const whiteSigs = useWhiteSignatures(data.designerSignature, data.clientSignature);
  const cc = data.currency || 'USD';
  const fontSans = data.fontFamily || 'Montserrat, sans-serif';
  
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { return d; } };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: fontSans, backgroundColor: bgColor }}>
      
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            {/* Arrière-plan sombre */}
            <rect x="0" y={py} width={W} height={PH} fill={bgColor} />

            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                {/* LOGO ou Placeholder */}
                {data.designerLogo ? (
                  <image href={data.designerLogo} x={MX} y={py + 60} width="120" height="40" preserveAspectRatio="xMinYMin meet" />
                ) : (
                  <text x={MX} y={py + 85} fill="#FFFFFF" fontSize="14" fontWeight="700" letterSpacing="1">LOGO HERE</text>
                )}

                {/* Infos Prestataire (Gauche) */}
                <text x={MX} y={py + 150} fill={accent} fontSize="12" fontWeight="800">{data.designerName || 'NAME SURNAME'}</text>
                <text x={MX} y={py + 168} fill="#E0E0E0" fontSize="10">{data.designerPhone || '123 456 789 00'}</text>
                <text x={MX} y={py + 182} fill="#E0E0E0" fontSize="10">{data.designerEmail || 'nameyourmail.com'}</text>

                {/* Titre INVOICE et Détails (Droite) */}
                <text x={W - MX} y={py + 140} textAnchor="end" fill={accent} fontSize="38" fontWeight="800" letterSpacing="1">INVOICE</text>
                <text x={W - MX} y={py + 168} textAnchor="end" fill="#FFFFFF" fontSize="10">Invoice No: {data.quoteNumber || '000011220'}</text>
                <text x={W - MX} y={py + 182} textAnchor="end" fill="#FFFFFF" fontSize="10">Date: {fDate(data.quoteDate)}</text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill={accent} fontSize="30" fontWeight="800">INVOICE</text>
                <text x={W - MX} y={py + 60} textAnchor="end" fill="#E0E0E0" fontSize="10">Page {page.idx + 1} of {totalPages}</text>
              </g>
            )}

            {/* En-tête du Tableau */}
            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - 2 * MX} height={TABLE_HEADER_H} fill={accent} />
                <text x={COL_DESC} y={tableHeaderY + 22} fill="#111111" fontSize="10" fontWeight="800" letterSpacing="0.5">DESCRIPTION</text>
                <text x={COL_PRICE} y={tableHeaderY + 22} fill="#111111" fontSize="10" fontWeight="800" letterSpacing="0.5" textAnchor="middle">PRICE</text>
                <text x={COL_QTY} y={tableHeaderY + 22} fill="#111111" fontSize="10" fontWeight="800" letterSpacing="0.5" textAnchor="middle">QTY</text>
                <text x={COL_TOTAL} y={tableHeaderY + 22} fill="#111111" fontSize="10" fontWeight="800" letterSpacing="0.5" textAnchor="end">AMOUNT</text>
              </g>
            )}

            {/* Lignes du Tableau */}
            {page.rowIndices.map((itemIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  <text x={COL_DESC} y={curRowY + 26} fill="#FFFFFF" fontSize="11">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_PRICE} y={curRowY + 26} fill="#FFFFFF" fontSize="11" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_QTY} y={curRowY + 26} fill="#FFFFFF" fontSize="11" textAnchor="middle">{item.quantity}</text>
                  <text x={COL_TOTAL} y={curRowY + 26} fill="#FFFFFF" fontSize="11" textAnchor="end">{fmt(lt)}</text>
                  {/* Ligne séparatrice orange avec opacité */}
                  <line x1={MX} y1={curRowY + ROW_H - 12} x2={W - MX} y2={curRowY + ROW_H - 12} stroke={accent} strokeWidth="1" strokeOpacity="0.3" />
                </g>
              );
            })}

            {/* Section Bas de page */}
            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 30 : py + headerH + 30;
              return (
                <g>
                  {/* Gauche: Terms & Conditions (Remonté) */}
                  <text x={MX} y={bY + 15} fill={accent} fontSize="11" fontWeight="700">TERMS &amp; CONDITIONS:</text>
                  {wrapLines(data.notes || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed et magna augue. Donec a ipsum porta, scelerisque dui et.', 45).map((l, i) => (
                    <text key={'tc'+i} x={MX} y={bY + 35 + i * 14} fill="#A0A0A0" fontSize="9">{l}</text>
                  ))}

                  {/* Droite: Totaux */}
                  <text x={W - MX - 100} y={bY + 5} textAnchor="end" fill="#FFFFFF" fontSize="10" fontWeight="600">SUBTOTAL :</text>
                  <text x={W - MX - 20} y={bY + 5} textAnchor="end" fill="#FFFFFF" fontSize="11" fontWeight="700">{fmt(sub)}</text>
                  
                  <text x={W - MX - 100} y={bY + 25} textAnchor="end" fill="#FFFFFF" fontSize="10" fontWeight="600">TAX :</text>
                  <text x={W - MX - 20} y={bY + 25} textAnchor="end" fill="#FFFFFF" fontSize="11" fontWeight="700">{fmt(tax)}</text>
                  
                  <line x1={W - MX - 170} y1={bY + 40} x2={W - MX} y2={bY + 40} stroke="#555" strokeWidth="1" />
                  
                  {/* Boîte TOTAL */}
                  <rect x={W - MX - 150} y={bY + 50} width="150" height="28" fill={accent} />
                  <text x={W - MX - 90} y={bY + 68} textAnchor="end" fill="#111111" fontSize="10" fontWeight="800">TOTAL :</text>
                  <text x={W - MX - 20} y={bY + 69} textAnchor="end" fill="#111111" fontSize="12" fontWeight="800">{fmt(total)}</text>

                  {/* Signatures & Contacts (En bas) */}
                  <g transform={`translate(0, ${bY + 130})`}>
                    {/* Provider Signature */}
                    <text x={MX + 60} y="0" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Provider Signature</text>
                    {data.designerSignature && whiteSigs.designer && <image href={whiteSigs.designer} x={MX} y="10" width="120" height="35" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={MX} y1="55" x2={MX + 120} y2="55" stroke="#555" strokeWidth="1" />

                    {/* Client Signature */}
                    <text x={MX + 240} y="0" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Client Signature</text>
                    {data.clientSignature && whiteSigs.client && <image href={whiteSigs.client} x={MX + 180} y="10" width="120" height="35" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={MX + 180} y1="55" x2={MX + 300} y2="55" stroke="#555" strokeWidth="1" />

                    {/* Contacts (Aligné à droite) */}
                    <text x={W - MX} y="41" textAnchor="end" fill="#E0E0E0" fontSize="10">{data.designerPhone || '123 456 789 09'}</text>
                    <text x={W - MX} y="55" textAnchor="end" fill="#E0E0E0" fontSize="10">{data.designerEmail || 'nameyourmail.com'}</text>
                  </g>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
