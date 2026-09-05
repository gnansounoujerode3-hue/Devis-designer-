import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 220, HEADER_CONT_H = 100, TABLE_HEADER_H = 36, ROW_H = 40, BOTTOM_H = 420;
const COL_ITEM = MX + 20;
const COL_QTY = MX + 350;
const COL_RATE = MX + 460;
const COL_TOTAL = W - MX - 30;
const DESC_MAX = 45;

export default function TemplatePurple({ data, svgRef }: Props) {
  const accent = data.accentColor || '#9b6b9e'; // Violet doux
  const cc = data.currency || 'USD';
  const fontSans = data.fontFamily || 'Montserrat, sans-serif';
  
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };
  
  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: fontSans, backgroundColor: '#FFFFFF' }}>
      
      <defs>
        <linearGradient id="totalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111111" />
          <stop offset="60%" stopColor={accent} />
          <stop offset="100%" stopColor="#333333" />
        </linearGradient>
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

            {/* Cercles de fond décoratifs */}
            <g opacity="0.4">
              <circle cx="150" cy={py + 50} r="180" fill="none" stroke="#F0F0F0" strokeWidth="8" />
              <circle cx="700" cy={py + 250} r="140" fill="none" stroke="#F0F0F0" strokeWidth="12" />
              <circle cx="100" cy={py + 750} r="200" fill="none" stroke="#F0F0F0" strokeWidth="10" />
              <circle cx="650" cy={py + 800} r="160" fill="none" stroke="#F0F0F0" strokeWidth="15" />
            </g>

            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                <text x={MX} y={py + 100} fill="#111" fontSize="76" fontWeight="900" letterSpacing="-2">Invoice.</text>

                <text x={W - MX} y={py + 50} textAnchor="end" fill="#111" fontSize="12" fontWeight="600">Invoice To.</text>
                <text x={W - MX} y={py + 70} textAnchor="end" fill={accent} fontSize="18" fontWeight="600">{data.clientName || 'Sarah Ann'}</text>
                <text x={W - MX} y={py + 90} textAnchor="end" fill="#555" fontSize="11">{data.clientAddress || '123 Street Nam, City Name'}</text>

                <line x1={MX} y1={py + 120} x2={W - MX} y2={py + 120} stroke="#333" strokeWidth="1" />

                <rect x={MX} y={py + 140} width="180" height="30" rx="15" fill={accent} />
                <text x={MX + 90} y={py + 159} textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="500">{data.designerPhone || '(+00) 123 - 456 - 7890'}</text>

                <text x={W / 2} y={py + 159} textAnchor="middle" fill="#333" fontSize="11">Invoice No. {data.quoteNumber || '01234567'}</text>
                <text x={W - MX} y={py + 159} textAnchor="end" fill="#333" fontSize="11">Invoice Date. {fDate(data.quoteDate)}</text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill="#111" fontSize="36" fontWeight="900">Invoice.</text>
                <text x={W - MX} y={py + 60} textAnchor="end" fill="#555" fontSize="10">Page {page.idx + 1} of {totalPages}</text>
                <line x1={MX} y1={py + 80} x2={W - MX} y2={py + 80} stroke="#333" strokeWidth="1" />
              </g>
            )}

            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - 2 * MX} height={TABLE_HEADER_H} rx="18" fill="#111" />
                <text x={COL_ITEM} y={tableHeaderY + 22} fill="#FFF" fontSize="11" fontWeight="600">Item</text>
                <text x={COL_QTY} y={tableHeaderY + 22} fill="#FFF" fontSize="11" fontWeight="600" textAnchor="middle">Qty</text>
                <text x={COL_RATE} y={tableHeaderY + 22} fill="#FFF" fontSize="11" fontWeight="600" textAnchor="middle">Unit Price</text>
                <text x={COL_TOTAL} y={tableHeaderY + 22} fill="#FFF" fontSize="11" fontWeight="600" textAnchor="end">Total</text>

                <rect x={MX} y={tableHeaderY + TABLE_HEADER_H + 10} width={W - 2 * MX} height={page.rowIndices.length * ROW_H + 20} rx="15" fill="#F4F4F4" />
              </g>
            )}

            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              if (localIdx === 0) rowY += 15;
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  <text x={COL_ITEM} y={curRowY + 20} fill="#333" fontSize="11" fontWeight="500">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_QTY} y={curRowY + 20} fill="#555" fontSize="11" textAnchor="middle">{item.quantity}</text>
                  <text x={COL_RATE} y={curRowY + 20} fill="#555" fontSize="11" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_TOTAL} y={curRowY + 20} fill="#555" fontSize="11" textAnchor="end">{fmt(lt)}</text>
                </g>
              );
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 50 : py + headerH + 20;
              return (
                <g>
                  {/* Gauche: Sous-total & Taxe */}
                  <line x1={MX} y1={bY} x2={W / 2 - 40} y2={bY} stroke="#333" strokeWidth="1.5" />
                  
                  <text x={MX + 20} y={bY + 25} fill="#111" fontSize="12" fontWeight="600">Subtotal</text>
                  <text x={W / 2 - 40} y={bY + 25} textAnchor="end" fill="#555" fontSize="12">{fmt(sub)}</text>
                  
                  <text x={MX + 20} y={bY + 55} fill="#111" fontSize="12" fontWeight="600">Tax ({data.taxRate}%)</text>
                  <text x={W / 2 - 40} y={bY + 55} textAnchor="end" fill="#555" fontSize="12">{fmt(tax)}</text>
                  
                  <line x1={MX} y1={bY + 75} x2={W / 2 - 40} y2={bY + 75} stroke="#CCC" strokeWidth="1" />

                  {/* Droite: Boîte Total */}
                  <rect x={W / 2 + 20} y={bY - 10} width={W / 2 - MX - 20} height="85" rx="15" fill="url(#totalGrad)" />
                  <text x={W / 2 + 40} y={bY + 15} fill="#E5E5E5" fontSize="12" fontWeight="400">Grand Total</text>
                  <text x={W / 2 + 40} y={bY + 55} fill="#FFF" fontSize="36" fontWeight="700">{fmt(total)}</text>

                  {/* Section Condition & Signatures */}
                  <g transform={`translate(0, ${bY + 140})`}>
                    {/* Badge Condition */}
                    <rect x={MX} y="0" width="160" height="30" rx="15" fill={accent} />
                    <text x={MX + 80} y="19" textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="500">Condition</text>
                    
                    {/* Texte des conditions */}
                    {wrapLines(data.notes || 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Curabitur ultrice commodo.', 45).map((l, i) => (
                      <text key={'tc'+i} x={MX} y={55 + i * 14} fill="#555" fontSize="10">{l}</text>
                    ))}

                    {/* Section Thank You à droite */}
                    <text x={W - MX} y="30" textAnchor="end" fill={accent} fontSize="42" fontWeight="800" letterSpacing="-1">Thank You</text>
                    <text x={W - MX} y="55" textAnchor="end" fill="#555" fontSize="11">Integer egestas sem, elementum.</text>
                    <text x={W - MX} y="72" textAnchor="end" fill="#555" fontSize="11">Curabitur ultrice commodo.</text>

                    {/* Signatures allongées sur la largeur de la page */}
                    {/* Provider (Gauche) */}
                    <text x={MX + 100} y="130" textAnchor="middle" fill="#111" fontSize="12" fontWeight="700">Provider</text>
                    {data.designerSignature && <image href={data.designerSignature} x={MX + 50} y="140" width="100" height="30" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={MX} y1="180" x2={MX + 200} y2="180" stroke="#333" strokeWidth="1" />

                    {/* Client (Droite) */}
                    <text x={W - MX - 100} y="130" textAnchor="middle" fill="#111" fontSize="12" fontWeight="700">Client</text>
                    {data.clientSignature && <image href={data.clientSignature} x={W - MX - 150} y="140" width="100" height="30" preserveAspectRatio="xMidYMid meet" />}
                    <line x1={W - MX - 200} y1="180" x2={W - MX} y2="180" stroke="#333" strokeWidth="1" />
                  </g>

                  {/* Ligne Footer & Contact Us */}
                  <g transform={`translate(0, ${bY + 340})`}>
                    <line x1={MX} y1="0" x2={W - MX} y2="0" stroke="#333" strokeWidth="1" />
                    
                    <text x={MX} y="30" fill="#111" fontSize="12" fontWeight="700">Contact Us</text>
                    
                    <text x={MX + 140} y="25" fill="#333" fontSize="10">{data.designerPhone || '+012 3456 7890'}</text>
                    <text x={MX + 140} y="40" fill="#333" fontSize="10">{data.designerEmail || 'yourcompany@mail.com'}</text>

                    <text x={W - MX} y="25" textAnchor="end" fill="#333" fontSize="10">{data.designerAddress || '675 Sunset Boulevard'}</text>
                    <text x={W - MX} y="40" textAnchor="end" fill="#333" fontSize="10">210, Hollywood, CA 90028</text>
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
