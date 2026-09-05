import React from 'react';
import { QuoteData, formatMoney, WATERMARK_LABEL } from '../types';
import { paginate, PH, truncate, wrapLines, safeDateStr } from '../lib/paginate';

interface Props { data: QuoteData; svgRef?: React.RefObject<SVGSVGElement | null>; }

const W = 794, MX = 56;
const HEADER_FULL_H = 510, HEADER_CONT_H = 110, TABLE_HEADER_H = 32, ROW_H = 34, BOTTOM_H = 270;
const COL_DESC = MX + 14, COL_QTY = 530, COL_PU = 620, COL_TOTAL = W - MX - 10;
const DESC_MAX = 58;

export default function TemplateModern({ data, svgRef }: Props) {
  const accent = data.accentColor || '#0057FF';
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
            <rect x="0" y={py} width={W} height={PH} fill="#FAFAFA" />
            {data.showWatermark && (
              <g opacity="0.06">
                <text x={W/2} y={py + PH/2} textAnchor="middle" fontSize="72" fontWeight="900" fill={accent} transform={`rotate(-28 ${W/2} ${py + PH/2})`} letterSpacing="8">{WATERMARK_LABEL[data.status]}</text>
              </g>
            )}

            {page.isFirst && (
              <g>
                <rect x="0" y={py} width={W} height="200" fill={accent} />
                <circle cx="700" cy={py + 100} r="160" fill="none" stroke="#fff" strokeWidth="1" opacity="0.15" />
                <circle cx="700" cy={py + 100} r="100" fill="none" stroke="#fff" strokeWidth="1" opacity="0.1" />
                <circle cx="700" cy={py + 100} r="40" fill="#fff" opacity="0.08" />
                {Array.from({ length: 5 }).map((_, r) =>
                  Array.from({ length: 8 }).map((_, c) => (
                    <circle key={`d${r}-${c}`} cx={MX + c * 14} cy={py + 160 + r * 14} r="1.2" fill="#fff" opacity="0.2" />
                  ))
                )}
                <text x={MX} y={py + 78} fill="#fff" fontSize="56" fontWeight="900" letterSpacing="-2">DEVIS</text>
                <text x={MX} y={py + 105} fill="#fff" fontSize="13" fontWeight="400" opacity="0.7" letterSpacing="4">PROPOSITION COMMERCIALE</text>
                <rect x={MX} y={py + 125} rx="4" width={12 + (data.quoteNumber || 'DEV-001').length * 8.5} height="28" fill="#fff" opacity="0.15" />
                <text x={MX + 10} y={py + 144} fill="#fff" fontSize="12" fontWeight="700" letterSpacing="1">{data.quoteNumber || 'DEV-2024-001'}</text>
                <text x={W - MX} y={py + 145} textAnchor="end" fill="#fff" fontSize="10" fontWeight="500" opacity="0.8">{'Emis le ' + fDate(data.quoteDate)}</text>
                <text x={W - MX} y={py + 162} textAnchor="end" fill="#fff" fontSize="10" fontWeight="500" opacity="0.6">{"Valide jusqu'au " + fDate(data.validUntil)}</text>

                <text x={MX} y={py + 240} fill="#111" fontSize="8" fontWeight="800" letterSpacing="2.5">DE</text>
                <rect x={MX} y={py + 247} width="20" height="2.5" rx="1" fill={accent} />
                {data.designerLogo ? (
                  <image href={data.designerLogo} x={MX} y={py + 262} width="42" height="42" preserveAspectRatio="xMidYMid meet" />
                ) : (<>
                  <rect x={MX} y={py + 262} width="42" height="42" rx="10" fill={accent} />
                  <text x={MX + 21} y={py + 288} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="20" fontWeight="800">
                    {(data.designerName || 'D').charAt(0).toUpperCase()}
                  </text>
                </>)}
                <text x={MX + 54} y={py + 278} fill="#111" fontSize="13" fontWeight="700">{data.designerName || 'Nom du Designer'}</text>
                <text x={MX + 54} y={py + 295} fill="#888" fontSize="9.5">{data.designerTitle || 'Designer Graphique'}</text>
                <text x={MX} y={py + 328} fill="#666" fontSize="9.5">{data.designerEmail || 'hello@designer.com'}</text>
                <text x={MX} y={py + 344} fill="#666" fontSize="9.5">{data.designerPhone || '+33 6 00 00 00 00'}</text>
                <text x={MX} y={py + 360} fill="#999" fontSize="9">{truncate(data.designerAddress || '12 Rue de la Creation, 75003 Paris', 50)}</text>
                <text x={MX} y={py + 380} fill="#bbb" fontSize="8">{'SIRET ' + (data.designerSiret || '000 000 000 00000')}</text>

                <line x1={470} y1={py + 230} x2={470} y2={py + 400} stroke="#E5E5E5" strokeWidth="1" />
                <text x={500} y={py + 240} fill="#111" fontSize="8" fontWeight="800" letterSpacing="2.5">POUR</text>
                <rect x={500} y={py + 247} width="20" height="2.5" rx="1" fill={accent} />
                <text x={500} y={py + 278} fill="#111" fontSize="13" fontWeight="700">{data.clientName || 'Nom du Client'}</text>
                <text x={500} y={py + 295} fill="#888" fontSize="10">{data.clientCompany || 'Entreprise SAS'}</text>
                <text x={500} y={py + 316} fill="#666" fontSize="9.5">{data.clientEmail || 'client@email.com'}</text>
                <text x={500} y={py + 334} fill="#999" fontSize="9">{truncate(data.clientAddress || '45 Avenue des Affaires, Paris', 38)}</text>

                <line x1={MX} y1={py + 420} x2={W - MX} y2={py + 420} stroke="#E8E8E8" strokeWidth="1" />
                <text x={MX} y={py + 455} fill="#111" fontSize="8" fontWeight="800" letterSpacing="2.5">OBJET</text>
                <rect x={MX} y={py + 462} width="20" height="2.5" rx="1" fill={accent} />
                <text x={MX} y={py + 486} fill="#333" fontSize="11" fontWeight="500">
                  {'Proposition de prestations de design - ' + (data.clientCompany || 'Client')}
                </text>
              </g>
            )}

            {!page.isFirst && (
              <g>
                <rect x="0" y={py} width={W} height="70" fill={accent} />
                <text x={MX} y={py + 30} fill="#fff" fontSize="16" fontWeight="800" letterSpacing="1">DEVIS</text>
                <text x={MX} y={py + 48} fill="#fff" fontSize="9" opacity="0.7">
                  {(data.quoteNumber || '') + '  -  ' + (data.designerName || '') + '  /  ' + (data.clientCompany || '')}
                </text>
                <text x={W - MX} y={py + 38} textAnchor="end" fill="#fff" fontSize="9" opacity="0.6">
                  {'Page ' + (page.idx + 1) + ' / ' + totalPages}
                </text>
              </g>
            )}

            {hasRows && (
              <g>
                <rect x={MX} y={tableHeaderY} width={W - MX * 2} height={TABLE_HEADER_H} fill="#111" rx="4" />
                <text x={COL_DESC} y={tableHeaderY + 20} fill="#fff" fontSize="8" fontWeight="700" letterSpacing="1.5">DESIGNATION</text>
                <text x={COL_QTY} y={tableHeaderY + 20} fill="#fff" fontSize="8" fontWeight="700" letterSpacing="1.5" textAnchor="middle">QTE</text>
                <text x={COL_PU} y={tableHeaderY + 20} fill="#fff" fontSize="8" fontWeight="700" letterSpacing="1.5" textAnchor="middle">P.U. HT</text>
                <text x={COL_TOTAL} y={tableHeaderY + 20} fill="#fff" fontSize="8" fontWeight="700" letterSpacing="1.5" textAnchor="end">MONTANT</text>
              </g>
            )}

            {page.rowIndices.map((itemIdx, localIdx) => {
              const item = data.items[itemIdx];
              const curRowY = rowY; rowY += ROW_H;
              const lt = item.quantity * item.unitPrice;
              return (
                <g key={item.id}>
                  {localIdx % 2 === 0 && <rect x={MX} y={curRowY} width={W - MX * 2} height={ROW_H} fill="#F5F5F5" />}
                  <rect x={MX} y={curRowY + 10} width="3" height="12" rx="1.5" fill={accent} opacity="0.6" />
                  <text x={COL_DESC} y={curRowY + 22} fill="#333" fontSize="10.5" fontWeight="500">{truncate(item.description, DESC_MAX)}</text>
                  <text x={COL_QTY} y={curRowY + 22} fill="#555" fontSize="11" textAnchor="middle">{item.quantity}</text>
                  <text x={COL_PU} y={curRowY + 22} fill="#555" fontSize="11" textAnchor="middle">{fmt(item.unitPrice)}</text>
                  <text x={COL_TOTAL} y={curRowY + 22} fill="#111" fontSize="11" textAnchor="end" fontWeight="600">{fmt(lt)}</text>
                  <line x1={MX} y1={curRowY + ROW_H} x2={W - MX} y2={curRowY + ROW_H} stroke="#E8E8E8" strokeWidth="0.5" />
                </g>
              );
            })}

            {page.showBottom && (() => {
              const bY = hasRows ? tableHeaderY + TABLE_HEADER_H + page.rowIndices.length * ROW_H + 16 : py + headerH + 20;
              return (
                <g>
                  <rect x={W - MX - 250} y={bY} width="250" height="105" rx="8" fill="#fff" stroke="#E8E8E8" strokeWidth="1" />
                  <text x={W - MX - 230} y={bY + 26} fill="#888" fontSize="10">Sous-total HT</text>
                  <text x={W - MX - 14} y={bY + 26} textAnchor="end" fill="#333" fontSize="10.5" fontWeight="500">{fmt(sub)}</text>
                  <text x={W - MX - 230} y={bY + 48} fill="#888" fontSize="10">{'TVA (' + data.taxRate + '%)'}</text>
                  <text x={W - MX - 14} y={bY + 48} textAnchor="end" fill="#333" fontSize="10.5" fontWeight="500">{fmt(tax)}</text>
                  <line x1={W - MX - 235} y1={bY + 58} x2={W - MX - 10} y2={bY + 58} stroke="#E8E8E8" strokeWidth="1" />
                  <rect x={W - MX - 245} y={bY + 66} width="240" height="34" rx="6" fill={accent} />
                  <text x={W - MX - 225} y={bY + 88} fill="#fff" fontSize="12" fontWeight="800" letterSpacing="1">TOTAL TTC</text>
                  <text x={W - MX - 16} y={bY + 89} textAnchor="end" fill="#fff" fontSize="16" fontWeight="900">{fmt(total)}</text>

                  <text x={MX} y={bY + 10} fill="#111" fontSize="8" fontWeight="800" letterSpacing="2.5">CONDITIONS</text>
                  <rect x={MX} y={bY + 17} width="20" height="2.5" rx="1" fill={accent} />
                  {wrapLines(data.notes || 'Acompte de 30% a la signature.', 42).map((l, i) => (
                    <text key={i} x={MX} y={bY + 38 + i * 15} fill="#888" fontSize="9.5">{l}</text>
                  ))}

                  <text x={MX} y={bY + 130} fill="#111" fontSize="8" fontWeight="800" letterSpacing="2.5">SIGNATURES</text>
                  <rect x={MX} y={bY + 137} width="20" height="2.5" rx="1" fill={accent} />

                  {/* Emetteur signature */}
                  <rect x={MX} y={bY + 152} width="280" height="80" rx="6" fill="none" stroke="#DDD" strokeWidth="1" strokeDasharray={data.designerSignature ? '0' : '6 4'} />
                  <text x={MX + 14} y={bY + 168} fill="#bbb" fontSize="8.5" fontWeight="600" letterSpacing="1">LE PRESTATAIRE</text>
                  {data.designerSignature ? (<>
                    <image href={data.designerSignature} x={MX + 14} y={bY + 174} width="120" height="40" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 14} y={bY + 225} fill="#aaa" fontSize="7">{data.designerName + ' — ' + (data.designerSignedAt ? safeDateStr(data.designerSignedAt, 'fr-FR') : '')}</text>
                  </>) : (<>
                    <text x={MX + 14} y={bY + 200} fill="#ddd" fontSize="8">{data.designerName || 'Designer'}</text>
                    <line x1={MX + 14} y1={bY + 215} x2={MX + 180} y2={bY + 215} stroke="#E8E8E8" strokeWidth="0.5" />
                    <text x={MX + 14} y={bY + 225} fill="#ddd" fontSize="7.5">Date et Signature</text>
                  </>)}

                  {/* Client signature */}
                  <rect x={MX + 310} y={bY + 152} width="280" height="80" rx="6" fill="none" stroke="#DDD" strokeWidth="1" strokeDasharray={data.clientSignature ? '0' : '6 4'} />
                  <text x={MX + 324} y={bY + 168} fill="#bbb" fontSize="8.5" fontWeight="600" letterSpacing="1">LE CLIENT</text>
                  {data.clientSignature ? (<>
                    <image href={data.clientSignature} x={MX + 324} y={bY + 174} width="120" height="40" preserveAspectRatio="xMidYMid meet" />
                    <text x={MX + 324} y={bY + 225} fill="#aaa" fontSize="7">{data.clientName + ' — ' + (data.clientSignedAt ? safeDateStr(data.clientSignedAt, 'fr-FR') : '')}</text>
                  </>) : (<>
                    <text x={MX + 324} y={bY + 200} fill="#ddd" fontSize="8">{data.clientName || 'Client'}</text>
                    <line x1={MX + 324} y1={bY + 215} x2={MX + 490} y2={bY + 215} stroke="#E8E8E8" strokeWidth="0.5" />
                    <text x={MX + 324} y={bY + 225} fill="#ddd" fontSize="7.5">Date et Signature</text>
                  </>)}
                </g>
              );
            })()}

            <g>
              <rect x="0" y={py + PH - 44} width={W} height="44" fill="#111" />
              <text x={MX} y={py + PH - 18} fill="#666" fontSize="8">
                {(data.designerName || 'Designer') + ' - ' + (data.designerEmail || '') + ' - ' + (data.designerPhone || '')}
              </text>
              <text x={W - MX} y={py + PH - 18} textAnchor="end" fill="#444" fontSize="8">{'Page ' + (page.idx + 1) + ' / ' + totalPages}</text>
              <rect x="0" y={py + PH - 4} width={W} height="4" fill={accent} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
