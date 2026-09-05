import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 400, HEADER_CONT_H = 110, TABLE_HEADER_H = 32, ROW_H = 34, BOTTOM_H = 380;
const COL_DESC = MX + 14, COL_RATE = 400, COL_QTY = 530, COL_TOTAL = W - MX - 10;
const DESC_MAX = 40;

export default function TemplateAdapted({ data, svgRef }: Props) {
  const accent = data.accentColor || '#1A1A1A';

  /* Contraste adaptatif : texte lisible selon la clarté de la couleur d'accent */
  const accentIsLight = (() => {
    const h = (accent || '#1A1A1A').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  })();
  const onAccent = accentIsLight ? '#111111' : '#FFFFFF';          // texte principal sur fond accent
  const onAccentLabel = accentIsLight ? '#6B7280' : '#C4CBD4';     // petits labels (DATE:, TO)
  const onAccentMuted = accentIsLight ? '#4B5563' : '#D1D5DB';     // texte secondaire
  const accentDivider = accentIsLight ? '#9CA3AF' : '#6B7280';     // séparateur
  const cc = data.currency || 'USD';
  const font = data.fontFamily || 'Montserrat';
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
      style={{ fontFamily: `"${font}",'Helvetica Neue',Arial,sans-serif` }}>
      {pages.map(page => {
        const py = page.y;
        const headerH = page.isFirst ? HEADER_FULL_H : HEADER_CONT_H;
        const tableHeaderY = py + headerH;
        const hasRows = page.rowIndices.length > 0;
        let rowY = tableHeaderY + TABLE_HEADER_H;

        return (
          <g key={page.idx}>
            {/* Background */}
            <rect x="0" y={py} width={W} height={PH} fill="#F4F5F7" />

            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                {/* Left Dark Column */}
                <rect x="60" y={py + 80} width="220" height="280" fill={accent} />
                
                {/* Dates in Left Column */}
                <text x="80" y={py + 120} fill={onAccentLabel} fontSize="10" fontWeight="700" letterSpacing="1">DATE :</text>
                <text x="80" y={py + 135} fill={onAccent} fontSize="11">{fDate(data.quoteDate)}</text>
                
                <text x="80" y={py + 165} fill={onAccentLabel} fontSize="10" fontWeight="700" letterSpacing="1">DUE DATE :</text>
                <text x="80" y={py + 180} fill={onAccent} fontSize="11">{fDate(data.validUntil)}</text>

                {/* Divider */}
                <line x1="80" y1={py + 205} x2="110" y2={py + 205} stroke={accentDivider} strokeWidth="1" />

                {/* Client Info */}
                <text x="80" y={py + 230} fill={onAccentLabel} fontSize="10" fontWeight="700" letterSpacing="1">TO</text>
                <text x="80" y={py + 248} fill={onAccent} fontSize="13" fontWeight="600">{data.clientName || 'Seraphina Blue'}</text>
                <text x="80" y={py + 265} fill={onAccentMuted} fontSize="10">{data.clientCompany || '(555) 123-4567-9876'}</text>
                <text x="80" y={py + 320} fill={onAccentMuted} fontSize="10">{data.clientEmail || 'Seraphinablue@mail.com'}</text>

                {/* Right Column Header Elements */}
                {/* Logo Area — logo uploadé si présent, sinon cercle par défaut */}
                <g transform={`translate(${W - 250}, ${py + 50})`}>
                   {data.designerLogo ? (
                     <image href={data.designerLogo} x="0" y="-18" width="48" height="48" preserveAspectRatio="xMidYMid meet" />
                   ) : (
                     <>
                       <circle cx="20" cy="10" r="14" fill="none" stroke={accent} strokeWidth="3" />
                       <circle cx="20" cy="10" r="6" fill={accent} />
                     </>
                   )}
                   <text x={data.designerLogo ? 60 : 45} y="12" fill={accent} fontSize="16" fontWeight="700">{truncate(data.designerName || 'Blackwood Design', 22)}</text>
                   <text x={data.designerLogo ? 60 : 45} y="24" fill="#6B7280" fontSize="9">{truncate(data.designerTitle || 'Your Tagline Here', 28)}</text>
                </g>

                {/* INVOICE Title */}
                <text x="320" y={py + 150} fill={accent} fontSize="48" fontWeight="900" letterSpacing="2">INVOICE</text>
                <text x="320" y={py + 175} fill="#6B7280" fontSize="11">Document Payment Information</text>

                {/* Info Cards */}
                <rect x="320" y={py + 210} width="400" height="60" fill="#FFFFFF" stroke="#F3F4F6" strokeWidth="1" />
                <text x="340" y={py + 235} fill="#9CA3AF" fontSize="9" fontWeight="700" letterSpacing="1">ACCOUNT NO:</text>
                <text x="340" y={py + 252} fill="#374151" fontSize="12" fontWeight="600">{data.designerSiret || '123-456-789'}</text>
                
                <line x1="520" y1={py + 220} x2="520" y2={py + 260} stroke="#F3F4F6" strokeWidth="1" />
                
                <text x="540" y={py + 235} fill="#9CA3AF" fontSize="9" fontWeight="700" letterSpacing="1">INVOICE NO:</text>
                <text x="540" y={py + 252} fill="#374151" fontSize="12" fontWeight="600">{data.quoteNumber || '#89874632'}</text>

                {/* Payment Method */}
                <text x="320" y={py + 310} fill={accent} fontSize="11" fontWeight="700">Payment</text>
                <text x="320" y={py + 325} fill={accent} fontSize="11" fontWeight="700">Method</text>
                <line x1="320" y1={py + 335} x2="340" y2={py + 335} stroke={accent} strokeWidth="2" />

                <text x="400" y={py + 310} fill="#6B7280" fontSize="10">{data.designerName || 'Account Name'}</text>
                <text x="400" y={py + 325} fill="#6B7280" fontSize="10">{data.designerSiret || 'Account BA 1982-1856'}</text>
                <text x="400" y={py + 340} fill="#6B7280" fontSize="10">{data.designerAddress || '1234 Main Street United States'}</text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <rect x="0" y={py} width={W} height="70" fill={accent} />
                <text x={MX} y={py + 30} fill={onAccent} fontSize="16" fontWeight="800" letterSpacing="1">INVOICE</text>
                <text x={MX} y={py + 48} fill={onAccent} fontSize="9" opacity="0.7">
                  {(data.quoteNumber || '') + '  -  ' + (data.designerName || '') + '  /  ' + (data.clientCompany || '')}
                </text>
                <text x={W - MX} y={py + 38} textAnchor="end" fill={onAccent} fontSize="9" opacity="0.6">
                  {'Page ' + (page.idx + 1) + ' / ' + totalPages}
                </text>
              </g>
            )}

            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - MX * 2} height={TABLE_HEADER_H} fill="#1A1A1A" />
                <text x={COL_DESC} y={tableHeaderY + 20} fill="#FFFFFF" fontSize="11" fontWeight="700">Item Description</text>
                <text x={COL_RATE} y={tableHeaderY + 20} fill="#FFFFFF" fontSize="11" fontWeight="700" textAnchor="middle">Rate</text>
                <text x={COL_QTY} y={tableHeaderY + 20} fill="#FFFFFF" fontSize="11" fontWeight="700" textAnchor="middle">Unit</text>
                <text x={COL_TOTAL} y={tableHeaderY + 20} fill="#FFFFFF" fontSize="11" fontWeight="700" textAnchor="end">Subtotal</text>
              </g>
            )}

            {/* Background block for table rows */}
            {hasRows && (
               <rect x={MX} y={tableHeaderY + TABLE_HEADER_H} width={W - MX * 2} height={page.rowIndices.length * ROW_H + 20} fill="#FFFFFF" />
            )}

            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  <text x={COL_DESC} y={curRowY + 22} fill="#4B5563" fontSize="11" fontWeight="500">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_RATE} y={curRowY + 22} fill="#4B5563" fontSize="11" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_QTY} y={curRowY + 22} fill="#4B5563" fontSize="11" textAnchor="middle">Hour</text> {/* Or map to item.unit if available */}
                  <text x={COL_TOTAL} y={curRowY + 22} fill={accent} fontSize="11" textAnchor="end" fontWeight="700">{fmt(lt)}</text>
                  
                  {/* Bottom Border for rows except the last one */}
                  {localIdx < page.rowIndices.length - 1 && (
                     <line x1={MX + 14} y1={curRowY + ROW_H} x2={W - MX - 14} y2={curRowY + ROW_H} stroke="#F3F4F6" strokeWidth="1" />
                  )}
                </g>
              );
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 40 : py + headerH + 20;
              return (
                <g>
                  {/* Totals Box */}
                  <text x={W - 250} y={bY + 26} fill={accent} fontSize="11" fontWeight="700">Subtotal</text>
                  <text x={W - 160} y={bY + 26} fill={accent} fontSize="11" fontWeight="700">:</text>
                  <text x={W - MX - 10} y={bY + 26} textAnchor="end" fill="#374151" fontSize="11">{fmt(sub)}</text>
                  
                  <text x={W - 250} y={bY + 48} fill={accent} fontSize="11" fontWeight="700">{'Tax Vat (' + data.taxRate + '%)'}</text>
                  <text x={W - 160} y={bY + 48} fill={accent} fontSize="11" fontWeight="700">:</text>
                  <text x={W - MX - 10} y={bY + 48} textAnchor="end" fill="#374151" fontSize="11">{fmt(tax)}</text>
                  
                  <text x={W - 250} y={bY + 74} fill="#1A1A1A" fontSize="11" fontWeight="900" letterSpacing="1">TOTAL</text>
                  <text x={W - 160} y={bY + 74} fill="#1A1A1A" fontSize="11" fontWeight="900">:</text>
                  <text x={W - MX - 10} y={bY + 74} textAnchor="end" fill="#1A1A1A" fontSize="11" fontWeight="900">{fmt(total)}</text>

                  {/* Condition — même style que « Payment Method » (label + trait + valeurs) */}
                  <text x={MX} y={bY + 105} fill={accent} fontSize="11" fontWeight="700">Condition</text>
                  <line x1={MX} y1={bY + 117} x2={MX + 20} y2={bY + 117} stroke={accent} strokeWidth="2" />
                  {wrapLines(data.notes || '30% deposit upon signature.', 72).map((l, i) => (
                    <text key={'cd' + i} x={MX + 110} y={bY + 105 + i * 14} fill="#6B7280" fontSize="10">{l}</text>
                  ))}

                  {/* Signature — même style que « Payment Method » */}
                  <text x={MX} y={bY + 178} fill={accent} fontSize="11" fontWeight="700">Signature</text>
                  <line x1={MX} y1={bY + 190} x2={MX + 20} y2={bY + 190} stroke={accent} strokeWidth="2" />

                  {/* Signature provider */}
                  <rect x={MX} y={bY + 203} width="280" height="80" rx="4" fill="none" stroke="#E5E7EB" strokeWidth="1" strokeDasharray={data.designerSignature ? '0' : '5 4'} />
                  <text x={MX + 12} y={bY + 218} fill="#9CA3AF" fontSize="8" fontWeight="700" letterSpacing="1">PROVIDER</text>
                  {data.designerSignature ? (<>
                    <image href={data.designerSignature} x={MX + 12} y={bY + 224} width="120" height="40" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 12} y={bY + 272} fill="#9CA3AF" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'en-GB') : '')}</text>
                  </>) : (<>
                    <text x={MX + 12} y={bY + 248} fill="#D1D5DB" fontSize="8">{data.designerName || 'Designer'}</text>
                    <line x1={MX + 12} y1={bY + 262} x2={MX + 180} y2={bY + 262} stroke="#E5E7EB" strokeWidth="0.5" />
                    <text x={MX + 12} y={bY + 272} fill="#D1D5DB" fontSize="7">Date and Signature</text>
                  </>)}

                  {/* Signature client */}
                  <rect x={MX + 310} y={bY + 203} width="280" height="80" rx="4" fill="none" stroke="#E5E7EB" strokeWidth="1" strokeDasharray={data.clientSignature ? '0' : '5 4'} />
                  <text x={MX + 322} y={bY + 218} fill="#9CA3AF" fontSize="8" fontWeight="700" letterSpacing="1">CLIENT</text>
                  {data.clientSignature ? (<>
                    <image href={data.clientSignature} x={MX + 322} y={bY + 224} width="120" height="40" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 322} y={bY + 272} fill="#9CA3AF" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'en-GB') : '')}</text>
                  </>) : (<>
                    <text x={MX + 322} y={bY + 248} fill="#D1D5DB" fontSize="8">{data.clientName || 'Client'}</text>
                    <line x1={MX + 322} y1={bY + 262} x2={MX + 490} y2={bY + 262} stroke="#E5E7EB" strokeWidth="0.5" />
                    <text x={MX + 322} y={bY + 272} fill="#D1D5DB" fontSize="7">Date and Signature</text>
                  </>)}

                  {/* Contacts (email + adresse) — SOUS les signatures */}
                  <g transform={`translate(${W - 300}, ${bY + 296})`}>
                    <rect x="0" y="0" width="20" height="20" fill={accent} rx="4" />
                    <rect x="4.5" y="6" width="11" height="8.5" rx="1" fill="none" stroke="#FFF" strokeWidth="1.4" />
                    <path d="M5 7l5 3.5L15 7" fill="none" stroke="#FFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <text x={W - 270} y={bY + 305} fill={accent} fontSize="9" fontWeight="700" letterSpacing="1">E-MAIL</text>
                  <text x={W - 270} y={bY + 317} fill="#6B7280" fontSize="10">{truncate(data.designerEmail || 'blackwooddesign@mail.com', 26)}</text>

                  <g transform={`translate(${W - 300}, ${bY + 331})`}>
                    <rect x="0" y="0" width="20" height="20" fill={accent} rx="4" />
                    <path d="M10 4c-2.5 0-4.5 2-4.5 4.5 0 3.3 4.5 7.5 4.5 7.5s4.5-4.2 4.5-7.5C14.5 6 12.5 4 10 4z" fill="none" stroke="#FFF" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="10" cy="8.6" r="1.7" fill="#FFF" />
                  </g>
                  <text x={W - 270} y={bY + 340} fill={accent} fontSize="9" fontWeight="700" letterSpacing="1">ADDRESS</text>
                  <text x={W - 270} y={bY + 352} fill="#6B7280" fontSize="10">{truncate(data.designerAddress || 'United States of America', 30)}</text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
