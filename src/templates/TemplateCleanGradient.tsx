import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 340, HEADER_CONT_H = 120, TABLE_HEADER_H = 40, ROW_H = 40, BOTTOM_H = 350;
const COL_DESC = MX + 20;
const COL_RATE = W / 2;
const COL_QTY = W / 2 + 100;
const COL_TOTAL = W - 110;
const DESC_MAX = 35;

export default function TemplateCleanGradient({ data, svgRef }: Props) {
  const accent = data.accentColor || '#F9A07E'; // Pêche/Saumon doux
  const dark = '#2B2D3A'; // Bleu ardoise très sombre
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
      
      <defs>
        <radialGradient id="softGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="50%" stopColor={accent} stopOpacity="0.6" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill="#FFFFFF" />

            {/* Décorations Gradient (Bulles douces avec plus d'intensité) */}
            <circle cx="650" cy={py + 150} r="250" fill="url(#softGrad)" />
            <circle cx="150" cy={py + 750} r="280" fill="url(#softGrad)" />
            
            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={dark} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {/* ÉLÉMENTS VERTICAUX (Droite de la page) */}
            <g transform={`translate(${W - 35}, ${py + 650}) rotate(-90)`}>
              {/* Invoice No Pill */}
              <rect x="0" y="-10" width="75" height="20" rx="10" fill={dark} />
              <text x="37.5" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">Invoice No :</text>
              <text x="85" y="4" fill="#555" fontSize="10">{data.quoteNumber || '0123 456 789'}</text>

              {/* Date Pill */}
              <rect x="220" y="-10" width="45" height="20" rx="10" fill={dark} />
              <text x="242.5" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">Date :</text>
              <text x="275" y="4" fill="#555" fontSize="10">{fDate(data.quoteDate)}</text>
            </g>

            {page.isFirst && (
              <g>
                {/* En-tête Gauche - Phrase supprimée */}
                <text x={MX} y={py + 80} fill={dark} fontSize="14" fontWeight="800">{data.designerName || 'Jérode GNANSOUNOU'}</text>

                {/* Gros Titre "Invoice" à droite */}
                <text x={W - MX - 40} y={py + 120} textAnchor="end" fill={dark} fontSize="64" fontWeight="800" letterSpacing="-2">Invoice</text>

                {/* Invoice To */}
                <text x={MX} y={py + 200} fill="#888" fontSize="10" fontWeight="600">Invoice To</text>
                <circle cx={MX + 8} cy={py + 222} r="8" fill="#E85D45" /> {/* Point Rouge/Orange foncé */}
                <text x={MX + 22} y={py + 228} fill={dark} fontSize="26" fontWeight="800" letterSpacing="-0.5">{data.clientName || 'Sandira Maulia'}</text>
                
                {/* Coordonnées Client */}
                <circle cx={MX + 6} cy={py + 250} r="5" fill="none" stroke={dark} strokeWidth="1.5" />
                <text x={MX + 18} y={py + 253} fill="#555" fontSize="9" fontWeight="600">{data.clientCompany || '+123-456-7890'}</text>
                
                <circle cx={MX + 106} cy={py + 250} r="5" fill="none" stroke={dark} strokeWidth="1.5" />
                <text x={MX + 118} y={py + 253} fill="#555" fontSize="9" fontWeight="600">{data.clientAddress || '123 Your Address St., City Name'}</text>

                <line x1={MX} y1={py + 280} x2={W - 100} y2={py + 280} stroke="#EAEAEA" strokeWidth="1.5" />
              </g>
            )}

            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill={dark} fontSize="30" fontWeight="800">Invoice</text>
                <text x={W - 100} y={py + 60} textAnchor="end" fill="#888" fontSize="10">Page {page.idx + 1} of {totalPages}</text>
                <line x1={MX} y1={py + 80} x2={W - 100} y2={py + 80} stroke="#EAEAEA" strokeWidth="1.5" />
              </g>
            )}

            {/* En-tête du Tableau */}
            {hasRows && (
              <g>
                <text x={COL_DESC} y={tableHeaderY + 24} fill={dark} fontSize="8" fontWeight="800" letterSpacing="0.5">ITEM DESCRIPTION</text>
                <text x={COL_RATE} y={tableHeaderY + 24} fill={dark} fontSize="8" fontWeight="800" letterSpacing="0.5" textAnchor="middle">UNIT PRICE</text>
                <text x={COL_QTY} y={tableHeaderY + 24} fill={dark} fontSize="8" fontWeight="800" letterSpacing="0.5" textAnchor="middle">QUANTITY</text>
                <text x={COL_TOTAL} y={tableHeaderY + 24} fill={dark} fontSize="8" fontWeight="800" letterSpacing="0.5" textAnchor="end">AMOUNT</text>
                
                {/* Lignes encadrant l'en-tête */}
                <line x1={MX} y1={tableHeaderY} x2={W - 100} y2={tableHeaderY} stroke="#EAEAEA" strokeWidth="1.5" />
                <line x1={MX} y1={tableHeaderY + TABLE_HEADER_H} x2={W - 100} y2={tableHeaderY + TABLE_HEADER_H} stroke="#EAEAEA" strokeWidth="1.5" />
              </g>
            )}

            {/* Lignes du Tableau */}
            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              const isEven = localIdx % 2 === 0;
              return (
                <g key={item.id}>
                  {isEven && <rect x={MX} y={curRowY} width={W - MX - 100} height={ROW_H} fill="#F7F7F7" />}
                  <text x={COL_DESC} y={curRowY + 24} fill="#555" fontSize="10" fontWeight="500">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_RATE} y={curRowY + 24} fill="#555" fontSize="10" fontWeight="500" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_QTY} y={curRowY + 24} fill="#555" fontSize="10" fontWeight="500" textAnchor="middle">{(item.quantity).toString().padStart(2, '0')}</text>
                  <text x={COL_TOTAL} y={curRowY + 24} fill="#555" fontSize="10" fontWeight="500" textAnchor="end">{fmt(lt)}</text>
                </g>
              );
            })}

            {hasRows && (
              <line x1={MX} y1={rowY} x2={W - 100} y2={rowY} stroke="#EAEAEA" strokeWidth="1.5" />
            )}

            {/* Section Bas de page et Totaux */}
            {page.showBottom && (() => {
              const bY = hasRows ? rowY + 30 : py + headerH + 30;
              return (
                <g>
                  {/* Totaux */}
                  <text x={COL_QTY} y={bY + 10} textAnchor="middle" fill={dark} fontSize="10" fontWeight="800">SUB TOTAL</text>
                  <text x={COL_TOTAL} y={bY + 10} textAnchor="end" fill="#555" fontSize="10" fontWeight="600">{fmt(sub)}</text>
                  
                  <text x={COL_QTY} y={bY + 35} textAnchor="middle" fill={dark} fontSize="10" fontWeight="800">TOTAL</text>
                  <text x={COL_TOTAL} y={bY + 35} textAnchor="end" fill={dark} fontSize="18" fontWeight="800">{fmt(total)}</text>

                  {/* Bloc de contacts en forme de pilule collée à gauche */}
                  <g transform={`translate(0, ${bY + 70})`}>
                    <rect x="-50" y="0" width="410" height="90" rx="45" fill={dark} />
                    <text x={MX} y="30" fill="#FFFFFF" fontSize="14" fontWeight="700" letterSpacing="0.5">THANKS FOR ORDERS</text>
                    
                    {/* Icônes et contacts - Ligne 1 */}
                    <circle cx={MX + 5} cy="50" r="3" fill="#FFFFFF" />
                    <text x={MX + 15} y="53" fill="#DDDDDD" fontSize="9">{data.designerPhone || '+123-456-7890'}</text>
                    
                    <circle cx={MX + 135} cy="50" r="3" fill="#FFFFFF" />
                    <text x={MX + 145} y="53" fill="#DDDDDD" fontSize="9">{data.designerEmail || 'www.yourwebsite.com'}</text>

                    {/* Icônes et contacts - Ligne 2 */}
                    <circle cx={MX + 5} cy="70" r="3" fill="#FFFFFF" />
                    <text x={MX + 15} y="73" fill="#DDDDDD" fontSize="9">{data.designerEmail || 'youremail@email.com'}</text>
                    
                    <circle cx={MX + 135} cy="70" r="3" fill="#FFFFFF" />
                    <text x={MX + 145} y="73" fill="#DDDDDD" fontSize="9">{data.designerAddress || '123 Your Address St.'}</text>
                  </g>

                  {/* Bloc Terms & Conditions */}
                  <g transform={`translate(${MX + 380}, ${bY + 70})`}>
                    <text x="0" y="20" fill={dark} fontSize="12" fontWeight="800">TERM &amp;</text>
                    <text x="0" y="34" fill={dark} fontSize="12" fontWeight="800">CONDITIONS</text>
                    
                    {/* Fake Checkboxes + text */}
                    <rect x="0" y="45" width="6" height="6" fill="none" stroke={dark} strokeWidth="1" />
                    <path d="M 1 48 L 3 50 L 7 44" fill="none" stroke={dark} strokeWidth="1" />
                    <text x="12" y="48" fill="#555" fontSize="7">Lorem ipsum dolor sit amet, consectetuer adipiscing</text>
                    <text x="12" y="58" fill="#555" fontSize="7">elit. Sed diam nonummy nibh euismod.</text>

                    <rect x="0" y="65" width="6" height="6" fill="none" stroke={dark} strokeWidth="1" />
                    <path d="M 1 68 L 3 70 L 7 64" fill="none" stroke={dark} strokeWidth="1" />
                    <text x="12" y="68" fill="#555" fontSize="7">Lorem ipsum dolor sit amet, consectetuer adipiscing</text>
                    <text x="12" y="78" fill="#555" fontSize="7">elit. Sed diam nonummy nibh euismod.</text>
                  </g>

                  {/* Pied de page (Signatures) */}
                  <g transform={`translate(0, ${bY + 220})`}>
                    <text x={MX} y="20" fill={dark} fontSize="16" fontWeight="700" fontStyle="italic">Thanks For Order</text>
                    
                    {/* Client Signature */}
                    <text x={W / 2 - 20} y="-10" textAnchor="middle" fill={dark} fontSize="10" fontWeight="700">Client</text>
                    {data.clientSignature && <image href={data.clientSignature} x={W / 2 - 70} y="0" width="100" height="30" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={W / 2 - 80} y1="35" x2={W / 2 + 40} y2="35" stroke={dark} strokeWidth="1" />
                    <text x={W / 2 - 20} y="48" textAnchor="middle" fill="#888" fontSize="8">Authorized Signature</text>

                    {/* Manager / Provider Signature */}
                    <text x={W - 140} y="-10" textAnchor="middle" fill={dark} fontSize="10" fontWeight="700">Provider</text>
                    {data.designerSignature && <image href={data.designerSignature} x={W - 190} y="0" width="100" height="30" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={W - 200} y1="35" x2={W - 80} y2="35" stroke={dark} strokeWidth="1" />
                    <text x={W - 140} y="48" textAnchor="middle" fill="#888" fontSize="8">{data.designerName || 'Jérode GNANSOUNOU'}</text>
                    
                    {/* La forme et le texte "MANAGER" ont été supprimés ici */}
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
