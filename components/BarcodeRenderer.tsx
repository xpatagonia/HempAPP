import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'CODE39';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 50,
  displayValue = true,
  fontSize = 11
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          lineColor: '#0f172a',
          margin: 4
        });
      } catch (err) {
        console.warn('Barcode render notice:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <svg ref={svgRef} className="max-w-full h-auto mx-auto" />
  );
};
