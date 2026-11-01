import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateAr, parseArDateToIso } from '../utils/dateFormat';

interface DateInputArProps {
  value?: string | null;
  onChange: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
  name?: string;
  title?: string;
}

/**
 * Componente de entrada de fecha en formato Argentino estricto: DD/MM/AAAA (ej: 01/04/2026).
 * Evita que navegadores configurados en inglés (en-US) muestren o interpreten MM/DD/YYYY.
 * Emite siempre el valor en formato ISO ('YYYY-MM-DD') hacia el estado/base de datos.
 */
export const DateInputAr: React.FC<DateInputArProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'DD/MM/AAAA',
  min,
  max,
  id,
  name,
  title
}) => {
  const [textValue, setTextValue] = useState<string>(() =>
    value ? formatDateAr(value, '') : ''
  );
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const formatted = value ? formatDateAr(value, '') : '';
    setTextValue(formatted);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Si el usuario escribe números seguidos sin barras, auto-formatear DD/MM/AAAA
    const digitsOnly = raw.replace(/[^\d]/g, '');
    let nextDisplay = raw;

    // Permitir escritura flexible con barras (ej: "1/04/2026" o "01/04/2026")
    if (/^\d+$/.test(raw.replace(/\//g, '')) && !raw.includes('/')) {
      if (digitsOnly.length <= 2) {
        nextDisplay = digitsOnly;
      } else if (digitsOnly.length <= 4) {
        nextDisplay = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
      } else {
        nextDisplay = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      }
    } else {
      nextDisplay = raw.replace(/[^0-9\/\-]/g, '').slice(0, 10);
    }

    setTextValue(nextDisplay);

    if (!nextDisplay.trim()) {
      onChange({ target: { value: '' } });
      return;
    }

    const parsedIso = parseArDateToIso(nextDisplay);
    if (parsedIso) {
      onChange({ target: { value: parsedIso } });
    }
  };

  const handleBlur = () => {
    if (!textValue.trim()) {
      if (!required) onChange({ target: { value: '' } });
      return;
    }
    const parsedIso = parseArDateToIso(textValue);
    if (parsedIso) {
      setTextValue(formatDateAr(parsedIso, ''));
      onChange({ target: { value: parsedIso } });
    } else if (value) {
      setTextValue(formatDateAr(value, ''));
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      setTextValue(formatDateAr(iso, ''));
      onChange({ target: { value: iso } });
    }
  };

  const openNativeCalendar = () => {
    if (disabled || !nativePickerRef.current) return;
    try {
      if (typeof (nativePickerRef.current as any).showPicker === 'function') {
        (nativePickerRef.current as any).showPicker();
      } else {
        nativePickerRef.current.focus();
        nativePickerRef.current.click();
      }
    } catch {
      nativePickerRef.current.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        value={textValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        title={title || 'Formato de fecha Día/Mes/Año (DD/MM/AAAA) — Ej: 01/04/2026'}
        className={`${className} pr-9`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openNativeCalendar}
        title="Seleccionar en calendario (DD/MM/AAAA)"
        className="absolute right-2.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-40 transition cursor-pointer p-1"
      >
        <Calendar size={14} />
      </button>
      <input
        ref={nativePickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        min={min}
        max={max}
        value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        onChange={handleNativeChange}
        className="sr-only pointer-events-none"
      />
    </div>
  );
};

export default DateInputAr;
