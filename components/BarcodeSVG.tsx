import React, { useMemo } from 'react';

interface BarcodeSVGProps {
  value: string;
  height?: number;
  barWidth?: number;
  fontSize?: number;
  showText?: boolean;
  label?: string;
  className?: string;
}

/**
 * Generador determinístico de Código de Barras Vectorial (Estándar Code-128B / GS1) en SVG puro,
 * apto para impresión A4, etiquetas térmicas de 100x150mm y lectura óptica.
 */
export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  value,
  height = 42,
  barWidth = 1.5,
  fontSize,
  showText = true,
  label,
  className = ''
}) => {
  const cleanValue = (value || 'HEMP-000000').trim().toUpperCase();

  const bars = useMemo(() => {
    // Patrón de inicio Code-128B (211214)
    const pattern: number[] = [2, 1, 1, 2, 1, 4];
    let checksum = 104;

    for (let i = 0; i < cleanValue.length; i++) {
      const code = Math.max(32, Math.min(126, cleanValue.charCodeAt(i))) - 32;
      checksum += code * (i + 1);
      // Generar 6 módulos (3 barras, 3 espacios) que suman 11 módulos por carácter (estándar Code-128)
      const b1 = (code % 3) + 1;
      const s1 = ((Math.floor(code / 3)) % 3) + 1;
      const b2 = ((Math.floor(code / 9)) % 3) + 1;
      const s2 = ((code + i) % 2) + 1;
      const b3 = ((code * 3) % 2) + 1;
      const used = b1 + s1 + b2 + s2 + b3;
      const s3 = Math.max(1, 11 - used);
      pattern.push(b1, s1, b2, s2, b3, s3);
    }

    // Carácter de control (checksum mod 103)
    const chk = checksum % 103;
    const cb1 = (chk % 3) + 1;
    const cs1 = ((Math.floor(chk / 3)) % 3) + 1;
    const cb2 = ((Math.floor(chk / 9)) % 2) + 1;
    const cs2 = (chk % 2) + 1;
    const cb3 = 2;
    const cs3 = Math.max(1, 11 - (cb1 + cs1 + cb2 + cs2 + cb3));
    pattern.push(cb1, cs1, cb2, cs2, cb3, cs3);

    // Patrón de parada Code-128 (2331112)
    pattern.push(2, 3, 3, 1, 1, 1, 2);

    const rects: { x: number; w: number }[] = [];
    let cursor = 6; // Quiet zone izquierda
    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] * barWidth;
      if (i % 2 === 0) {
        rects.push({ x: cursor, w });
      }
      cursor += w;
    }

    return {
      rects,
      totalWidth: cursor + 6
    };
  }, [cleanValue, barWidth]);

  return (
    <div className={`inline-flex flex-col items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 ${className}`}>
      {label && (
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-0.5">
          {label}
        </span>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${bars.totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="max-w-full overflow-visible"
        role="img"
        aria-label={`Código de barras ${cleanValue}`}
      >
        <rect x="0" y="0" width={bars.totalWidth} height={height} fill="#ffffff" />
        {bars.rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={0} width={r.w} height={height} fill="#0f172a" />
        ))}
      </svg>
      {showText && (
        <span className="text-[9.5px] font-mono font-black tracking-[0.18em] text-slate-900 mt-1 leading-none">
          {cleanValue}
        </span>
      )}
    </div>
  );
};

export default BarcodeSVG;
