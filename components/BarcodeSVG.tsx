import React, { useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';

export interface BarcodeSVGProps {
  value: string;
  height?: number;
  barWidth?: number;
  fontSize?: number;
  showText?: boolean;
  label?: string;
  className?: string;
}

/**
 * Generador estándar de Código de Barras Vectorial GS1 / Code-128 con JsBarcode.
 * Cumple con el estándar ISO/IEC 15417 para lectura inmediata con cualquier
 * lector óptico, escáner láser USB/Bluetooth o aplicación de cámara de celular.
 */
export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  value,
  height = 38,
  barWidth = 1.35,
  fontSize = 9.5,
  showText = true,
  label,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const cleanValue = useMemo(() => {
    const raw = String(value || '7798394000000').trim().toUpperCase();
    // Sanitizar a caracteres ASCII válidos en Code-128
    const sanitized = raw.replace(/[^\x20-\x7E]/g, '');
    return sanitized || 'HEMP-20252026';
  }, [value]);

  useEffect(() => {
    if (svgRef.current) {
      try {
        // Limpiar contenido previo para evitar duplicaciones
        svgRef.current.innerHTML = '';
        JsBarcode(svgRef.current, cleanValue, {
          format: 'CODE128',
          width: Math.max(0.75, barWidth),
          height: Math.max(16, height),
          displayValue: showText,
          fontSize: fontSize,
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
          valid: (valid) => {
            if (!valid) {
              console.warn('[BarcodeSVG] Caracteres no válidos para CODE128:', cleanValue);
            }
          }
        });
      } catch (err) {
        console.warn('[BarcodeSVG] Error generando código de barras:', err);
      }
    }
  }, [cleanValue, height, barWidth, fontSize, showText]);

  return (
    <div className={`inline-flex flex-col items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 ${className}`}>
      {label && (
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-0.5">
          {label}
        </span>
      )}
      <svg
        ref={svgRef}
        className="max-w-full overflow-visible"
        role="img"
        aria-label={`Código de barras ${cleanValue}`}
      />
    </div>
  );
};

export default BarcodeSVG;
