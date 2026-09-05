import React from 'react';
import { QuoteData } from '../types';
import { TEMPLATE_COMPONENTS } from '../templates';

interface Props {
  data: QuoteData;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export default function QuoteSVG({ data, svgRef }: Props) {
  const Template = TEMPLATE_COMPONENTS[data.templateId] || TEMPLATE_COMPONENTS.modern;
  return <Template data={data} svgRef={svgRef} />;
}
