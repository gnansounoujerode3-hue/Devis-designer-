import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines } from '../lib/paginate';
import { useWhiteSignatures } from '../lib/whiteSignature';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 470, HEADER_CONT_H = 120, TABLE_HEADER_H = 40, ROW_H = 34, BOTTOM_H = 300;
const COL_NO = MX;
const COL_QTY = MX + 40;
const COL_DESC = MX + 90;
const COL_RATE = W - MX - 100;
const COL_TOTAL = W - MX;
const DESC_MAX = 55;

export default function TemplateMinimalist({ data, svgRef }: Props) {
  const accent = data.accentColor || '#000000';
  const bgColor = '#E5E5E5';
  /* Signatures en encre blanche : elles sont sur la grande boîte fill={accent}
     (noire par défaut) — encre noire illisible sur fond sombre. */
  const whiteSigs = useWhiteSignatures(data.designerSignature, data.clientSignature);
  const cc = data.currency || 'USD';
  const fontSans = data.fontFamily || 'Montserrat, sans-serif';
  const fontSerif = 'Playfair Display, Times New Roman, serif';
  
  const sub = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = sub * (data.taxRate / 100);
  const total = sub + tax;
  const fmt = (n: number) => formatMoney(n, cc);
  const fDate = (d: string) => { if (!d) return '--'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };
  const pages = paginate({ totalItems: data.items.length, headerFullH: HEADER_FULL_H, headerContH: HEADER_CONT_H, tableHeaderH: TABLE_HEADER_H, rowH: ROW_H, bottomSectionH: BOTTOM_H });
  const totalPages = pages.length;
  const svgH = totalPages * PH;

  const gap = 20;
  const boxW = (W - 2 * MX - gap) / 2;
  const leftBoxX = MX;
  const rightBoxX = MX + boxW + gap;

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${svgH}`} width="100%" height="100%"
      style={{ fontFamily: fontSans }}>
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            <rect x="0" y={py} width={W} height={PH} fill={bgColor} />

            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill="#333" fontSize="12">{data.designerName || 'Your Company'}</text>
                <text x={W - MX} y={py + 60} textAnchor="end" fill="#333" fontSize="12">{data.designerName || 'Your Company'}</text>
                
                <text x={MX} y={py + 225} fill={accent} fontSize="150" fontWeight="900" fontFamily={fontSerif} letterSpacing="-4">Invoice</text>
                
                {/* Flèche épaisse, calculée pour s'aligner exactement sur la baseline du texte et la marge droite */}
                <g transform={`translate(${W - MX - 106}, ${py + 122.5})`}>
                  <path d="M 16 94 L 94 16 M 34 16 L 94 16 L 94 76" fill="none" stroke={accent} strokeWidth="24" strokeLinejoin="miter" strokeLinecap="square"/>
                </g>

                <rect x={leftBoxX} y={py + 260} width={boxW} height="90" rx="15" fill="none" stroke={accent} strokeWidth="1.5" />
                <text x={leftBoxX + 20} y={py + 285} fill="#333" fontSize="11">Invoice From</text>
                <text x={leftBoxX + 20} y={py + 305} fill={accent} fontSize="18" fontWeight="700" fontFamily={fontSerif}>{data.designerName || 'John Smith Company'}</text>
                <text x={leftBoxX + 20} y={py + 325} fill="#555" fontSize="10">{data.designerAddress || '1234 Street Name, City Name,'}</text>
                <text x={leftBoxX + 20} y={py + 338} fill="#555" fontSize="10">State Name, Country 1234</text>

                <rect x={rightBoxX} y={py + 260} width={boxW} height="90" rx="15" fill={accent} />
                <text x={rightBoxX + boxW/2} y={py + 295} textAnchor="middle" fill="#FFF" fontSize="18" fontWeight="700" fontFamily={fontSerif}>Invoice Info</text>
                <text x={rightBoxX + boxW/2} y={py + 315} textAnchor="middle" fill="#E5E5E5" fontSize="10">Invoice Date. {fDate(data.quoteDate)}</text>
                <text x={rightBoxX + boxW/2} y={py + 330} textAnchor="middle" fill="#E5E5E5" fontSize="10">Issue Date. {fDate(data.validUntil)}</text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <text x={MX} y={py + 60} fill={accent} fontSize="36" fontWeight="900" fontFamily={fontSerif}>Invoice</text>
                <text x={W - MX} y={py + 60} textAnchor="end" fill="#555" fontSize="10">Page {page.idx + 1} of {totalPages}</text>
                <line x1={MX} y1={py + 80} x2={W - MX} y2={py + 80} stroke={accent} strokeWidth="2" />
              </g>
            )}

            {hasRows && (
              <g>
                <text x={COL_NO} y={tableHeaderY + 25} fill={accent} fontSize="10" fontWeight="800" letterSpacing="1">NO.</text>
                <text x={COL_QTY} y={tableHeaderY + 25} fill={accent} fontSize="10" fontWeight="800" letterSpacing="1">QTY</text>
                <text x={COL_DESC} y={tableHeaderY + 25} fill={accent} fontSize="10" fontWeight="800" letterSpacing="1">ITEM DESCRIPTION</text>
                <text x={COL_RATE} y={tableHeaderY + 25} fill={accent} fontSize="10" fontWeight="800" letterSpacing="1" textAnchor="end">PRICE</text>
                <text x={COL_TOTAL} y={tableHeaderY + 25} fill={accent} fontSize="10" fontWeight="800" letterSpacing="1" textAnchor="end">TOTAL</text>
                <line x1={MX} y1={tableHeaderY + 35} x2={W - MX} y2={tableHeaderY + 35} stroke={accent} strokeWidth="1.5" />
              </g>
            )}

            {page.rowIndices.map((itemIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  <text x={COL_NO} y={curRowY + 20} fill="#333" fontSize="11">{(itemIdx + 1).toString().padStart(2, '0')}.</text>
                  <text x={COL_QTY} y={curRowY + 20} fill="#333" fontSize="11">{item.quantity}</text>
                  <text x={COL_DESC} y={curRowY + 20} fill="#333" fontSize="11">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_RATE} y={curRowY + 20} fill="#333" fontSize="11" textAnchor="end">{fmt(item.unitPrice)}</text>
                  <text x={COL_TOTAL} y={curRowY + 20} fill="#333" fontSize="11" textAnchor="end">{fmt(lt)}</text>
                </g>
              );
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 20 : py + headerH + 20;
              return (
                <g>
                  <line x1={MX} y1={bY} x2={W - MX} y2={bY} stroke={accent} strokeWidth="1.5" />
                  
                  <text x={W - MX - 140} y={bY + 25} fill={accent} fontSize="12" fontWeight="800">Subtotal</text>
                  <text x={W - MX - 80} y={bY + 25} fill={accent} fontSize="12" fontWeight="800">:</text>
                  <text x={W - MX} y={bY + 25} textAnchor="end" fill={accent} fontSize="14" fontWeight="800">{fmt(sub)}</text>
                  
                  <text x={W - MX - 140} y={bY + 45} fill={accent} fontSize="12" fontWeight="800">Tax</text>
                  <text x={W - MX - 80} y={bY + 45} fill={accent} fontSize="12" fontWeight="800">:</text>
                  <text x={W - MX} y={bY + 45} textAnchor="end" fill={accent} fontSize="12" fontWeight="800">{fmt(tax)}</text>
                  
                  <line x1={MX} y1={bY + 60} x2={W - MX} y2={bY + 60} stroke={accent} strokeWidth="1.5" />
                  
                  <text x={W - MX - 140} y={bY + 85} fill={accent} fontSize="12" fontWeight="800">Total</text>
                  <text x={W - MX - 80} y={bY + 85} fill={accent} fontSize="12" fontWeight="800">:</text>
                  <text x={W - MX} y={bY + 85} textAnchor="end" fill={accent} fontSize="14" fontWeight="800">{fmt(total)}</text>

                  <line x1={MX} y1={bY + 100} x2={W - MX} y2={bY + 100} stroke={accent} strokeWidth="1.5" />

                  <rect x={MX} y={bY + 140} width={W - MX * 2} height="130" rx="20" fill={accent} />
                  
                  <text x={MX + 30} y={bY + 175} fill="#FFF" fontSize="16" fontWeight="700" fontFamily={fontSerif}>Terms & Condition.</text>
                  {wrapLines(data.notes || 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt.', 32).map((l, i) => (
                    <text key={'tc'+i} x={MX + 30} y={bY + 205 + i * 14} fill="#E5E5E5" fontSize="10">{l}</text>
                  ))}

                  <text x={MX + 350} y={bY + 175} textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="700" fontFamily={fontSerif}>Provider</text>
                  {data.designerSignature && whiteSigs.designer && (
                    <image href={whiteSigs.designer} x={MX + 300} y={bY + 190} width="100" height="40" preserveAspectRatio="xMidYMid meet" />
                  )}
                  <line x1={MX + 290} y1={bY + 240} x2={MX + 410} y2={bY + 240} stroke="#FFF" strokeWidth="1.5" />
                  <text x={MX + 350} y={bY + 255} textAnchor="middle" fill="#E5E5E5" fontSize="9">Authorized Sign</text>

                  <text x={W - MX - 90} y={bY + 175} textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="700" fontFamily={fontSerif}>Client</text>
                  {data.clientSignature && whiteSigs.client && (
                    <image href={whiteSigs.client} x={W - MX - 140} y={bY + 190} width="100" height="40" preserveAspectRatio="xMidYMid meet" />
                  )}
                  <line x1={W - MX - 150} y1={bY + 240} x2={W - MX - 30} y2={bY + 240} stroke="#FFF" strokeWidth="1.5" />
                  <text x={W - MX - 90} y={bY + 255} textAnchor="middle" fill="#E5E5E5" fontSize="9">Client Sign</text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
