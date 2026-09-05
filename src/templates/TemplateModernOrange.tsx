import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 380, HEADER_CONT_H = 150, TABLE_HEADER_H = 36, ROW_H = 40, BOTTOM_H = 350;
const COL_DESC = MX + 20;
const COL_RATE = W / 2 + 50;
const COL_QTY = W / 2 + 150;
const COL_TOTAL = W - MX - 20;
const DESC_MAX = 45;

export default function TemplateModernOrange({ data, svgRef }: Props) {
  const accent = data.accentColor || '#F26522'; // Orange vif du modèle
  const dark = '#111111'; // Noir profond
  const cc = data.currency || 'USD';
  const fontSans = data.fontFamily || 'Montserrat, sans-serif';
  
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };

  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: fontSans, backgroundColor: '#FFFFFF' }}>
      
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            {/* Arrière-plan de la page (Blanc) */}
            <rect x="0" y={py} width={W} height={PH} fill="#F9F9F9" />

            {/* En-tête Noir (S'étend sur la première partie de la page) */}
            <rect x="0" y={py} width={W} height={page.isFirst ? 240 : 120} fill={dark} />

            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                {/* Textes "Invoice To" (Gauche) */}
                <text x={MX} y={py + 70} fill="#FFFFFF" fontSize="12" fontWeight="600">Invoice To</text>
                <text x={MX} y={py + 105} fill="#FFFFFF" fontSize="32" fontWeight="800" letterSpacing="-1">{data.clientName || 'Diarny Karina Tya'}</text>
                
                {/* Ligne d'adresse et de téléphone avec icônes simulées */}
                <circle cx={MX + 6} cy={py + 130} r="6" fill={accent} />
                <text x={MX + 18} y={py + 133} fill="#DDDDDD" fontSize="9">{data.clientCompany || '+123-456-7890'}</text>
                
                <circle cx={MX + 116} cy={py + 130} r="6" fill={accent} />
                <text x={MX + 128} y={py + 133} fill="#DDDDDD" fontSize="9">{data.clientAddress || '123 Your Address St., City Name.'}</text>

                {/* Gros Titre "INVOICE" empilé (Droite) */}
                <text x={W - MX} y={py + 85} textAnchor="end" fill={accent} fontSize="58" fontWeight="900" letterSpacing="-1">INVO</text>
                <text x={W - MX} y={py + 135} textAnchor="end" fill={accent} fontSize="58" fontWeight="900" letterSpacing="-1">ICE</text>

                {/* BOÎTES CHEVAUCHANTES (Orange et Grise unie avec bordure) */}
                {/* Boîte de gauche : Termes (Couleur unie, avec bordure orange) */}
                <rect x={MX} y={py + 180} width="320" height="120" rx="15" fill="#F4F4F4" stroke={accent} strokeWidth="2" />
                <text x={MX + 20} y={py + 202} fill={accent} fontSize="11" fontWeight="800" letterSpacing="0.5">TERM &amp; CONDITIONS</text>
                {wrapLines(data.notes || 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Sed diam nonummy nibh euismod tincidunt ut laoreet.', 45).map((l, i) => (
                  <g key={'tc'+i}>
                    <circle cx={MX + 25} cy={py + 225 + i * 14} r="2" fill={accent} />
                    <text x={MX + 35} y={py + 228 + i * 14} fill="#555555" fontSize="9">{l}</text>
                  </g>
                ))}

                {/* Boîte de droite : Find Us (Fond orange plein) */}
                <rect x={W - MX - 320} y={py + 180} width="320" height="120" rx="15" fill={accent} />
                <text x={W - MX - 300} y={py + 202} fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="0.5">Find Us For More Information</text>
                <circle cx={W - MX - 295} cy={py + 232} r="3" fill="#FFFFFF" opacity="0.8" />
                <text x={W - MX - 280} y={py + 235} fill="#FFFFFF" fontSize="9" fontWeight="500">{data.designerPhone || '+123 456 789 000'}</text>
                
                <circle cx={W - MX - 295} cy={py + 252} r="3" fill="#FFFFFF" opacity="0.8" />
                <text x={W - MX - 280} y={py + 255} fill="#FFFFFF" fontSize="9" fontWeight="500">{data.designerEmail || 'youremail@email.com'}</text>
                
                <circle cx={W - MX - 295} cy={py + 272} r="3" fill="#FFFFFF" opacity="0.8" />
                <text x={W - MX - 280} y={py + 275} fill="#FFFFFF" fontSize="9" fontWeight="500">{data.designerAddress || '123 Your Address St., City Name.'}</text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill="#FFFFFF" fontSize="30" fontWeight="800">INVOICE</text>
                <text x={W - MX} y={py + 60} textAnchor="end" fill="#E0E0E0" fontSize="10">Page {page.idx + 1} of {totalPages}</text>
              </g>
            )}

            {/* En-tête du Tableau */}
            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - 2 * MX} height={TABLE_HEADER_H} rx="18" fill={dark} />
                <text x={COL_DESC} y={tableHeaderY + 22} fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="0.5">ITEM DESCRIPTION</text>
                <text x={COL_RATE} y={tableHeaderY + 22} fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="0.5" textAnchor="middle">UNIT PRICE</text>
                <text x={COL_QTY} y={tableHeaderY + 22} fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="0.5" textAnchor="middle">QUANTITY</text>
                <text x={COL_TOTAL} y={tableHeaderY + 22} fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="0.5" textAnchor="end">AMOUNT</text>
              </g>
            )}

            {/* Lignes du Tableau (Couleurs alternées) */}
            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              const isEven = localIdx % 2 === 0;
              return (
                <g key={item.id}>
                  {isEven && <rect x={MX} y={curRowY} width={W - 2 * MX} height={ROW_H} fill="#F0F0F0" rx="8" />}
                  <text x={COL_DESC} y={curRowY + 24} fill="#333333" fontSize="10" fontWeight="600">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_RATE} y={curRowY + 24} fill="#555555" fontSize="10" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_QTY} y={curRowY + 24} fill="#555555" fontSize="10" textAnchor="middle">{(item.quantity).toString().padStart(2, '0')}</text>
                  <text x={COL_TOTAL} y={curRowY + 24} fill="#333333" fontSize="10" fontWeight="600" textAnchor="end">{fmt(lt)}</text>
                </g>
              );
            })}

            {hasRows && (
              <line x1={MX} y1={rowY + 10} x2={W - MX} y2={rowY + 10} stroke="#DDDDDD" strokeWidth="1" />
            )}

            {/* Section Bas de page et Totaux */}
            {page.showBottom && (() => {
              const bY = hasRows ? rowY + 30 : py + headerH + 30;
              return (
                <g>
                  {/* Totaux disposés sous la colonne QTY */}
                  <text x={COL_QTY} y={bY + 10} textAnchor="middle" fill="#111111" fontSize="10" fontWeight="800">SUB TOTAL</text>
                  <text x={COL_TOTAL} y={bY + 10} textAnchor="end" fill="#555555" fontSize="11">{fmt(sub)}</text>
                  
                  <text x={COL_QTY} y={bY + 35} textAnchor="middle" fill="#111111" fontSize="10" fontWeight="800">TOTAL</text>
                  <rect x={COL_TOTAL - 120} y={bY + 20} width="120" height="28" rx="14" fill={accent} />
                  <text x={COL_TOTAL - 10} y={bY + 39} textAnchor="end" fill="#FFFFFF" fontSize="14" fontWeight="800">{fmt(total)}</text>

                  {/* Signatures dans des rectangles transparents */}
                  <g transform={`translate(0, ${bY + 80})`}>
                    {/* Provider */}
                    <rect x={MX} y="0" width="240" height="80" rx="8" fill="none" stroke="#AAAAAA" strokeWidth="1.5" />
                    <text x={MX + 120} y="20" textAnchor="middle" fill="#333333" fontSize="10" fontWeight="700">PROVIDER SIGNATURE</text>
                    {data.designerSignature && <image href={data.designerSignature} x={MX + 50} y="30" width="140" height="40" preserveAspectRatio="xMidYMid meet" />}

                    {/* Client */}
                    <rect x={MX + 260} y="0" width="240" height="80" rx="8" fill="none" stroke="#AAAAAA" strokeWidth="1.5" />
                    <text x={MX + 380} y="20" textAnchor="middle" fill="#333333" fontSize="10" fontWeight="700">CLIENT SIGNATURE</text>
                    {data.clientSignature && <image href={data.clientSignature} x={MX + 310} y="30" width="140" height="40" preserveAspectRatio="xMidYMid meet" />}
                  </g>
                </g>
              );
            })()}

            {/* PIED DE PAGE NOIR (Fixe en bas de chaque page) */}
            <g transform={`translate(0, ${py + PH - 140})`}>
              <rect x="0" y="0" width={W} height="140" fill={dark} />
              
              {/* Éléments décoratifs (Ligne diagonale et capsule orange) */}
              <circle cx={MX + 80} cy="20" r="80" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.1" />
              <line x1={MX + 20} y1="140" x2={MX + 140} y2="20" stroke={accent} strokeWidth="6" strokeLinecap="round" />
              <g transform={`translate(${MX + 30}, 90) rotate(-45)`}>
                <rect x="0" y="0" width="80" height="30" rx="15" fill={accent} />
              </g>

              {/* Infos Manager et Dates */}
              <text x={MX + 220} y="75" fill="#FFFFFF" fontSize="12" fontWeight="700">{data.designerName || 'Paulo Roberto'}</text>
              <text x={MX + 220} y="90" fill="#AAAAAA" fontSize="9" fontWeight="600">MANAGER</text>

              <text x={W / 2 + 100} y="75" textAnchor="end" fill="#FFFFFF" fontSize="12" fontWeight="700">Date:</text>
              <text x={W / 2 + 100} y="90" textAnchor="end" fill="#AAAAAA" fontSize="9">{fDate(data.quoteDate)}</text>

              <text x={W - MX} y="75" textAnchor="end" fill="#FFFFFF" fontSize="12" fontWeight="700">No. Invoice:</text>
              <text x={W - MX} y="90" textAnchor="end" fill="#AAAAAA" fontSize="9">{data.quoteNumber || '123/456/7890'}</text>
            </g>
            
          </g>
        );
      })}
    </svg>
  );
}
